import type { VaultDir, VaultFile } from './sync';

// Acesso à pasta do cofre pelo navegador (File System Access API, Chrome/Edge).
// O identificador da pasta fica no IndexedDB para reconectar sem escolher de novo.

type PermissionMode = { mode: 'readwrite' };
type PermissionedHandle = FileSystemDirectoryHandle & {
  queryPermission?(o: PermissionMode): Promise<PermissionState>;
  requestPermission?(o: PermissionMode): Promise<PermissionState>;
};

declare global {
  interface Window {
    showDirectoryPicker?: (o?: { id?: string; mode?: 'read' | 'readwrite' }) => Promise<FileSystemDirectoryHandle>;
  }
}

export function fsAccessSupported(): boolean {
  return typeof window !== 'undefined' && typeof window.showDirectoryPicker === 'function' && window.top === window.self;
}

export async function pickVaultFolder(): Promise<FileSystemDirectoryHandle> {
  return window.showDirectoryPicker!({ id: 'seu-nutriai-vault', mode: 'readwrite' });
}

export async function permission(handle: FileSystemDirectoryHandle, ask: boolean): Promise<PermissionState> {
  const h = handle as PermissionedHandle;
  if (!h.queryPermission) return 'granted';
  const state = await h.queryPermission({ mode: 'readwrite' });
  if (state === 'granted' || !ask || !h.requestPermission) return state;
  return h.requestPermission({ mode: 'readwrite' });
}

// ---------- IndexedDB (só para guardar o handle) ----------

function idb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('seu-nutriai', 1);
    req.onupgradeneeded = () => req.result.createObjectStore('kv');
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveHandle(handle: FileSystemDirectoryHandle | undefined): Promise<void> {
  const db = await idb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction('kv', 'readwrite');
    if (handle) tx.objectStore('kv').put(handle, 'vault');
    else tx.objectStore('kv').delete('vault');
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function loadHandle(): Promise<FileSystemDirectoryHandle | undefined> {
  try {
    const db = await idb();
    return await new Promise((resolve) => {
      const req = db.transaction('kv').objectStore('kv').get('vault');
      req.onsuccess = () => resolve(req.result as FileSystemDirectoryHandle | undefined);
      req.onerror = () => resolve(undefined);
    });
  } catch {
    return undefined;
  }
}

// ---------- VaultDir sobre a pasta ----------

async function subdir(root: FileSystemDirectoryHandle, path: string): Promise<FileSystemDirectoryHandle> {
  let dir = root;
  for (const part of path.split('/').map((s) => s.trim()).filter(Boolean)) dir = await dir.getDirectoryHandle(part, { create: true });
  return dir;
}

async function writeFile(dir: FileSystemDirectoryHandle, name: string, text: string): Promise<number> {
  const fh = await dir.getFileHandle(name, { create: true });
  const w = await fh.createWritable();
  await w.write(text);
  await w.close();
  return (await fh.getFile()).lastModified;
}

const SIDECAR_DIR = '.seu-nutriai';

export function folderVault(root: FileSystemDirectoryHandle, folder: string): VaultDir {
  const dir = () => subdir(root, folder);
  const side = async () => (await dir()).getDirectoryHandle(SIDECAR_DIR, { create: true });
  return {
    async list() {
      const d = await dir();
      const out: VaultFile[] = [];
      for await (const entry of d.values()) {
        if (entry.kind !== 'file' || !entry.name.toLowerCase().endsWith('.md')) continue;
        const file = await (entry as FileSystemFileHandle).getFile();
        out.push({ name: entry.name, lastModified: file.lastModified });
      }
      return out;
    },
    async read(name) {
      const file = await (await (await dir()).getFileHandle(name)).getFile();
      return { text: await file.text(), lastModified: file.lastModified };
    },
    async write(name, text) {
      return writeFile(await dir(), name, text);
    },
    async remove(name) {
      await (await dir()).removeEntry(name);
    },
    async readSidecar(id) {
      try {
        const file = await (await (await side()).getFileHandle(`${id}.json`)).getFile();
        return await file.text();
      } catch {
        return undefined;
      }
    },
    async writeSidecar(id, text) {
      await writeFile(await side(), `${id}.json`, text);
    },
    async removeSidecar(id) {
      await (await side()).removeEntry(`${id}.json`).catch(() => undefined);
    },
  };
}
