import type { Food, FoodGroup, MacroKey } from '../types';

export type EquivalenceMode = 'kcal' | MacroKey;

/** Macronutriente que define a equivalência de cada grupo. */
export const GROUP_MAIN_MACRO: Partial<Record<FoodGroup, MacroKey>> = {
  cereais: 'carbs',
  leguminosas: 'carbs',
  frutas: 'carbs',
  acucares: 'carbs',
  proteinas: 'protein',
  laticinios: 'protein',
  suplementos: 'protein',
  gorduras: 'fat',
};

export interface Equivalent {
  food: Food;
  grams: number;
  kcal: number;
  carbs: number;
  protein: number;
  fat: number;
}

function valueOf(food: Food, mode: EquivalenceMode): number {
  return mode === 'kcal' ? food.kcal : food[mode];
}

/**
 * Quantidade de `target` que fornece a mesma energia (ou o mesmo
 * macronutriente) que `grams` de `source`. Retorna undefined quando o alvo
 * não contém o nutriente de referência.
 */
export function equivalentGrams(source: Food, grams: number, target: Food, mode: EquivalenceMode): number | undefined {
  const sv = valueOf(source, mode);
  const tv = valueOf(target, mode);
  if (tv <= 0 || sv <= 0) return undefined;
  return (grams * sv) / tv;
}

/** Grupos sem lista de trocas (bebidas e preparações prontas). */
const NO_SWAPS: FoodGroup[] = ['bebidas', 'preparacoes', 'outros'];

/** Alimento do dia a dia: tem medida caseira cadastrada ou foi criado pelo nutricionista. */
export function isCommonFood(f: Food): boolean {
  return f.measures.length > 0 || f.source === 'Personalizado';
}

export function defaultMode(food: Food): EquivalenceMode {
  return GROUP_MAIN_MACRO[food.group] ?? 'kcal';
}

/** Lista de trocas dentro do mesmo grupo alimentar, mais próximas primeiro. */
export function findEquivalents(
  source: Food,
  grams: number,
  foods: Food[],
  mode: EquivalenceMode = defaultMode(source),
  { commonOnly = true }: { commonOnly?: boolean } = {},
): Equivalent[] {
  const result: Equivalent[] = [];
  if (NO_SWAPS.includes(source.group)) return result;
  const sourceKcal = (source.kcal * grams) / 100;
  for (const target of foods) {
    if (target.id === source.id || target.group !== source.group) continue;
    if (commonOnly && !isCommonFood(target)) continue;
    const g = equivalentGrams(source, grams, target, mode);
    // Descarta trocas impraticáveis (mais de 5× o peso original).
    if (g === undefined || g > grams * 5) continue;
    const f = g / 100;
    // Na troca por macronutriente, descarta opções com energia muito diferente
    // (ex.: pão de queijo no lugar de arroz).
    if (mode !== 'kcal' && sourceKcal > 0 && Math.abs(target.kcal * f - sourceKcal) / sourceKcal > 0.5) continue;
    result.push({
      food: target,
      grams: g,
      kcal: target.kcal * f,
      carbs: target.carbs * f,
      protein: target.protein * f,
      fat: target.fat * f,
    });
  }
  return result.sort((a, b) => Math.abs(a.kcal - sourceKcal) - Math.abs(b.kcal - sourceKcal));
}

/** Arredonda para porções práticas (múltiplos de 5 g acima de 20 g). */
export function practicalGrams(g: number): number {
  return g >= 20 ? Math.round(g / 5) * 5 : Math.round(g);
}
