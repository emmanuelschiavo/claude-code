import type { DietPlan, Micros, Sex } from '../types';
import { itemGrams, type FoodLookup } from './diet';

export const MICRO_KEYS: (keyof Micros)[] = ['calcium', 'iron', 'magnesium', 'zinc', 'potassium', 'sodium', 'vitaminC', 'vitaminA'];

export const MICRO_LABELS: Record<keyof Micros, { label: string; unit: string }> = {
  calcium: { label: 'Cálcio', unit: 'mg' },
  iron: { label: 'Ferro', unit: 'mg' },
  magnesium: { label: 'Magnésio', unit: 'mg' },
  zinc: { label: 'Zinco', unit: 'mg' },
  potassium: { label: 'Potássio', unit: 'mg' },
  sodium: { label: 'Sódio', unit: 'mg' },
  vitaminC: { label: 'Vitamina C', unit: 'mg' },
  vitaminA: { label: 'Vitamina A', unit: 'µg RAE' },
};

export interface MicroReference {
  value: number;
  /** 'meta' = RDA/AI a atingir; 'limite' = não ultrapassar. */
  kind: 'meta' | 'limite';
}

/** Referências DRI (IOM/NASEM) para adultos ≥ 19 anos. */
export function microReference(key: keyof Micros, sex: Sex, age: number): MicroReference {
  const male = sex === 'M';
  switch (key) {
    case 'calcium':
      return { kind: 'meta', value: (male && age > 70) || (!male && age > 50) ? 1200 : 1000 };
    case 'iron':
      return { kind: 'meta', value: male || age > 50 ? 8 : 18 };
    case 'magnesium':
      return { kind: 'meta', value: male ? (age > 30 ? 420 : 400) : age > 30 ? 320 : 310 };
    case 'zinc':
      return { kind: 'meta', value: male ? 11 : 8 };
    case 'potassium':
      return { kind: 'meta', value: male ? 3400 : 2600 };
    case 'sodium':
      return { kind: 'limite', value: 2300 };
    case 'vitaminC':
      return { kind: 'meta', value: male ? 90 : 75 };
    case 'vitaminA':
      return { kind: 'meta', value: male ? 900 : 700 };
  }
}

/** Ingestão adequada de fibras (DRI). */
export function fiberReference(sex: Sex, age: number): number {
  if (sex === 'M') return age > 50 ? 30 : 38;
  return age > 50 ? 21 : 25;
}

export function dietMicros(diet: DietPlan, lookup: FoodLookup): { totals: Micros; complete: boolean } {
  const totals: Micros = { sodium: 0, calcium: 0, iron: 0, potassium: 0, magnesium: 0, zinc: 0, vitaminC: 0, vitaminA: 0 };
  let complete = true;
  for (const meal of diet.meals) {
    for (const it of meal.items) {
      const food = lookup(it.foodId);
      if (!food) continue;
      if (!food.micros) {
        complete = false;
        continue;
      }
      const f = itemGrams(it, food) / 100;
      for (const k of MICRO_KEYS) totals[k] += food.micros[k] * f;
    }
  }
  return { totals, complete };
}
