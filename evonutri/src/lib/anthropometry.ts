import type { Assessment, AssessmentResult, Sex, Skinfolds } from '../types';

export function ageAt(birthDate: string, at: string = new Date().toISOString()): number {
  const b = new Date(birthDate);
  const d = new Date(at);
  let age = d.getFullYear() - b.getFullYear();
  const beforeBirthday = d.getMonth() < b.getMonth() || (d.getMonth() === b.getMonth() && d.getDate() < b.getDate());
  if (beforeBirthday) age -= 1;
  return Math.max(age, 0);
}

export function bmi(weightKg: number, heightCm: number): number {
  const h = heightCm / 100;
  return h > 0 ? weightKg / (h * h) : 0;
}

/** Classificação OMS para adultos. */
export function bmiClass(value: number): string {
  if (value <= 0) return '—';
  if (value < 18.5) return 'Baixo peso';
  if (value < 25) return 'Eutrofia';
  if (value < 30) return 'Sobrepeso';
  if (value < 35) return 'Obesidade grau I';
  if (value < 40) return 'Obesidade grau II';
  return 'Obesidade grau III';
}

/** Dobras exigidas por protocolo e sexo. */
export const POLLOCK3_SITES: Record<Sex, (keyof Skinfolds)[]> = {
  M: ['chest', 'abdominal', 'thigh'],
  F: ['triceps', 'suprailiac', 'thigh'],
};

export const POLLOCK7_SITES: (keyof Skinfolds)[] = [
  'chest',
  'midaxillary',
  'triceps',
  'subscapular',
  'abdominal',
  'suprailiac',
  'thigh',
];

export const SKINFOLD_LABELS: Record<keyof Skinfolds, string> = {
  chest: 'Peitoral',
  midaxillary: 'Axilar média',
  triceps: 'Tricipital',
  subscapular: 'Subescapular',
  abdominal: 'Abdominal',
  suprailiac: 'Suprailíaca',
  thigh: 'Coxa',
};

function sumSites(folds: Skinfolds, sites: (keyof Skinfolds)[]): number | undefined {
  let total = 0;
  for (const s of sites) {
    const v = folds[s];
    if (v === undefined || !Number.isFinite(v) || v <= 0) return undefined;
    total += v;
  }
  return total;
}

/** Jackson & Pollock (1978) homens; Jackson, Pollock & Ward (1980) mulheres. */
export function densityPollock3(sex: Sex, age: number, folds: Skinfolds): number | undefined {
  const s = sumSites(folds, POLLOCK3_SITES[sex]);
  if (s === undefined) return undefined;
  return sex === 'M'
    ? 1.10938 - 0.0008267 * s + 0.0000016 * s * s - 0.0002574 * age
    : 1.0994921 - 0.0009929 * s + 0.0000023 * s * s - 0.0001392 * age;
}

export function densityPollock7(sex: Sex, age: number, folds: Skinfolds): number | undefined {
  const s = sumSites(folds, POLLOCK7_SITES);
  if (s === undefined) return undefined;
  return sex === 'M'
    ? 1.112 - 0.00043499 * s + 0.00000055 * s * s - 0.00028826 * age
    : 1.097 - 0.00046971 * s + 0.00000056 * s * s - 0.00012828 * age;
}

/** Equação de Siri (1961). */
export function siri(density: number): number {
  return 495 / density - 450;
}

export function evaluateAssessment(a: Assessment, sex: Sex, birthDate: string): AssessmentResult {
  const age = ageAt(birthDate, a.date);
  const b = bmi(a.weight, a.height);
  let bodyDensity: number | undefined;
  let fatPercent: number | undefined;

  if (a.method === 'pollock3') bodyDensity = densityPollock3(sex, age, a.skinfolds);
  else if (a.method === 'pollock7') bodyDensity = densityPollock7(sex, age, a.skinfolds);

  if (bodyDensity !== undefined) fatPercent = siri(bodyDensity);
  else if (a.method === 'bioimpedancia' && a.bioFatPercent) fatPercent = a.bioFatPercent;

  const fatMass = fatPercent !== undefined ? (a.weight * fatPercent) / 100 : undefined;
  const leanMass = fatMass !== undefined ? a.weight - fatMass : undefined;
  const { waist, hip } = a.circumferences;
  const waistHipRatio = waist && hip ? waist / hip : undefined;

  return { age, bmi: b, bmiClass: bmiClass(b), bodyDensity, fatPercent, fatMass, leanMass, waistHipRatio };
}

/** Risco cardiometabólico pela RCQ (OMS): > 0,90 homens, > 0,85 mulheres. */
export function waistHipRisk(ratio: number, sex: Sex): boolean {
  return sex === 'M' ? ratio > 0.9 : ratio > 0.85;
}

export function latestAssessment(list: Assessment[]): Assessment | undefined {
  return [...list].sort((x, y) => y.date.localeCompare(x.date))[0];
}
