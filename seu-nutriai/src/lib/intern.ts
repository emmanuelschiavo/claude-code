import type { ActivityLevel, BmrFormula, EnergyPlan, GoalType, InternReport, Patient } from '../types';
import { bmi as calcBmi } from './anthropometry';
import { normalize } from './dietParser';
import { computeEnergy, FORMULA_LABELS, KCAL_PER_GRAM, macroTargets, waterGoalMl } from './energy';
import { num } from './format';
import { patientMetrics } from './patientMetrics';

// "Estagiário": monta o gasto energético e as metas de macronutrientes a partir
// do objetivo, da composição corporal e da rotina do paciente. As escolhas
// seguem condutas usuais da nutrição clínica e esportiva e ficam registradas
// em texto para o nutricionista revisar; nada aqui substitui essa revisão.

export const GOAL_LABELS: Record<GoalType, string> = {
  emagrecimento: 'Emagrecimento',
  hipertrofia: 'Hipertrofia',
  recomposicao: 'Recomposição corporal',
  manutencao: 'Manutenção',
  saude: 'Saúde / controle clínico',
};

export const ACTIVITY_LABELS: Record<ActivityLevel, string> = {
  sedentario: 'Sedentário',
  leve: 'Levemente ativo (1–2×/sem)',
  moderado: 'Moderadamente ativo (3–4×/sem)',
  intenso: 'Muito ativo (5–6×/sem)',
  atleta: 'Atleta / 2 treinos por dia',
};

const ACTIVITY_FACTOR: Record<ActivityLevel, number> = { sedentario: 1.2, leve: 1.375, moderado: 1.55, intenso: 1.725, atleta: 1.9 };

export function inferGoal(text: string): GoalType {
  const t = normalize(text);
  if (/recompos/.test(t)) return 'recomposicao';
  if (/emagrec|perd(a|er) de peso|perder peso|secar|definic|reduzir (gordura|peso)|deficit|obesidade/.test(t)) return 'emagrecimento';
  if (/hipertrof|ganh(o|ar) de? ?(massa|peso)|massa muscular|bulking|ganhar musculo/.test(t)) return 'hipertrofia';
  if (/manuten|manter/.test(t)) return 'manutencao';
  return 'saude';
}

/** Lê a frequência de treino no texto ("4x/semana", "5 vezes por semana", "sedentário"). */
export function inferActivity(text: string): ActivityLevel | undefined {
  const t = normalize(text);
  if (!t) return undefined;
  if (/sedentar|nao pratica|nenhuma/.test(t)) return 'sedentario';
  if (/atleta|competi|2 treinos|dois treinos|bi.?diario/.test(t)) return 'atleta';
  const freq = [...t.matchAll(/(\d+)\s*(x|vezes)/g)].reduce((s, m) => s + Number(m[1]), 0);
  if (freq === 0) return /diari|todo dia|todos os dias/.test(t) ? 'intenso' : undefined;
  if (freq <= 2) return 'leve';
  if (freq <= 4) return 'moderado';
  if (freq <= 7) return 'intenso';
  return 'atleta';
}

function resistanceTraining(p: Patient): boolean {
  return /muscula|forca|crossfit|funcional|academia|pilates|hipertrof/.test(normalize(`${p.anamnesis.physicalActivity} ${p.goal}`));
}

const round50 = (v: number) => Math.round(v / 50) * 50;
const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);

export interface InternResult {
  ok: true;
  energy: EnergyPlan;
  goalType: GoalType;
  activityLevel: ActivityLevel;
  report: InternReport;
}

export interface InternError {
  ok: false;
  missing: string;
}

