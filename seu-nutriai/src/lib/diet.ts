import type { DietItem, DietPlan, Food, Meal, Nutrients } from '../types';

export const ZERO: Nutrients = { kcal: 0, carbs: 0, protein: 0, fat: 0, fiber: 0 };

export function addNutrients(a: Nutrients, b: Nutrients): Nutrients {
  return {
    kcal: a.kcal + b.kcal,
    carbs: a.carbs + b.carbs,
    protein: a.protein + b.protein,
    fat: a.fat + b.fat,
    fiber: a.fiber + b.fiber,
  };
}

export function nutrientsFor(food: Food, grams: number): Nutrients {
  const f = grams / 100;
  return {
    kcal: food.kcal * f,
    carbs: food.carbs * f,
    protein: food.protein * f,
    fat: food.fat * f,
    fiber: food.fiber * f,
  };
}

/** Gramas de um item, convertendo a medida caseira quando houver. */
export function itemGrams(item: DietItem, food: Food | undefined): number {
  if (!item.measure) return item.amount;
  const measure = food?.measures.find((x) => x.label === item.measure);
  return measure ? item.amount * measure.grams : item.amount;
}

export type FoodLookup = (id: string) => Food | undefined;

export function itemNutrients(item: DietItem, lookup: FoodLookup): Nutrients {
  const food = lookup(item.foodId);
  return food ? nutrientsFor(food, itemGrams(item, food)) : ZERO;
}

export function mealNutrients(meal: Meal, lookup: FoodLookup): Nutrients {
  return meal.items.reduce((acc, it) => addNutrients(acc, itemNutrients(it, lookup)), ZERO);
}

export function dietNutrients(diet: DietPlan, lookup: FoodLookup): Nutrients {
  return diet.meals.reduce((acc, m) => addNutrients(acc, mealNutrients(m, lookup)), ZERO);
}

/** Descrição legível de um item: "2 colher de sopa (50 g)". */
export function describeItem(item: DietItem, food: Food | undefined): string {
  const g = itemGrams(item, food);
  if (!item.measure) return `${fmt(g)} g`;
  return `${fmt(item.amount)} ${item.measure} (${fmt(g)} g)`;
}

function fmt(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1).replace('.', ',');
}
