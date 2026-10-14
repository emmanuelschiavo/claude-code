import type { Consultation, Food, Patient } from '../../types';
import type { FoodLookup } from '../diet';
import { applyIntern } from '../intern';
import { applyEditable, extractEditable, noteFileName, parseNote, patientFromNote, renderNote, type EditableFields } from './note';

// Sincronização app ⇄ pasta de pacientes no cofre do Obsidian.
//
// - Cada paciente vira "<Nome>.md" (legível) + ".seu-nutriai/<id>.json"
//   (cópia completa, usada para restaurar sem perdas).
// - Nota nova sem `id` (ex.: criada pelo agente no terminal) vira paciente no
//   app e o estagiário calcula o plano energético.
// - Nota editada no Obsidian: só os campos que mudaram desde a última escrita
//   do app são aplicados (merge em três vias).
// - Paciente alterado no app: a nota é reescrita.
// Nada é apagado no Obsidian: paciente excluído no app fica com status "excluido".

export interface VaultFile {
  name: string;
  lastModified: number;
}

export interface VaultDir {
  list(): Promise<VaultFile[]>;
  read(name: string): Promise<{ text: string; lastModified: number }>;
  /** Grava e devolve o lastModified resultante. */
  write(name: string, text: string): Promise<number>;
  remove(name: string): Promise<void>;
  readSidecar(id: string): Promise<string | undefined>;
  writeSidecar(id: string, text: string): Promise<void>;
  removeSidecar(id: string): Promise<void>;
}

export interface SyncIndex {
  /** Por arquivo: paciente e data da última leitura/escrita. */
  files: Record<string, { id: string; lastModified: number }>;
  /** Por paciente: o que o app escreveu por último. */
  pushed: Record<string, { hash: string; file: string; name: string; fields: EditableFields }>;
}

export const emptyIndex = (): SyncIndex => ({ files: {}, pushed: {} });

export interface SyncStore {
  patients(): Patient[];
  consultations(): Consultation[];
  foods(): Food[];
  lookup: FoodLookup;
  upsertPatient(p: Patient): void;
}

export type SyncEventKind = 'importado' | 'atualizado' | 'restaurado' | 'exportado' | 'arquivado' | 'erro';

export interface SyncEvent {
  kind: SyncEventKind;
  patientId?: string;
  name: string;
  detail: string;
}

function hash(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return `${s.length}:${(h >>> 0).toString(36)}`;
}

function patientHash(p: Patient, consultations: Consultation[]): string {
  return hash(JSON.stringify(p) + JSON.stringify(consultations.filter((c) => c.patientId === p.id)));
}

function changedFields(now: EditableFields, before: EditableFields): EditableFields {
  const out: EditableFields = {};
  for (const [k, v] of Object.entries(now)) if ((before[k] ?? '') !== v) out[k] = v;
  return out;
}

export interface SyncOptions {
  now?: string;
  /**
   * Espera a nota ficar parada por este tempo (ms) antes de importar, para não
   * reescrever o arquivo enquanto alguém ainda digita no Obsidian.
   */
  quietMs?: number;
}

