import { useSyncExternalStore } from 'react';
import { toast } from '../../components/Toasts';
import { actions, findFood, getDb, getFoods, subscribeDb } from '../store';
import { folderVault, fsAccessSupported, loadHandle, permission, pickVaultFolder, saveHandle } from './fsAccess';
import { emptyIndex, syncOnce, type SyncEvent, type SyncIndex, type VaultDir } from './sync';

// Liga a pasta do Obsidian ao app: sincroniza ao abrir, a cada poucos segundos
// e logo depois de qualquer alteração feita no app.

export type ObsidianStatus = 'indisponivel' | 'desconectado' | 'permissao' | 'conectado' | 'erro';

export interface ObsidianState {
  status: ObsidianStatus;
  vaultName?: string;
  folder: string;
  syncing: boolean;
  lastSync?: string;
  error?: string;
  log: (SyncEvent & { at: string })[];
}

const FOLDER_KEY = 'seu-nutriai:obsidian-folder';
const INDEX_KEY = 'seu-nutriai:obsidian-index';
const POLL_MS = 4000;
const QUIET_MS = 6000;

function readLocal(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeLocal(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    /* armazenamento bloqueado */
  }
}

let state: ObsidianState = {
  status: fsAccessSupported() ? 'desconectado' : 'indisponivel',
  folder: readLocal(FOLDER_KEY) ?? 'Pacientes',
  syncing: false,
  log: [],
};
const listeners = new Set<() => void>();
function set(patch: Partial<ObsidianState>) {
  state = { ...state, ...patch };
  for (const l of listeners) l();
}

export function useObsidian(): ObsidianState {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => state,
  );
}

let handle: FileSystemDirectoryHandle | undefined;
let vault: VaultDir | undefined;
let timer: ReturnType<typeof setInterval> | undefined;
let debounce: ReturnType<typeof setTimeout> | undefined;
let unsubscribe: (() => void) | undefined;
let running: Promise<void> | undefined;
let again = false;

function loadIndex(): SyncIndex {
  try {
    const raw = readLocal(INDEX_KEY);
    const parsed = raw ? (JSON.parse(raw) as SyncIndex & { vault?: string; folder?: string }) : undefined;
    if (parsed && parsed.vault === handle?.name && parsed.folder === state.folder) return parsed;
  } catch {
    /* índice corrompido: recomeça */
  }
  return emptyIndex();
}

function saveIndex(index: SyncIndex) {
  writeLocal(INDEX_KEY, JSON.stringify({ ...index, vault: handle?.name, folder: state.folder }));
}

const store = {
  patients: () => getDb().patients,
  consultations: () => getDb().consultations,
  foods: getFoods,
  lookup: findFood,
  upsertPatient: actions.upsertPatient,
};

function report(events: SyncEvent[]) {
  if (events.length === 0) return;
  const at = new Date().toISOString();
  set({ log: [...events.map((e) => ({ ...e, at })), ...state.log].slice(0, 40) });
  for (const e of events) {
    const href = e.patientId ? `#/pacientes/${e.patientId}/energia` : undefined;
    if (e.kind === 'importado') toast({ tone: 'success', title: `Novo paciente do Obsidian: ${e.name}`, body: e.detail, href });
    else if (e.kind === 'atualizado') toast({ tone: 'info', title: `${e.name} atualizado pelo Obsidian`, body: e.detail, href });
    else if (e.kind === 'restaurado') toast({ tone: 'info', title: `${e.name} restaurado do Obsidian`, href });
    else if (e.kind === 'erro') toast({ tone: 'error', title: `Erro ao sincronizar ${e.name}`, body: e.detail });
  }
}

export function syncNow(): Promise<void> {
  if (!vault) return Promise.resolve();
  if (running) {
    again = true;
    return running;
  }
  running = (async () => {
    set({ syncing: true });
    try {
      do {
        again = false;
        const index = loadIndex();
        const events = await syncOnce(vault!, store, index, { quietMs: QUIET_MS });
        saveIndex(index);
        report(events);
      } while (again);
      set({ status: 'conectado', lastSync: new Date().toISOString(), error: undefined });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      // Permissão perdida (ex.: navegador reiniciado): pede para reconectar.
      if (/permission|NotAllowed|SecurityError/i.test(msg)) {
        stop();
        set({ status: 'permissao', error: undefined });
      } else set({ status: 'erro', error: msg });
    } finally {
      running = undefined;
      set({ syncing: false });
    }
  })();
  return running;
}

function start() {
  if (!handle) return;
  vault = folderVault(handle, state.folder);
  set({ status: 'conectado', vaultName: handle.name, error: undefined });
  stop();
  timer = setInterval(() => {
    if (document.visibilityState === 'visible') void syncNow();
  }, POLL_MS);
  unsubscribe = subscribeDb(() => {
    clearTimeout(debounce);
    debounce = setTimeout(() => void syncNow(), 1200);
  });
  void syncNow();
}

function stop() {
  clearInterval(timer);
  clearTimeout(debounce);
  unsubscribe?.();
  timer = undefined;
  unsubscribe = undefined;
}

/** Chamado ao abrir o app: reconecta sozinho se o navegador ainda der permissão. */
export async function initObsidian() {
  if (!fsAccessSupported()) return;
  handle = await loadHandle();
  if (!handle) return;
  set({ vaultName: handle.name });
  try {
    if ((await permission(handle, false)) === 'granted') start();
    else set({ status: 'permissao' });
  } catch {
    set({ status: 'permissao' });
  }
}

export async function connectObsidian() {
  try {
    handle = await pickVaultFolder();
  } catch {
    return; // escolha cancelada
  }
  await saveHandle(handle);
  writeLocal(INDEX_KEY, null);
  if ((await permission(handle, true)) === 'granted') start();
  else set({ status: 'permissao', vaultName: handle.name });
}

export async function reconnectObsidian() {
  if (!handle) return connectObsidian();
  if ((await permission(handle, true)) === 'granted') start();
}

export async function disconnectObsidian() {
  stop();
  vault = undefined;
  handle = undefined;
  await saveHandle(undefined);
  writeLocal(INDEX_KEY, null);
  set({ status: 'desconectado', vaultName: undefined, lastSync: undefined });
}

export function setObsidianFolder(folder: string) {
  const clean = folder.replace(/^\/+|\/+$/g, '').trim() || 'Pacientes';
  writeLocal(FOLDER_KEY, clean);
  writeLocal(INDEX_KEY, null);
  set({ folder: clean });
  if (handle && state.status === 'conectado') start();
}
