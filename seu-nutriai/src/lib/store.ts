import { useSyncExternalStore } from 'react';
import type { Consultation, Database, Food, Patient, ProfessionalProfile } from '../types';
import { TACO_FOODS } from '../data/taco';
import { seedDatabase } from '../data/seed';

// Camada de persistência. A UI só conhece `useDb`, `useFoods` e `actions`;
// trocar o LocalStorage por uma API significa implementar outro
// StorageAdapter e manter o resto intacto.

export interface StorageAdapter {
  load(): Database | undefined;
  save(db: Database): void;
  /** Notifica alterações feitas fora desta aba/cliente. */
  subscribe?(onExternalChange: (db: Database) => void): () => void;
}

// Chave mantida do nome antigo para preservar os dados já salvos.
const KEY = 'evonutri:db:v1';

export const localStorageAdapter: StorageAdapter = {
  load() {
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? (JSON.parse(raw) as Database) : undefined;
    } catch {
      return undefined;
    }
  },
  save(db) {
    try {
      localStorage.setItem(KEY, JSON.stringify(db));
    } catch {
      // Cota excedida ou armazenamento bloqueado: mantém o estado em memória.
    }
  },
  subscribe(onChange) {
    const handler = (e: StorageEvent) => {
      if (e.key !== KEY || !e.newValue) return;
      try {
        onChange(JSON.parse(e.newValue) as Database);
      } catch {
        /* ignora valor corrompido */
      }
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  },
};

let adapter: StorageAdapter = localStorageAdapter;
let state: Database = adapter.load() ?? seedDatabase();
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

function commit(next: Database) {
  state = next;
  adapter.save(state);
  emit();
}

adapter.subscribe?.((db) => {
  state = db;
  emit();
});

export function setStorageAdapter(next: StorageAdapter) {
  adapter = next;
  state = adapter.load() ?? state;
  emit();
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function useDb<T>(selector: (db: Database) => T): T {
  return useSyncExternalStore(subscribe, () => selector(state));
}

export const EMPTY_PROFILE: ProfessionalProfile = { name: '', crn: '', clinic: '', phone: '', email: '', instagram: '', address: '' };

export function getProfile(): ProfessionalProfile {
  return { ...EMPTY_PROFILE, ...state.profile };
}

export function getDb(): Database {
  return state;
}

// Catálogo de alimentos (TACO + personalizados), memoizado por referência.
let foodsCacheKey: Food[] | undefined;
let foodsCache: Food[] = TACO_FOODS;
let foodIndex = new Map<string, Food>();

function allFoods(db: Database): Food[] {
  if (db.customFoods !== foodsCacheKey) {
    foodsCacheKey = db.customFoods;
    foodsCache = [...TACO_FOODS, ...db.customFoods].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
    foodIndex = new Map(foodsCache.map((f) => [f.id, f]));
  }
  return foodsCache;
}

export function useFoods(): Food[] {
  return useDb(allFoods);
}

export function findFood(id: string): Food | undefined {
  allFoods(state);
  return foodIndex.get(id);
}

export function uid(): string {
  return crypto.randomUUID();
}

export const actions = {
  addPatient(p: Patient) {
    commit({ ...state, patients: [...state.patients, p] });
  },
  updatePatient(id: string, update: (p: Patient) => Patient) {
    commit({ ...state, patients: state.patients.map((p) => (p.id === id ? update(p) : p)) });
  },
  deletePatient(id: string) {
    commit({
      ...state,
      patients: state.patients.filter((p) => p.id !== id),
      consultations: state.consultations.filter((c) => c.patientId !== id),
    });
  },
  upsertConsultation(c: Consultation) {
    const exists = state.consultations.some((x) => x.id === c.id);
    commit({
      ...state,
      consultations: exists ? state.consultations.map((x) => (x.id === c.id ? c : x)) : [...state.consultations, c],
    });
  },
  deleteConsultation(id: string) {
    commit({ ...state, consultations: state.consultations.filter((c) => c.id !== id) });
  },
  addCustomFood(f: Food) {
    commit({ ...state, customFoods: [...state.customFoods, f] });
  },
  deleteCustomFood(id: string) {
    commit({ ...state, customFoods: state.customFoods.filter((f) => f.id !== id) });
  },
  updateProfile(profile: ProfessionalProfile) {
    commit({ ...state, profile });
  },
  exportJson(): string {
    return JSON.stringify(state, null, 2);
  },
  importJson(json: string) {
    const db = JSON.parse(json) as Database;
    if (db.version !== 1 || !Array.isArray(db.patients)) throw new Error('Arquivo de backup inválido.');
    commit(db);
  },
  reset() {
    commit(seedDatabase());
  },
};
