import { describe, expect, it } from 'vitest';
import { seedDatabase } from '../../data/seed';
import { TACO_FOODS } from '../../data/taco';
import type { Consultation, Patient } from '../../types';
import { inferActivity, inferGoal, runIntern } from '../intern';
import { macroTargets } from '../energy';
import { patientMetrics } from '../patientMetrics';
import { dietToText, extractEditable, parseNote, renderNote } from './note';
import { emptyIndex, syncOnce, type SyncStore, type VaultDir } from './sync';

class MemoryVault implements VaultDir {
  files = new Map<string, { text: string; lastModified: number }>();
  sidecars = new Map<string, string>();
  clock = 1000;
  writes = 0;
  async list() {
    return [...this.files].map(([name, f]) => ({ name, lastModified: f.lastModified }));
  }
  async read(name: string) {
    const f = this.files.get(name);
    if (!f) throw new Error(`não existe: ${name}`);
    return { ...f };
  }
  async write(name: string, text: string) {
    this.writes++;
    const lastModified = ++this.clock;
    this.files.set(name, { text, lastModified });
    return lastModified;
  }
  /** Simula edição feita no Obsidian/terminal. */
  external(name: string, text: string) {
    this.files.set(name, { text, lastModified: ++this.clock });
  }
  async remove(name: string) {
    this.files.delete(name);
  }
  async readSidecar(id: string) {
    return this.sidecars.get(id);
  }
  async writeSidecar(id: string, text: string) {
    this.sidecars.set(id, text);
  }
  async removeSidecar(id: string) {
    this.sidecars.delete(id);
  }
}

const lookupMap = new Map(TACO_FOODS.map((f) => [f.id, f]));
const lookup = (id: string) => lookupMap.get(id);

function memoryStore(patients: Patient[] = [], consultations: Consultation[] = []): SyncStore & { list: Patient[] } {
  const s = {
    list: [...patients],
    patients: () => s.list,
    consultations: () => consultations,
    foods: () => TACO_FOODS,
    lookup,
    upsertPatient(p: Patient) {
      const i = s.list.findIndex((x) => x.id === p.id);
      if (i >= 0) s.list[i] = p;
      else s.list.push(p);
    },
  };
  return s;
}

const NOW = '2026-10-14T10:00:00.000Z';

const AGENT_NOTE = `---
tipo: paciente
nome: Juliana Prado
idade: 29
sexo: F
objetivo: Emagrecer 6 kg para o casamento
atividade: moderado
peso: 72
altura: 163
gordura: 31
---

# Juliana Prado

## Anamnese
### Patologias e queixas
Resistência à insulina
### Atividade física
Musculação 4x/semana
### Alergias e intolerâncias
Nenhuma

## Plano alimentar
### Café da manhã - 07:00
- 2 fatia de Pão, trigo, forma, integral
- 2 unidade de Ovo, de galinha, inteiro, cozido/10minutos
### Almoço - 12:30
- 4 colher de sopa de Arroz, integral, cozido
- 120 g de Frango, peito, sem pele, grelhado
Obs.: salada à vontade
`;

describe('estagiário', () => {
  it('identifica objetivo e atividade pelo texto', () => {
    expect(inferGoal('Quero emagrecer 5 kg')).toBe('emagrecimento');
    expect(inferGoal('Ganho de massa muscular')).toBe('hipertrofia');
    expect(inferGoal('recomposição corporal')).toBe('recomposicao');
    expect(inferGoal('controle do diabetes')).toBe('saude');
    expect(inferActivity('Musculação 4x/semana e corrida 2x')).toBe('intenso');
    expect(inferActivity('sedentária')).toBe('sedentario');
    expect(inferActivity('')).toBeUndefined();
  });

  it('monta um plano coerente com o objetivo', () => {
    const ana = seedDatabase().patients[0]!; // emagrecimento, musculação 4x
    const r = runIntern(ana, 'app', NOW);
    if (!r.ok) throw new Error(r.missing);
    expect(r.goalType).toBe('emagrecimento');
    expect(r.energy.adjustmentKcal).toBeLessThan(0);
    expect(r.energy.protein).toEqual({ mode: 'gkg', value: 2 });
    expect(r.energy.carbs.mode).toBe('remainder');
    const m = patientMetrics({ ...ana, energy: r.energy });
    // Macros fecham o VET e o VET não fica abaixo da TMB
    const t = macroTargets(r.energy, m.energy!.vet!, m.weight!);
    expect(t.totalKcal).toBeCloseTo(m.energy!.vet!, 3);
    expect(m.energy!.vet!).toBeGreaterThanOrEqual(m.energy!.bmr!);
  });

  it('limita proteína em doença renal e pede peso e altura', () => {
    const ana = seedDatabase().patients[0]!;
    const renal = runIntern({ ...ana, anamnesis: { ...ana.anamnesis, pathologies: 'DRC estágio 3' } }, 'app', NOW);
    expect(renal.ok && renal.energy.protein.value).toBe(0.8);
    expect(renal.ok && renal.report.alerts.some((a) => a.includes('renal'))).toBe(true);
    expect(runIntern({ ...ana, assessments: [] }, 'app', NOW).ok).toBe(false);
  });
});

