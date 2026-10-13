import { Flame } from 'lucide-react';
import { Badge, Card, EmptyState, Field, NumberInput, Select, Stat } from '../../components/ui';
import {
  ACTIVITY_FACTORS,
  bmr,
  DRI_LEVEL_LABELS,
  FORMULA_LABELS,
  KCAL_PER_GRAM,
  waterGoalMl,
} from '../../lib/energy';
import { num } from '../../lib/format';
import { patientMetrics } from '../../lib/patientMetrics';
import type { BmrFormula, DriActivityLevel, EnergyPlan, MacroKey, MacroMode } from '../../types';
import type { TabProps } from '../PatientProfileView';

export const MACRO_LABEL: Record<MacroKey, string> = { carbs: 'Carboidratos', protein: 'Proteínas', fat: 'Lipídios' };

export function EnergyTab({ patient, update }: TabProps) {
  const plan = patient.energy;
  const m = patientMetrics(patient);
  const set = (patch: Partial<EnergyPlan>) => update((p) => ({ ...p, energy: { ...p.energy, ...patch } }));

  if (!m.latest || !m.result) {
    return (
      <EmptyState icon={<Flame size={32} />} title="Sem avaliação física">
        Registre peso e altura na aba Antropometria para calcular o gasto energético.
      </EmptyState>
    );
  }

  const input = { sex: patient.sex, age: m.age, weight: m.latest.weight, height: m.latest.height, leanMass: m.result.leanMass };
  const energy = m.energy!;
  const targets = m.targets;
  const weight = m.weight!;
  const pctSum = targets ? (targets.totalKcal / (energy.vet || 1)) * 100 : 0;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat icon={<Flame size={20} />} label={energy.formulaIncludesActivity ? 'EER (DRI)' : 'Taxa metabólica basal'} value={`${num(energy.bmr, 0)} kcal`} />
        <Stat icon={<Flame size={20} />} tone="amber" label="Gasto energético total (GET)" value={`${num(energy.get, 0)} kcal`} />
        <Stat
          icon={<Flame size={20} />}
          tone="sky"
          label="Valor energético total (VET)"
          value={`${num(energy.vet, 0)} kcal`}
          sub={plan.adjustmentKcal ? `GET ${plan.adjustmentKcal > 0 ? '+' : ''}${plan.adjustmentKcal} kcal` : 'Manutenção'}
        />
      </div>
      {energy.missing && <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">{energy.missing}</p>}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Parâmetros">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Fórmula preditiva" className="sm:col-span-2">
              <Select value={plan.formula} onChange={(e) => set({ formula: e.target.value as BmrFormula })}>
                {Object.entries(FORMULA_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </Select>
            </Field>
            {plan.formula === 'dri-iom' ? (
              <Field label="Nível de atividade (DRI)" hint="A EER já inclui a atividade física.">
                <Select value={plan.driLevel} onChange={(e) => set({ driLevel: e.target.value as DriActivityLevel })}>
                  {Object.entries(DRI_LEVEL_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </Select>
              </Field>
            ) : (
              <Field label="Fator atividade">
                <Select value={plan.activityFactor} onChange={(e) => set({ activityFactor: Number(e.target.value) })}>
                  {!ACTIVITY_FACTORS.some((f) => f.value === plan.activityFactor) && <option value={plan.activityFactor}>{plan.activityFactor}</option>}
                  {ACTIVITY_FACTORS.map((f) => (
                    <option key={f.value} value={f.value}>
                      {f.label}
                    </option>
                  ))}
                </Select>
              </Field>
            )}
            <Field label="Ajuste calórico (kcal)" hint="Negativo para déficit, positivo para superávit.">
              <NumberInput step={50} value={plan.adjustmentKcal} onChange={(v) => set({ adjustmentKcal: v ?? 0 })} />
            </Field>
            <Field label="Peso de referência para g/kg" hint={`Vazio = peso atual (${num(m.latest.weight)} kg).`}>
              <NumberInput step={0.1} min={0} value={plan.referenceWeight} onChange={(v) => set({ referenceWeight: v || undefined })} />
            </Field>
            <label className="flex items-center gap-2 self-end pb-2 text-sm text-slate-700">
              <input
                type="checkbox"
                className="h-4 w-4 accent-emerald-600"
                checked={plan.includeTef}
                onChange={(e) => set({ includeTef: e.target.checked })}
              />
              Somar efeito térmico dos alimentos (+10%)
            </label>
          </div>
        </Card>

        <Card title="Comparativo de fórmulas (TMB)">
          <table className="w-full text-sm">
            <tbody className="divide-y divide-slate-100">
              {(Object.keys(FORMULA_LABELS) as BmrFormula[]).map((f) => {
                const v = bmr(f, input, plan.driLevel);
                return (
                  <tr key={f} className={f === plan.formula ? 'font-semibold text-emerald-700' : ''}>
                    <td className="py-2">{FORMULA_LABELS[f]}</td>
                    <td className="py-2 text-right">{v === undefined ? <span className="text-xs text-slate-400">requer massa magra</span> : `${num(v, 0)} kcal`}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="mt-3 text-xs text-slate-400">
            Meta hídrica sugerida: <strong className="text-slate-600">{num(waterGoalMl(m.latest.weight) / 1000, 2)} L/dia</strong> (35 mL/kg).
          </p>
        </Card>
      </div>

      <Card title="Distribuição de macronutrientes">
        {!targets ? (
          <p className="text-sm text-slate-500">Defina uma fórmula válida para distribuir os macronutrientes.</p>
        ) : (
          <>
            <div className="-mx-5 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs text-slate-500 uppercase">
                  <tr>
                    <th className="px-5 py-2">Macronutriente</th>
                    <th className="px-2 py-2">Definir por</th>
                    <th className="px-2 py-2">Meta</th>
                    <th className="px-2 py-2 text-right">Gramas</th>
                    <th className="px-2 py-2 text-right">g/kg</th>
                    <th className="px-2 py-2 text-right">kcal</th>
                    <th className="px-5 py-2 text-right">% VET</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(['carbs', 'protein', 'fat'] as MacroKey[]).map((k) => {
                    const t = plan[k];
                    const g = targets.grams[k];
                    const setTarget = (patch: Partial<typeof t>) =>
                      update((p) => {
                        const overrides = { ...p.energy.overrides };
                        delete overrides[k];
                        return { ...p, energy: { ...p.energy, overrides, [k]: { ...p.energy[k], ...patch } } };
                      });
                    const switchMode = (mode: MacroMode) => {
                      if (mode === t.mode) return;
                      // Converte o valor atual para a nova unidade, mantendo os gramas.
                      const value = mode === 'gkg' ? g / weight : ((g * KCAL_PER_GRAM[k]) / (energy.vet || 1)) * 100;
                      setTarget({ mode, value: Number(value.toFixed(mode === 'gkg' ? 2 : 1)) });
                    };
                    return (
                      <tr key={k}>
                        <td className="px-5 py-2 font-medium text-slate-700">
                          {MACRO_LABEL[k]}
                          {plan.overrides[k] !== undefined && (
                            <span className="ml-2">
                              <Badge tone="amber">ajuste manual</Badge>
                            </span>
                          )}
                        </td>
                        <td className="px-2 py-2">
                          <Select className="w-28" value={t.mode} onChange={(e) => switchMode(e.target.value as MacroMode)}>
                            <option value="gkg">g/kg</option>
                            <option value="percent">% VET</option>
                          </Select>
                        </td>
                        <td className="px-2 py-2">
                          <NumberInput
                            className="w-24"
                            step={t.mode === 'gkg' ? 0.1 : 1}
                            min={0}
                            value={t.value}
                            onChange={(v) => setTarget({ value: v ?? 0 })}
                          />
                        </td>
                        <td className="px-2 py-2 text-right">{num(g, 0)} g</td>
                        <td className="px-2 py-2 text-right">{num(g / weight, 2)}</td>
                        <td className="px-2 py-2 text-right">{num(targets.kcal[k], 0)}</td>
                        <td className="px-5 py-2 text-right">{num((targets.kcal[k] / (energy.vet || 1)) * 100, 1)}%</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="font-semibold">
                  <tr>
                    <td className="px-5 py-2" colSpan={5}>
                      Total
                    </td>
                    <td className="px-2 py-2 text-right">{num(targets.totalKcal, 0)}</td>
                    <td className={`px-5 py-2 text-right ${Math.abs(pctSum - 100) > 2 ? 'text-amber-600' : 'text-emerald-700'}`}>{num(pctSum, 1)}%</td>
                  </tr>
                </tfoot>
              </table>
            </div>
            {Math.abs(pctSum - 100) > 2 && (
              <p className="mt-3 text-sm text-amber-700">
                A soma dos macronutrientes ({num(targets.totalKcal, 0)} kcal) difere do VET ({num(energy.vet, 0)} kcal). Ajuste as metas.
              </p>
            )}
          </>
        )}
      </Card>
    </div>
  );
}
