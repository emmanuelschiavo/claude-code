import type { BmrFormula, DriActivityLevel, EnergyPlan, MacroKey, Sex } from '../types';

export const KCAL_PER_GRAM: Record<MacroKey, number> = { carbs: 4, protein: 4, fat: 9 };

export const FORMULA_LABELS: Record<BmrFormula, string> = {
  'harris-benedict': 'Harris-Benedict (1919)',
  mifflin: 'Mifflin-St Jeor (1990)',
  cunningham: 'Cunningham (1980) — usa massa magra',
  'katch-mcardle': 'Katch-McArdle — usa massa magra',
  'dri-iom': 'DRI/IOM (2005) — EER',
};

export const ACTIVITY_FACTORS: { value: number; label: string }[] = [
  { value: 1.2, label: '1,2 — Sedentário' },
  { value: 1.375, label: '1,375 — Levemente ativo' },
  { value: 1.55, label: '1,55 — Moderadamente ativo' },
  { value: 1.725, label: '1,725 — Muito ativo' },
  { value: 1.9, label: '1,9 — Extremamente ativo' },
];

export const DRI_LEVEL_LABELS: Record<DriActivityLevel, string> = {
  sedentario: 'Sedentário',
  'pouco-ativo': 'Pouco ativo',
  ativo: 'Ativo',
  'muito-ativo': 'Muito ativo',
};

/** Coeficientes de atividade física (PA) da DRI para adultos ≥ 19 anos. */
const DRI_PA: Record<Sex, Record<DriActivityLevel, number>> = {
  M: { sedentario: 1.0, 'pouco-ativo': 1.11, ativo: 1.25, 'muito-ativo': 1.48 },
  F: { sedentario: 1.0, 'pouco-ativo': 1.12, ativo: 1.27, 'muito-ativo': 1.45 },
};

export interface EnergyInput {
  sex: Sex;
  age: number;
  weight: number; // kg
  height: number; // cm
  leanMass?: number; // kg
}

export interface EnergyResult {
  /** TMB em kcal; para DRI é a EER, que já inclui atividade. */
  bmr: number | undefined;
  get: number | undefined;
  vet: number | undefined;
  /** Motivo quando não foi possível calcular. */
  missing?: string;
  formulaIncludesActivity: boolean;
}

export function bmr(formula: BmrFormula, p: EnergyInput, driLevel: DriActivityLevel = 'sedentario'): number | undefined {
  const { sex, age, weight: w, height: h } = p;
  switch (formula) {
    case 'harris-benedict':
      return sex === 'M'
        ? 66.473 + 13.7516 * w + 5.0033 * h - 6.755 * age
        : 655.0955 + 9.5634 * w + 1.8496 * h - 4.6756 * age;
    case 'mifflin':
      return 10 * w + 6.25 * h - 5 * age + (sex === 'M' ? 5 : -161);
    case 'cunningham':
      return p.leanMass ? 500 + 22 * p.leanMass : undefined;
    case 'katch-mcardle':
      return p.leanMass ? 370 + 21.6 * p.leanMass : undefined;
    case 'dri-iom': {
      const pa = DRI_PA[sex][driLevel];
      const hm = h / 100;
      return sex === 'M'
        ? 662 - 9.53 * age + pa * (15.91 * w + 539.6 * hm)
        : 354 - 6.91 * age + pa * (9.36 * w + 726 * hm);
    }
  }
}

export function computeEnergy(plan: EnergyPlan, p: EnergyInput): EnergyResult {
  const includesActivity = plan.formula === 'dri-iom';
  const base = bmr(plan.formula, p, plan.driLevel);
  if (base === undefined) {
    return {
      bmr: undefined,
      get: undefined,
      vet: undefined,
      missing: 'Esta fórmula exige massa magra: registre uma avaliação com dobras ou bioimpedância.',
      formulaIncludesActivity: includesActivity,
    };
  }
  let get = includesActivity ? base : base * plan.activityFactor;
  if (plan.includeTef) get *= 1.1;
  const vet = Math.max(get + plan.adjustmentKcal, 0);
  return { bmr: base, get, vet, formulaIncludesActivity: includesActivity };
}

export interface MacroTargets {
  grams: Record<MacroKey, number>;
  kcal: Record<MacroKey, number>;
  totalKcal: number;
}

/** Converte metas (g/kg ou % do VET) em gramas, aplicando ajustes manuais. */
export function macroTargets(plan: EnergyPlan, vet: number, weight: number): MacroTargets {
  const keys: MacroKey[] = ['carbs', 'protein', 'fat'];
  const grams = {} as Record<MacroKey, number>;
  const kcal = {} as Record<MacroKey, number>;
  for (const k of keys) {
    const t = plan[k];
    const base = t.mode === 'gkg' ? t.value * weight : (vet * t.value) / 100 / KCAL_PER_GRAM[k];
    grams[k] = plan.overrides[k] ?? base;
    kcal[k] = grams[k] * KCAL_PER_GRAM[k];
  }
  return { grams, kcal, totalKcal: kcal.carbs + kcal.protein + kcal.fat };
}

/** Meta hídrica de 35 mL/kg (adultos). */
export function waterGoalMl(weight: number, mlPerKg = 35): number {
  return weight * mlPerKg;
}