describe('nota do paciente', () => {
  it('plano alimentar vai e volta sem perdas', async () => {
    const db = seedDatabase();
    const ana = db.patients[0]!;
    const store = memoryStore([ana], db.consultations);
    const vault = new MemoryVault();
    await syncOnce(vault, store, emptyIndex(), { now: NOW });
    const note = parseNote(vault.files.get('Ana Souza (exemplo).md')!.text);
    expect(note.frontmatter.id).toBe(ana.id);
    const text = extractEditable(note).plano!;
    expect(text).toBe(dietToText(ana.diet, lookup));
    // Reaplica o texto e confere item a item
    const { applyEditable } = await import('./note');
    const back = applyEditable(ana, { plano: text }, TACO_FOODS, '2026-10-14').patient;
    const flat = (p: Patient) => p.diet.meals.map((m) => [m.name, m.time, m.items.map((i) => [i.foodId, i.amount, i.measure])]);
    expect(flat(back)).toEqual(flat(ana));
  });

  it('renderiza cálculos e alertas do estagiário', () => {
    const ana = seedDatabase().patients[0]!;
    const r = runIntern(ana, 'app', NOW);
    if (!r.ok) throw new Error();
    const md = renderNote({ ...ana, energy: r.energy, intern: r.report }, { foods: TACO_FOODS, lookup, consultations: [] }, NOW);
    expect(md).toContain('## Cálculos');
    expect(md).toContain('aguardando sua revisão');
    expect(md).toMatch(/^recalcular: não$/m);
  });
});

