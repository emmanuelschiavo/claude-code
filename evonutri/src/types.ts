// Modelo de dados do EvoNutri (área do nutricionista).
// Tudo é serializável em JSON para que o mesmo formato sirva ao LocalStorage
// hoje e a uma API/banco em nuvem depois.

export type Sex = 'M' | 'F';

export type PatientStatus = 'ativo' | 'alta' | 'inativo';

export interface Patient {
  id: string;
  name: string;
  birthDate: string; // ISO yyyy-mm-dd
  sex: Sex;
  phone: string;
  email: string;
  goal: string;
  status: PatientStatus;
  notes: string;
  createdAt: string;
  anamnesis: Anamnesis;
  assessments: Assessment[];
  energy: EnergyPlan;
  diet: DietPlan;
  supplements: Supplement[];
}

// ---------- Anamnese ----------

export interface Anamnesis {
  pathologies: string;
  medications: string;
  familyHistory: string;
  allergies: string;
  aversions: string;
  preferences: string;
  routine: string;
  physicalActivity: string;
  sleep: string;
  bowel: string;
  waterIntake: string;
  alcoholSmoking: string;
  recall24h: string;
  updatedAt?: string;
}

// ---------- Antropometria ----------

export type BodyFatMethod = 'pollock3' | 'pollock7' | 'bioimpedancia' | 'nenhum';

/** Dobras cutâneas em mm. */
export interface Skinfolds {
  chest?: number;
  midaxillary?: number;
  triceps?: number;
  subscapular?: number;
  abdominal?: number;
  suprailiac?: number;
  thigh?: number;
}

/** Circunferências em cm. */
export interface Circumferences {
  waist?: number;
  hip?: number;
  abdomen?: number;
  arm?: number;
  thigh?: number;
  calf?: number;
}

export interface Assessment {
  id: string;
  date: string;
  weight: number; // kg
  height: number; // cm
  method: BodyFatMethod;
  skinfolds: Skinfolds;
  circumferences: Circumferences;
  /** % de gordura informado diretamente (bioimpedância). */
  bioFatPercent?: number;
  notes: string;
}

/** Resultado calculado de uma avaliação (nunca persistido). */
export interface AssessmentResult {
  age: number;
  bmi: number;
  bmiClass: string;
  bodyDensity?: number;
  fatPercent?: number;
  fatMass?: number;
  leanMass?: number;
  waistHipRatio?: number;
}

// ---------- Gasto energético ----------

export type BmrFormula = 'harris-benedict' | 'mifflin' | 'cunningham' | 'katch-mcardle' | 'dri-iom';

export type DriActivityLevel = 'sedentario' | 'pouco-ativo' | 'ativo' | 'muito-ativo';

export type MacroMode = 'gkg' | 'percent';

export interface MacroTarget {
  mode: MacroMode;
  /** g/kg quando mode = 'gkg', % do VET quando mode = 'percent'. */
  value: number;
}

export interface EnergyPlan {
  formula: BmrFormula;
  activityFactor: number;
  driLevel: DriActivityLevel;
  includeTef: boolean; // efeito térmico dos alimentos (+10%)
  adjustmentKcal: number; // déficit (-) ou superávit (+)
  /** Peso de referência para g/kg; vazio = peso da última avaliação. */
  referenceWeight?: number;
  carbs: MacroTarget;
  protein: MacroTarget;
  fat: MacroTarget;
  /** Ajustes manuais na tabela Teórico × Prescrito (g). */
  overrides: Partial<Record<MacroKey, number>>;
}

export type MacroKey = 'carbs' | 'protein' | 'fat';

// ---------- Alimentos ----------

export type FoodGroup =
  | 'cereais'
  | 'leguminosas'
  | 'proteinas'
  | 'laticinios'
  | 'frutas'
  | 'vegetais'
  | 'gorduras'
  | 'acucares'
  | 'bebidas'
  | 'suplementos';

export type MarketSector = 'hortifruti' | 'acougue' | 'laticinios' | 'mercearia' | 'padaria' | 'outros';

export interface HouseholdMeasure {
  label: string; // ex.: "colher de sopa"
  grams: number;
}

/** Composição por 100 g (ou 100 mL). */
export interface Food {
  id: string;
  name: string;
  group: FoodGroup;
  sector: MarketSector;
  source: 'TACO' | 'Rótulo' | 'Personalizado';
  kcal: number;
  carbs: number;
  protein: number;
  fat: number;
  fiber: number;
  measures: HouseholdMeasure[];
}

export interface Nutrients {
  kcal: number;
  carbs: number;
  protein: number;
  fat: number;
  fiber: number;
}

// ---------- Plano alimentar ----------

export interface DietItem {
  id: string;
  foodId: string;
  /** Quantidade na unidade escolhida. */
  amount: number;
  /** Rótulo da medida caseira; vazio = gramas. */
  measure: string;
}

export interface Meal {
  id: string;
  name: string;
  time: string; // HH:MM
  items: DietItem[];
  notes: string;
}

export interface DietPlan {
  meals: Meal[];
  guidelines: string;
  updatedAt?: string;
}

// ---------- Suplementação ----------

export interface Supplement {
  id: string;
  name: string;
  dose: string;
  form: string; // cápsula, pó, sachê, gotas, manipulado...
  timing: string;
  justification: string;
}

// ---------- Consultas / financeiro ----------

export type PaymentStatus = 'pago' | 'pendente' | 'cancelado';

export interface Consultation {
  id: string;
  patientId: string;
  date: string; // ISO yyyy-mm-ddTHH:MM
  type: 'primeira' | 'retorno' | 'online';
  price: number;
  paymentStatus: PaymentStatus;
  paymentMethod: string;
  notes: string;
}

export interface Database {
  version: 1;
  patients: Patient[];
  consultations: Consultation[];
  customFoods: Food[];
}
