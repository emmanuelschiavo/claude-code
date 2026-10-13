// Modelo de dados do Seu NutriAI (área do nutricionista).
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
  /** % de gordura desejado, usado para estimar o peso-meta. */
  targetFatPercent?: number;
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

export type BodyFatMethod = 'pollock3' | 'pollock7' | 'durnin' | 'faulkner' | 'bioimpedancia' | 'nenhum';

/** Equação que converte densidade corporal em % de gordura. */
export type DensityEquation = 'siri' | 'brozek';

/** Dobras cutâneas em mm. */
export interface Skinfolds {
  biceps?: number;
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
  /** Padrão: Siri. */
  densityEquation?: DensityEquation;
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
  skinfoldSum?: number;
  bodyDensity?: number;
  fatPercent?: number;
  fatClass?: string;
  fatMass?: number;
  leanMass?: number;
  waistHipRatio?: number;
  waistHeightRatio?: number;
  /** Risco pela circunferência da cintura (OMS). */
  waistRisk?: 'normal' | 'elevado' | 'muito elevado';
  /** Circunferência muscular do braço (cm). */
  armMuscleCircumference?: number;
  /** Peso-meta para o % de gordura desejado. */
  targetWeight?: number;
}

// ---------- Gasto energético ----------

export type BmrFormula =
  | 'harris-benedict'
  | 'mifflin'
  | 'fao-oms'
  | 'cunningham'
  | 'katch-mcardle'
  | 'tinsley-peso'
  | 'tinsley-mlg'
  | 'ten-haaf'
  | 'dri-iom'
  | 'kcal-kg';

export type DriActivityLevel = 'sedentario' | 'pouco-ativo' | 'ativo' | 'muito-ativo';

/** 'remainder' = o que sobra do VET depois dos outros macronutrientes. */
export type MacroMode = 'gkg' | 'percent' | 'remainder';

export interface MacroTarget {
  mode: MacroMode;
  /** g/kg quando mode = 'gkg', % do VET quando mode = 'percent'; ignorado em 'remainder'. */
  value: number;
}

export interface EnergyPlan {
  formula: BmrFormula;
  activityFactor: number;
  driLevel: DriActivityLevel;
  /** Usado na fórmula 'kcal-kg' (regra de bolso). */
  kcalPerKg?: number;
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
  | 'preparacoes'
  | 'outros'
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
  source: 'TACO' | 'USDA' | 'Rótulo' | 'Personalizado';
  kcal: number;
  carbs: number;
  protein: number;
  fat: number;
  fiber: number;
  micros?: Micros;
  measures: HouseholdMeasure[];
}

/** Micronutrientes por 100 g: minerais e vitamina C em mg, vitamina A em µg RAE. */
export interface Micros {
  sodium: number;
  calcium: number;
  iron: number;
  potassium: number;
  magnesium: number;
  zinc: number;
  vitaminC: number;
  vitaminA: number;
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

/** Dados do profissional, usados no cabeçalho dos PDFs. */
export interface ProfessionalProfile {
  name: string;
  crn: string;
  clinic: string;
  phone: string;
  email: string;
  instagram: string;
  address: string;
}

export interface Database {
  version: 1;
  patients: Patient[];
  consultations: Consultation[];
  customFoods: Food[];
  profile?: ProfessionalProfile;
}