describe('sincronização com o Obsidian', () => {
  it('nota nova do terminal vira paciente com cálculos do estagiário', async () => {
    const vault = new MemoryVault();
    vault.external('Juliana Prado.md', AGENT_NOTE);
    const store = memoryStore();
    const index = emptyIndex();
    const events = await syncOnce(vault, store, index, { now: NOW });

    expect(events.map((e) => e.kind)).toEqual(['importado']);
    const p = store.list[0]!;
    expect(p.name).toBe('Juliana Prado');
    expect(p.birthDate).toBe('1997-01-01');
    expect(p.activityLevel).toBe('moderado');
    expect(p.assessments[0]).toMatchObject({ weight: 72, height: 163, method: 'bioimpedancia', bioFatPercent: 31 });
    expect(p.anamnesis.pathologies).toBe('Resistência à insulina');
    expect(p.diet.meals).toHaveLength(2);
    expect(p.diet.meals[0]!.items.map((i) => [i.foodId, i.amount, i.measure])).toEqual([
      ['pao-integral', 2, 'fatia'],
      ['ovo-inteiro', 2, 'unidade'],
    ]);
    expect(p.diet.meals[1]!.notes).toBe('salada à vontade');
    expect(p.intern?.trigger).toBe('obsidian-novo');
    expect(p.intern?.alerts.some((a) => a.includes('glicêmica'))).toBe(true);
    expect(p.energy.adjustmentKcal).toBeLessThan(0);

    // A nota foi reescrita no mesmo arquivo, agora com id, e há cópia completa
    const note = parseNote(vault.files.get('Juliana Prado.md')!.text);
    expect(note.frontmatter.id).toBe(p.id);
    expect(vault.sidecars.has(p.id)).toBe(true);

    // Sem mudanças, a próxima sincronização não escreve nada
    const writes = vault.writes;
    expect(await syncOnce(vault, store, index, { now: NOW })).toEqual([]);
    expect(vault.writes).toBe(writes);
  });

  it('paciente do app vira nota; edição no Obsidian volta só no campo alterado', async () => {
    const db = seedDatabase();
    const store = memoryStore(db.patients, db.consultations);
    const vault = new MemoryVault();
    const index = emptyIndex();
    const first = await syncOnce(vault, store, index, { now: NOW });
    expect(first.filter((e) => e.kind === 'exportado')).toHaveLength(2);

    const file = 'Carlos Lima (exemplo).md';
    const carlos = store.list.find((p) => p.name.startsWith('Carlos'))!;
    const before = carlos.assessments.length;

    // No app, alguém adiciona um suplemento (ainda não sincronizado)...
    store.upsertPatient({ ...carlos, supplements: [...carlos.supplements, { id: 's', name: 'Ômega 3', dose: '1 g', form: 'Cápsula', timing: 'Almoço', justification: '' }] });
    // ...e no Obsidian alguém muda o sono e o peso.
    const text = vault.files.get(file)!.text.replace(/### Sono\n[^\n]*/, '### Sono\nDorme 6 h, acorda cansado').replace(/^peso: .*$/m, 'peso: 81.2').replace(/^data_avaliacao: .*$/m, 'data_avaliacao: 2026-10-14');
    vault.external(file, text);

    const events = await syncOnce(vault, store, index, { now: NOW });
    expect(events[0]).toMatchObject({ kind: 'atualizado', name: carlos.name });
    const after = store.list.find((p) => p.id === carlos.id)!;
    expect(after.anamnesis.sleep).toBe('Dorme 6 h, acorda cansado');
    expect(after.assessments).toHaveLength(before + 1);
    expect(after.assessments.find((a) => a.date === '2026-10-14')!.weight).toBe(81.2);
    expect(after.supplements.map((s) => s.name)).toContain('Ômega 3');
    expect(after.anamnesis.physicalActivity).toBe(carlos.anamnesis.physicalActivity);
    // A nota foi atualizada com o suplemento
    expect(vault.files.get(file)!.text).toContain('Ômega 3');
  });

  it('"recalcular: sim" aciona o estagiário e volta para "não"', async () => {
    const db = seedDatabase();
    const store = memoryStore(db.patients, db.consultations);
    const vault = new MemoryVault();
    const index = emptyIndex();
    await syncOnce(vault, store, index, { now: NOW });
    const file = 'Ana Souza (exemplo).md';
    vault.external(file, vault.files.get(file)!.text.replace(/^recalcular: .*$/m, 'recalcular: sim').replace(/^objetivo: .*$/m, 'objetivo: Hipertrofia'));
    await syncOnce(vault, store, index, { now: NOW });
    const ana = store.list.find((p) => p.name.startsWith('Ana'))!;
    expect(ana.intern?.trigger).toBe('obsidian-recalcular');
    expect(ana.energy.adjustmentKcal).toBeGreaterThan(0);
    expect(vault.files.get(file)!.text).toMatch(/^recalcular: não$/m);
  });

  it('exclusão no app mantém a nota; cofre restaura um app vazio', async () => {
    const db = seedDatabase();
    const store = memoryStore(db.patients, db.consultations);
    const vault = new MemoryVault();
    const index = emptyIndex();
    await syncOnce(vault, store, index, { now: NOW });

    const ana = store.list[0]!;
    store.list = store.list.filter((p) => p.id !== ana.id);
    const ev = await syncOnce(vault, store, index, { now: NOW });
    expect(ev[0]?.kind).toBe('arquivado');
    expect(vault.files.get('Ana Souza (exemplo).md')!.text).toMatch(/^status: excluido$/m);
    expect(await syncOnce(vault, store, index, { now: NOW })).toEqual([]);

    // Outro navegador, app vazio: o Carlos volta inteiro pela cópia completa
    const fresh = memoryStore();
    const restored = await syncOnce(vault, fresh, emptyIndex(), { now: NOW });
    expect(restored.map((e) => e.kind)).toEqual(['restaurado']);
    expect(fresh.list[0]).toEqual(store.list[0]);
  });

  it('não sobrescreve edição do Obsidian que ainda está no período de espera', async () => {
    const db = seedDatabase();
    const store = memoryStore(db.patients, db.consultations);
    const vault = new MemoryVault();
    const index = emptyIndex();
    await syncOnce(vault, store, index, { now: NOW });
    const file = 'Ana Souza (exemplo).md';
    const edited = vault.files.get(file)!.text.replace(/### Sono\n[^\n]*/, '### Sono\nDorme mal');
    vault.external(file, edited);
    // Ao mesmo tempo, o app muda a mesma paciente
    const ana = store.list[0]!;
    store.upsertPatient({ ...ana, phone: '(11) 90000-0000' });
    const lm = vault.files.get(file)!.lastModified;
    await syncOnce(vault, store, index, { now: new Date(lm + 1000).toISOString(), quietMs: 5000 });
    expect(vault.files.get(file)!.text).toBe(edited);
    // Depois da espera, as duas mudanças convivem
    await syncOnce(vault, store, index, { now: new Date(lm + 10_000).toISOString(), quietMs: 5000 });
    const after = store.list[0]!;
    expect(after.anamnesis.sleep).toBe('Dorme mal');
    expect(after.phone).toBe('(11) 90000-0000');
    expect(vault.files.get(file)!.text).toContain('(11) 90000-0000');
  });

  it('espera a nota parar de mudar antes de importar', async () => {
    const vault = new MemoryVault();
    vault.external('Juliana Prado.md', AGENT_NOTE);
    const store = memoryStore();
    const lm = vault.files.get('Juliana Prado.md')!.lastModified;
    const ev = await syncOnce(vault, store, emptyIndex(), { now: new Date(lm + 1000).toISOString(), quietMs: 5000 });
    expect(ev).toEqual([]);
    expect(store.list).toHaveLength(0);
  });
});
