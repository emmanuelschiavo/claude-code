import type { Assessment, AssessmentResult, BodyFatMethod, DensityEquation, Sex, Skinfolds } from '../types';

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

/** OMS (adultos) ou Lipschitz (1994) para idosos a partir de 60 anos. */
export function bmiClass(value: number, age = 30): string {
  if (value <= 0) return '—';
  if (age >= 60) {
    if (value < 22) return 'Baixo peso (idoso)';
    if (value <= 27) return 'Eutrofia (idoso)';
    return 'Sobrepeso (idoso)';
  }
  if (value < 18.5) return 'Baixo peso';
  if (value < 25) return 'Eutrofia';
  if (value < 30) return 'Sobrepeso';
  if (value < 35) return 'Obesidade grau I';
  if (value < 40) return 'Obesidade grau II';
  return 'Obesidade grau III';
}

export const SKINFOLD_LABELS: Record<keyof Skinfolds, string> = {
  biceps: 'Bicipital',
  chest: 'Peitoral',
  midaxillary: 'Axilar média',
  triceps: 'Tricipital',
  subscapular: 'Subescapular',
  abdominal: 'Abdominal',
  suprailiac: 'Suprailíaca',
  thigh: 'Coxa',
};

export interface SkinfoldProtocol {
  label: string;
  short: string;
  reference: string;
  sites: (sex: Sex) => (keyof Skinfolds)[];
}

export const POLLOCK7_SITES: (keyof Skinfolds)[] = ['chest', 'midaxillary', 'triceps', 'subscapular', 'abdominal', 'suprailiac', 'thigh'];

export const PROTOCOLS: Record<'pollock3' | 'pollock7' | 'durnin' | 'faulkner', SkinfoldProtocol> = {
  pollock3: {
    label: 'Pollock 3 dobras',
    short: '3 dobras',
    reference: 'Jackson & Pollock (1978), homens; Jackson, Pollock & Ward (1980), mulheres',
    sites: (sex) => (sex === 'M' ? ['chest', 'abdominal', 'thigh'] : ['triceps', 'suprailiac', 'thigh']),
  },
  pollock7: {
    label: 'Pollock 7 dobras',
    short: '7 dobras',
    reference: 'Jackson & Pollock (1978); Jackson, Pollock & Ward (1980)',
    sites: () => POLLOCK7_SITES,
  },
  durnin: {
    label: 'Durnin & Womersley 4 dobras',
    short: '4 dobras (Durnin)',
    reference: 'Durnin & Womersley (1974)',
    sites: () => ['biceps', 'triceps', 'subscapular', 'suprailiac'],
  },
  faulkner: {
    label: 'Faulkner 4 dobras',
    short: '4 dobras (Faulkner)',
    reference: 'Faulkner (1968)',
    sites: () => ['triceps', 'subscapular', 'suprailiac', 'abdominal'],
  },
};

export function isSkinfoldMethod(m: BodyFatMethod): m is keyof typeof PROTOCOLS {
  return m in PROTOCOLS;
}

export function sumSites(folds: Skinfolds, sites: (keyof Skinfolds)[]): number | undefined {
  let total = 0;
  for (const s of sites) {
    const v = folds[s];
    if (v === undefined || !Number.isFinite(v) || v <= 0) return undefined;
    total += v;
  }
  return total;
}