export async function syncOnce(dir: VaultDir, store: SyncStore, index: SyncIndex, { now = new Date().toISOString(), quietMs = 0 }: SyncOptions = {}): Promise<SyncEvent[]> {
  const events: SyncEvent[] = [];
  const nowMs = Date.parse(now);
  const today = now.slice(0, 10);
  const files = await dir.list();
  /** Notas alteradas fora do app que ainda não foram lidas (ex.: em período de espera). */
  const pending = new Set<string>();

  // 1) Obsidian → app
  for (const f of files) {
    const known = index.files[f.name];
    if (known && known.lastModified === f.lastModified) continue;
    if (quietMs && nowMs - f.lastModified < quietMs) {
      pending.add(f.name);
      continue;
    }
    try {
      const { text, lastModified } = await dir.read(f.name);
      const note = parseNote(text);
      const tipo = note.frontmatter.tipo;
      if (tipo && tipo !== 'paciente') {
        index.files[f.name] = { id: '', lastModified };
        continue;
      }
      const fields = extractEditable(note);
      const id = note.frontmatter.id?.trim();
      const existing = id ? store.patients().find((p) => p.id === id) : undefined;

      if (existing) {
        const pushed = index.pushed[existing.id];
        // Arquivo renomeado no Obsidian: passa a usar o novo nome.
        if (pushed && pushed.file !== f.name) {
          if (index.files[pushed.file]?.id === existing.id) delete index.files[pushed.file];
          pushed.file = f.name;
        }
        const diff = changedFields(fields, pushed?.fields ?? {});
        index.files[f.name] = { id: existing.id, lastModified };
        if (Object.keys(diff).length === 0) continue;
        let { patient, changes, recalc } = applyEditable(existing, diff, store.foods(), today);
        if (recalc) patient = applyIntern(patient, 'obsidian-recalcular', now);
        store.upsertPatient(patient);
        if (pushed) pushed.fields = { ...pushed.fields, ...diff };
        events.push({ kind: 'atualizado', patientId: patient.id, name: patient.name, detail: `Alterado no Obsidian: ${changes.join(', ')}${recalc ? '. Estagiário recalculou.' : ''}` });
        continue;
      }

      if (id && /^exclu/.test(note.frontmatter.status ?? '')) {
        index.files[f.name] = { id, lastModified };
        continue;
      }

      if (id) {
        const sidecar = await dir.readSidecar(id);
        if (sidecar) {
          const restored = JSON.parse(sidecar) as Patient;
          store.upsertPatient(restored);
          index.files[f.name] = { id, lastModified };
          index.pushed[id] = { hash: '', file: f.name, name: restored.name, fields };
          events.push({ kind: 'restaurado', patientId: id, name: restored.name, detail: 'Restaurado a partir do Obsidian.' });
          continue;
        }
      }

      // Paciente novo vindo do Obsidian
      const created = patientFromNote(note, store.foods(), today, id || undefined);
      if (!created.patient.name.trim()) {
        index.files[f.name] = { id: '', lastModified };
        continue;
      }
      const patient = applyIntern(created.patient, 'obsidian-novo', now);
      store.upsertPatient(patient);
      index.files[f.name] = { id: patient.id, lastModified };
      index.pushed[patient.id] = { hash: '', file: f.name, name: patient.name, fields };
      const vet = patient.intern?.alerts.length ? ` · ${patient.intern.alerts.length} alerta(s) para revisar` : '';
      events.push({ kind: 'importado', patientId: patient.id, name: patient.name, detail: `Novo paciente do Obsidian. Estagiário calculou o plano energético${vet}.` });
    } catch (e) {
      events.push({ kind: 'erro', name: f.name, detail: e instanceof Error ? e.message : String(e) });
    }
  }

  // 2) App → Obsidian
  const patients = store.patients();
  const consultations = store.consultations();
  const ctx = { foods: store.foods(), lookup: store.lookup, consultations };
  const taken = new Map<string, string>(Object.entries(index.pushed).map(([pid, v]) => [v.file.toLowerCase(), pid]));
  for (const p of patients) {
    const h = patientHash(p, consultations);
    const pushed = index.pushed[p.id];
    if (pushed?.hash === h) continue;
    // Nunca sobrescrever uma edição do Obsidian que ainda não foi importada.
    if (pushed && pending.has(pushed.file)) continue;
    try {
      let file = pushed && pushed.name === p.name ? pushed.file : noteFileName(p);
      const owner = taken.get(file.toLowerCase());
      if (owner && owner !== p.id) file = file.replace(/\.md$/, ` (${p.id.slice(0, 4)}).md`);
      if (pushed && pushed.file !== file) {
        await dir.remove(pushed.file).catch(() => undefined);
        delete index.files[pushed.file];
        taken.delete(pushed.file.toLowerCase());
      }
      const md = renderNote(p, ctx, now);
      const lastModified = await dir.write(file, md);
      await dir.writeSidecar(p.id, JSON.stringify(p));
      index.files[file] = { id: p.id, lastModified };
      index.pushed[p.id] = { hash: h, file, name: p.name, fields: extractEditable(parseNote(md)) };
      taken.set(file.toLowerCase(), p.id);
      if (!pushed) events.push({ kind: 'exportado', patientId: p.id, name: p.name, detail: `Nota criada: ${file}` });
    } catch (e) {
      events.push({ kind: 'erro', patientId: p.id, name: p.name, detail: e instanceof Error ? e.message : String(e) });
    }
  }

  // 3) Excluídos no app: marca a nota, sem apagar
  const alive = new Set(patients.map((p) => p.id));
  for (const [id, pushed] of Object.entries(index.pushed)) {
    if (alive.has(id)) continue;
    try {
      const { text } = await dir.read(pushed.file);
      const updated = text.replace(/^status:.*$/m, 'status: excluido');
      const lastModified = await dir.write(pushed.file, updated);
      index.files[pushed.file] = { id, lastModified };
      await dir.removeSidecar(id).catch(() => undefined);
      events.push({ kind: 'arquivado', patientId: id, name: pushed.name, detail: 'Excluído no app; a nota foi mantida com status "excluido".' });
    } catch {
      // Nota já não existe: nada a fazer.
    }
    delete index.pushed[id];
  }

  return events;
}
