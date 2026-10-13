import type { Assessment, AssessmentResult, Patient } from '../types';
import { ageAt, evaluateAssessment, latestAssessment } from './anthropometry';
import { computeEnergy, macroTargets, type EnergyResult, type MacroTargets } from './energy';

export interface PatientMetrics {
  age: number;
  latest?: Assessment;
  result?: AssessmentResult;
  /** Peso usado para g/kg (referência manual ou última avaliação). */
  weight?: number;
  energy?: EnergyResult;
  targets?: MacroTargets;
}

export function patientMetrics(p: Patient): PatientMetrics {
  const age = ageAt(p.birthDate);
  const latest = latestAssessment(p.assessments);
  if (!latest) return { age };
  const result = evaluateAssessment(latest, p.sex, p.birthDate, p.targetFatPercent);
  const weight = p.energy.referenceWeight || latest.weight;
  const energy = computeEnergy(p.energy, {
    sex: p.sex,
    age,
    weight: latest.weight,
    height: latest.height,
    leanMass: result.leanMass,
  });
  const targets = energy.vet !== undefined ? macroTargets(p.energy, energy.vet, weight) : undefined;
  return { age, latest, result, weight, energy, targets };
}