export function runIntern(p: Patient, trigger: InternReport['trigger'], now = new Date().toISOString()): InternResult | InternError {
  const m = patientMetrics(p);
  if (!m.latest || !m.latest.weight || !m.latest.height) return { ok: false, missing: 'Faltam peso e altura do paciente.' };

  const notes: string[] = [];
  const alerts: string[] = [];
  const { weight, height } = m.latest;
  const age = m.age;
  const bmiValue = calcBmi(weight, height);
  const lean = m.result?.leanMass;
  const goalType = p.goalType ?? inferGoal(p.goal);
  const activityLevel = p.activityLevel ?? inferActivity(p.anamnesis.physicalActivity) ?? 'leve';
  const trains = resistanceTraining(p);
  const clinical = normalize(`${p.anamnesis.pathologies} ${p.anamnesis.medications} ${p.goal} ${p.notes}`);

  notes.push(
    `Objetivo: ${GOAL_LABELS[goalType]}${p.goalType ? '' : ' (identificado pelo texto do objetivo)'}. Atividade: ${ACTIVITY_LABELS[activityLevel]}${p.activityLevel ? '' : ' (estimada pela anamnese)'}.`,
  );

  // Fórmula
  let formula: BmrFormula = 'mifflin';
  if (age < 18) {
    formula = 'fao-oms';
    notes.push('Menor de 18 anos: usei FAO/OMS, que tem equação própria para 10–18 anos.');
  } else if (lean && (activityLevel === 'intenso' || activityLevel === 'atleta')) {
    formula = 'cunningham';
    notes.push(`Paciente treinado e com massa magra conhecida (${num(lean)} kg): usei Cunningham.`);
  } else {
    notes.push(
      bmiValue >= 30
        ? 'IMC ≥ 30: usei Mifflin-St Jeor, a equação preditiva mais precisa em pessoas com obesidade.'
        : 'Usei Mifflin-St Jeor, a equação mais precisa para adultos em geral.',
    );
  }

  // Peso de referência para g/kg
  let referenceWeight: number | undefined;
  if (bmiValue >= 30) {
    const ideal = 24.9 * (height / 100) ** 2;
    referenceWeight = Number((ideal + 0.25 * (weight - ideal)).toFixed(1));
    notes.push(`Para os g/kg usei o peso ajustado (${num(referenceWeight)} kg), já que o IMC é ${num(bmiValue)}.`);
  }
  const refW = referenceWeight ?? weight;

  const base: EnergyPlan = {
    ...p.energy,
    formula,
    activityFactor: ACTIVITY_FACTOR[activityLevel],
    includeTef: false,
    adjustmentKcal: 0,
    referenceWeight,
    overrides: {},
  };
  const input = { sex: p.sex, age, weight, height, leanMass: lean };
  const maintenance = computeEnergy(base, input);
  if (maintenance.get === undefined || maintenance.bmr === undefined) return { ok: false, missing: maintenance.missing ?? 'Não foi possível calcular o gasto.' };
  notes.push(`TMB ${num(maintenance.bmr, 0)} kcal × fator atividade ${base.activityFactor} = GET ${num(maintenance.get, 0)} kcal.`);

  // Ajuste calórico pelo objetivo
  let adjustment = 0;
  if (goalType === 'emagrecimento') {
    adjustment = -clamp(round50(maintenance.get * 0.2), 300, 750);
    notes.push(`Emagrecimento: déficit de ${-adjustment} kcal (~20% do GET, limitado entre 300 e 750 kcal).`);
  } else if (goalType === 'recomposicao') {
    adjustment = -clamp(round50(maintenance.get * 0.1), 150, 400);
    notes.push(`Recomposição: déficit leve de ${-adjustment} kcal (~10% do GET) para preservar massa magra.`);
  } else if (goalType === 'hipertrofia') {
    adjustment = clamp(round50(maintenance.get * 0.1), 200, 500);
    notes.push(`Hipertrofia: superávit de ${adjustment} kcal (~10% do GET).`);
  } else {
    notes.push('Sem ajuste calórico: VET igual ao GET.');
  }
  let vet = maintenance.get + adjustment;
  if (vet < maintenance.bmr) {
    adjustment = Math.round(maintenance.bmr - maintenance.get);
    vet = maintenance.bmr;
    alerts.push('O déficit levaria o VET abaixo da TMB; limitei o VET à TMB. Avalie se o déficit deve ser menor.');
  }

  // Proteína (g/kg do peso de referência)
  let protein =
    goalType === 'hipertrofia' || goalType === 'recomposicao' ? 2.0 : goalType === 'emagrecimento' ? (trains ? 2.0 : 1.6) : trains ? 1.6 : 1.2;
  if (age >= 60) protein = Math.max(protein, 1.2);
  if (/renal|rim|drc|nefro/.test(clinical)) {
    protein = 0.8;
    alerts.push('Menção a doença renal: proteína limitada a 0,8 g/kg. Confirme a conduta com a função renal (TFG) e o estágio.');
  }
  notes.push(`Proteína: ${num(protein)} g/kg${trains ? ' (treino resistido identificado)' : ''}${age >= 60 ? '; mínimo de 1,2 g/kg pela idade' : ''}.`);

  // Lipídios: 0,9 g/kg, entre 20% e 35% do VET
  const fatGrams = clamp(0.9 * refW, (0.2 * vet) / KCAL_PER_GRAM.fat, (0.35 * vet) / KCAL_PER_GRAM.fat);
  const fatGkg = Number((fatGrams / refW).toFixed(2));
  notes.push(`Lipídios: ${num(fatGkg, 2)} g/kg (entre 20% e 35% do VET). Carboidratos completam o VET.`);

  const energy: EnergyPlan = {
    ...base,
    adjustmentKcal: adjustment,
    protein: { mode: 'gkg', value: protein },
    fat: { mode: 'gkg', value: fatGkg },
    carbs: { mode: 'remainder', value: 0 },
  };

  const targets = macroTargets(energy, vet, refW);
  if (targets.grams.carbs < 130) alerts.push(`Carboidratos ficaram em ${num(targets.grams.carbs, 0)} g, abaixo da RDA de 130 g/dia.`);
  if ((activityLevel === 'intenso' || activityLevel === 'atleta') && targets.grams.carbs / weight < 4)
    alerts.push(`Carboidratos em ${num(targets.grams.carbs / weight, 1)} g/kg para alto volume de treino; atletas costumam precisar de 5 a 7 g/kg.`);
  notes.push(
    `Resultado: VET ${num(vet, 0)} kcal · CHO ${num(targets.grams.carbs, 0)} g · PTN ${num(targets.grams.protein, 0)} g · LIP ${num(targets.grams.fat, 0)} g · água ${num(waterGoalMl(weight) / 1000, 1)} L/dia.`,
  );

  // Alertas clínicos
  if (/diabet|dm2|dm1|glicemi|insulin|resistencia a insulina|pre.?diabet/.test(clinical))
    alerts.push('Alteração glicêmica: distribua os carboidratos ao longo do dia, priorize fibras e baixo índice glicêmico.');
  if (/hipertens|pressao alta|has\b/.test(clinical)) alerts.push('Hipertensão: mantenha sódio abaixo de 2.000 mg/dia (padrão DASH).');
  if (/gestant|gravid|gestacao|lactant|amament/.test(clinical))
    alerts.push('Gestação ou lactação: as equações usadas não se aplicam. Recalcule com as DRIs específicas.');
  if (/tireo|hipotireo|hipertireo/.test(clinical)) alerts.push('Disfunção tireoidiana: o gasto real pode diferir do estimado. Reavalie pelo peso em 2–4 semanas.');
  if (/dislipid|colesterol|triglicer/.test(clinical)) alerts.push('Dislipidemia: limite gordura saturada (< 7–10% do VET) e priorize fibras solúveis.');
  if (age < 18) alerts.push('Paciente menor de idade: confira as curvas de crescimento (OMS) antes de definir déficit.');
  if (p.anamnesis.allergies.trim() && !/nenhum|nao|sem/.test(normalize(p.anamnesis.allergies)))
    alerts.push(`Alergias/intolerâncias registradas: ${p.anamnesis.allergies.trim()}.`);
  if (!lean) notes.push('Sem % de gordura: registre dobras ou bioimpedância para refinar o cálculo.');
  notes.push(`Fórmula final: ${FORMULA_LABELS[formula]}.`);

  return {
    ok: true,
    energy,
    goalType,
    activityLevel,
    report: { generatedAt: now, trigger, notes, alerts, reviewed: false },
  };
}

/** Aplica o resultado do estagiário ao paciente. */
export function applyIntern(p: Patient, trigger: InternReport['trigger'], now?: string): Patient {
  const r = runIntern(p, trigger, now);
  if (!r.ok) {
    return { ...p, intern: { generatedAt: now ?? new Date().toISOString(), trigger, notes: [], alerts: [r.missing], reviewed: false } };
  }
  return { ...p, energy: r.energy, intern: r.report };
}