export function densityPollock3(sex: Sex, age: number, folds: Skinfolds): number | undefined {
  const s = sumSites(folds, PROTOCOLS.pollock3.sites(sex));
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

/** Coeficientes [c, m] de D = c − m·log10(Σ4) por faixa etária (17–19, 20–29, 30–39, 40–49, 50+). */
const DURNIN: Record<Sex, [number, number][]> = {
  M: [
    [1.162, 0.063],
    [1.1631, 0.0632],
    [1.1422, 0.0544],
    [1.162, 0.07],
    [1.1715, 0.0779],
  ],
  F: [
    [1.1549, 0.0678],
    [1.1599, 0.0717],
    [1.1423, 0.0632],
    [1.1333, 0.0612],
    [1.1339, 0.0645],
  ],
};

export function densityDurnin(sex: Sex, age: number, folds: Skinfolds): number | undefined {
  const s = sumSites(folds, PROTOCOLS.durnin.sites(sex));
  if (s === undefined) return undefined;
  const band = age < 20 ? 0 : age < 30 ? 1 : age < 40 ? 2 : age < 50 ? 3 : 4;
  const [c, m] = DURNIN[sex][band]!;
  return c - m * Math.log10(s);
}

/** Faulkner (1968): % de gordura direto pela soma de 4 dobras. */
export function faulknerPercent(folds: Skinfolds): number | undefined {
  const s = sumSites(folds, PROTOCOLS.faulkner.sites('M'));
  return s === undefined ? undefined : 0.153 * s + 5.783;
}

/** Siri (1961). */
export function siri(density: number): number {
  return 495 / density - 450;
}

/** Brozek et al. (1963). */
export function brozek(density: number): number {
  return (4.57 / density - 4.142) * 100;
}

/** Classificação do % de gordura segundo Lohman (1992). */
export function fatClass(percent: number, sex: Sex): string {
  const [risk, below, avg, above] = sex === 'M' ? [5, 14, 15, 24] : [8, 22, 23, 31];
  if (percent <= risk) return 'Risco (muito baixo)';
  if (percent <= below) return 'Abaixo da média';
  if (percent <= avg) return 'Média';
  if (percent <= above) return 'Acima da média';
  return 'Risco (obesidade)';
}

/** Risco cardiometabólico pela circunferência da cintura (OMS). */
export function waistRisk(waist: number, sex: Sex): 'normal' | 'elevado' | 'muito elevado' {
  const [high, veryHigh] = sex === 'M' ? [94, 102] : [80, 88];
  return waist >= veryHigh ? 'muito elevado' : waist >= high ? 'elevado' : 'normal';
}

/** Risco pela RCQ (OMS): > 0,90 homens, > 0,85 mulheres. */
export function waistHipRisk(ratio: number, sex: Sex): boolean {
  return sex === 'M' ? ratio > 0.9 : ratio > 0.85;
}

export function evaluateAssessment(a: Assessment, sex: Sex, birthDate: string, targetFatPercent?: number): AssessmentResult {
  const age = ageAt(birthDate, a.date);
  const b = bmi(a.weight, a.height);
  let bodyDensity: number | undefined;
  let fatPercent: number | undefined;
  let skinfoldSum: number | undefined;

  if (isSkinfoldMethod(a.method)) {
    skinfoldSum = sumSites(a.skinfolds, PROTOCOLS[a.method].sites(sex));
    if (a.method === 'pollock3') bodyDensity = densityPollock3(sex, age, a.skinfolds);
    else if (a.method === 'pollock7') bodyDensity = densityPollock7(sex, age, a.skinfolds);
    else if (a.method === 'durnin') bodyDensity = densityDurnin(sex, age, a.skinfolds);
    else fatPercent = faulknerPercent(a.skinfolds);
  }

  if (bodyDensity !== undefined) {
    const eq: DensityEquation = a.densityEquation ?? 'siri';
    fatPercent = eq === 'brozek' ? brozek(bodyDensity) : siri(bodyDensity);
  } else if (a.method === 'bioimpedancia' && a.bioFatPercent) {
    fatPercent = a.bioFatPercent;
  }

  const fatMass = fatPercent !== undefined ? (a.weight * fatPercent) / 100 : undefined;
  const leanMass = fatMass !== undefined ? a.weight - fatMass : undefined;
  const { waist, hip, arm } = a.circumferences;
  const triceps = a.skinfolds.triceps;
  const targetWeight =
    leanMass !== undefined && targetFatPercent && targetFatPercent > 0 && targetFatPercent < 60
      ? leanMass / (1 - targetFatPercent / 100)
      : undefined;

  return {
    age,
    bmi: b,
    bmiClass: bmiClass(b, age),
    skinfoldSum,
    bodyDensity,
    fatPercent,
    fatClass: fatPercent !== undefined ? fatClass(fatPercent, sex) : undefined,
    fatMass,
    leanMass,
    waistHipRatio: waist && hip ? waist / hip : undefined,
    waistHeightRatio: waist && a.height ? waist / a.height : undefined,
    waistRisk: waist ? waistRisk(waist, sex) : undefined,
    armMuscleCircumference: arm && triceps ? arm - Math.PI * (triceps / 10) : undefined,
    targetWeight,
  };
}

export function latestAssessment(list: Assessment[]): Assessment | undefined {
  return [...list].sort((x, y) => y.date.localeCompare(x.date))[0];
}
