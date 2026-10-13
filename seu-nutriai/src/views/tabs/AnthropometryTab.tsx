import { FileDown, Pencil, Plus, Ruler, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Badge, Button, Card, confirmDialog, cx, EmptyState, Field, IconButton, Input, Modal, NumberInput, Segmented, Textarea } from '../../components/ui';
import { evaluateAssessment, isSkinfoldMethod, latestAssessment, PROTOCOLS, SKINFOLD_LABELS, waistHipRisk } from '../../lib/anthropometry';
import { date, num, todayIso } from '../../lib/format';
import { getProfile, uid } from '../../lib/store';
import type { Assessment, AssessmentResult, BodyFatMethod, Circumferences, DensityEquation, Patient, Skinfolds } from '../../types';
import type { TabProps } from '../PatientProfileView';

export const METHOD_LABEL: Record<BodyFatMethod, string> = {
  pollock3: '3 dobras (Pollock)',
  pollock7: '7 dobras (Pollock)',
  durnin: '4 dobras (Durnin)',
  faulkner: '4 dobras (Faulkner)',
  bioimpedancia: 'Bioimpedância',
  nenhum: 'Só peso e medidas',
};

const CIRC_LABELS: Record<keyof Circumferences, string> = {
  waist: 'Cintura',
  abdomen: 'Abdômen',
  hip: 'Quadril',
  arm: 'Braço relaxado',
  thigh: 'Coxa',
  calf: 'Panturrilha',
};

const RISK_TONE = { normal: 'brand', elevado: 'amber', 'muito elevado': 'red' } as const;

export function AnthropometryTab({ patient, update }: TabProps) {
  const [editing, setEditing] = useState<Assessment | null>(null);
  const [exporting, setExporting] = useState(false);
  const list = [...patient.assessments].sort((a, b) => b.date.localeCompare(a.date));

  const startNew = () => {
    const last = latestAssessment(patient.assessments);
    setEditing({
      id: uid(),
      date: todayIso(),
      weight: last?.weight ?? 0,
      height: last?.height ?? 0,
      method: last?.method ?? 'pollock3',
      densityEquation: last?.densityEquation ?? 'siri',
      skinfolds: {},
      circumferences: {},
      notes: '',
    });
  };

  const save = (a: Assessment, targetFatPercent: number | undefined) => {
    update((p) => {
      const exists = p.assessments.some((x) => x.id === a.id);
      return { ...p, targetFatPercent, assessments: exists ? p.assessments.map((x) => (x.id === a.id ? a : x)) : [...p.assessments, a] };
    });
    setEditing(null);
  };

  const exportPdf = async () => {
    setExporting(true);
    try {
      await (await import('../../lib/pdf')).exportEvolutionPdf(patient, getProfile());
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card
        title="Avaliações físicas"
        subtitle="Escolha o protocolo a cada avaliação: 3 ou 7 dobras, Durnin, Faulkner ou bioimpedância."
        actions={
          <>
            <Button variant="secondary" onClick={exportPdf} disabled={list.length === 0 || exporting}>
              <FileDown size={16} /> {exporting ? 'Gerando…' : 'Relatório em PDF'}
            </Button>
            <Button onClick={startNew}>
              <Plus size={16} /> Nova avaliação
            </Button>
          </>
        }
        flush
      >
        {list.length === 0 ? (
          <div className="px-6 pb-4">
            <EmptyState icon={<Ruler size={28} />} title="Nenhuma avaliação registrada">
              Registre peso, altura e dobras cutâneas para calcular a composição corporal e o gasto energético.
            </EmptyState>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-[0.7rem] tracking-wide text-slate-500 uppercase">
                <tr className="border-b border-slate-100">
                  <th className="px-6 py-2.5 font-semibold">Data</th>
                  <th className="px-3 py-2.5 font-semibold">Protocolo</th>
                  <th className="px-3 py-2.5 text-right font-semibold">Peso</th>
                  <th className="px-3 py-2.5 text-right font-semibold">IMC</th>
                  <th className="px-3 py-2.5 text-right font-semibold">Σ dobras</th>
                  <th className="px-3 py-2.5 text-right font-semibold">% G</th>
                  <th className="px-3 py-2.5 text-right font-semibold">M. gorda</th>
                  <th className="px-3 py-2.5 text-right font-semibold">M. magra</th>
                  <th className="px-3 py-2.5 text-right font-semibold">Cintura</th>
                  <th className="px-6 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 tabular-nums">
                {list.map((a) => {
                  const r = evaluateAssessment(a, patient.sex, patient.birthDate, patient.targetFatPercent);
                  return (
                    <tr key={a.id} className="hover:bg-slate-50/60">
                      <td className="px-6 py-3 font-medium whitespace-nowrap text-slate-800">{date(a.date)}</td>
                      <td className="px-3 py-3 whitespace-nowrap text-slate-600">{METHOD_LABEL[a.method]}</td>
                      <td className="px-3 py-3 text-right">{num(a.weight)} kg</td>
                      <td className="px-3 py-3 text-right">
                        {num(r.bmi)}
                        <span className="block text-xs text-slate-400">{r.bmiClass}</span>
                      </td>
                      <td className="px-3 py-3 text-right">{r.skinfoldSum !== undefined ? `${num(r.skinfoldSum)} mm` : '—'}</td>
                      <td className="px-3 py-3 text-right font-semibold text-slate-900">
                        {num(r.fatPercent)}
                        {r.fatClass && <span className="block text-xs font-normal text-slate-400">{r.fatClass}</span>}
                      </td>
                      <td className="px-3 py-3 text-right">{r.fatMass !== undefined ? `${num(r.fatMass)} kg` : '—'}</td>
                      <td className="px-3 py-3 text-right">{r.leanMass !== undefined ? `${num(r.leanMass)} kg` : '—'}</td>
                      <td className="px-3 py-3 text-right">
                        {a.circumferences.waist ? <Badge tone={RISK_TONE[r.waistRisk ?? 'normal']}>{num(a.circumferences.waist)} cm</Badge> : '—'}
                      </td>
                      <td className="px-6 py-3 text-right whitespace-nowrap">
                        <IconButton label="Editar" onClick={() => setEditing(a)}>
                          <Pencil size={15} />
                        </IconButton>
                        <IconButton
                          label="Excluir"
                          onClick={async () => {
                            if (await confirmDialog({ title: 'Excluir avaliação', message: `A avaliação de ${date(a.date)} será removida.`, confirmLabel: 'Excluir', danger: true }))
                              update((p) => ({ ...p, assessments: p.assessments.filter((x) => x.id !== a.id) }));
                          }}
                        >
                          <Trash2 size={15} />
                        </IconButton>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      <p className="text-xs leading-relaxed text-slate-400">
        Densidade corporal: Jackson & Pollock (1978) e Jackson, Pollock & Ward (1980) para 3 e 7 dobras; Durnin & Womersley (1974) por faixa etária. % de gordura por
        Siri (1961) ou Brozek (1963); Faulkner (1968) calcula o % direto. Classificação do % de gordura por Lohman (1992); cintura e RCQ pela OMS; IMC de idosos
        por Lipschitz (1994).
      </p>

      {editing && <AssessmentModal patient={patient} value={editing} onSave={save} onClose={() => setEditing(null)} />}
    </div>
  );
}

function AssessmentModal({
  patient,
  value,
  onSave,
  onClose,
}: {
  patient: Patient;
  value: Assessment;
  onSave: (a: Assessment, targetFatPercent: number | undefined) => void;
  onClose: () => void;
}) {
  const [a, setA] = useState(value);
  const [target, setTarget] = useState<number | undefined>(patient.targetFatPercent);
  const r = evaluateAssessment(a, patient.sex, patient.birthDate, target);
  const protocol = isSkinfoldMethod(a.method) ? PROTOCOLS[a.method] : undefined;
  const sites = protocol?.sites(patient.sex) ?? [];
  const setFold = (k: keyof Skinfolds, v: number | undefined) => setA({ ...a, skinfolds: { ...a.skinfolds, [k]: v } });
  const setCirc = (k: keyof Circumferences, v: number | undefined) => setA({ ...a, circumferences: { ...a.circumferences, [k]: v } });
  const valid = a.weight > 0 && a.height > 0 && !!a.date;
  const filled = sites.filter((s) => (a.skinfolds[s] ?? 0) > 0).length;

  return (
    <Modal
      wide
      title="Avaliação física"
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button disabled={!valid} onClick={() => onSave(a, target)}>
            Salvar avaliação
          </Button>
        </>
      }
    >
      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <div className="min-w-0 space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Data">
              <Input type="date" value={a.date} onChange={(e) => setA({ ...a, date: e.target.value })} />
            </Field>
            <Field label="Peso (kg)">
              <NumberInput step={0.1} min={0} value={a.weight || undefined} onChange={(v) => setA({ ...a, weight: v ?? 0 })} />
            </Field>
            <Field label="Altura (cm)">
              <NumberInput step={0.5} min={0} value={a.height || undefined} onChange={(v) => setA({ ...a, height: v ?? 0 })} />
            </Field>
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold text-slate-600">Método de composição corporal</p>
            <Segmented<BodyFatMethod>
              value={a.method}
              onChange={(method) => setA({ ...a, method })}
              options={(Object.keys(METHOD_LABEL) as BodyFatMethod[]).map((k) => ({ value: k, label: METHOD_LABEL[k] }))}
            />
          </div>

          {protocol && (
            <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-display text-sm font-semibold text-slate-900">
                    {protocol.label}{' '}
                    <span className="font-sans font-normal text-slate-500">
                      · {filled}/{sites.length} dobras
                    </span>
                  </p>
                  <p className="text-xs text-slate-500">{protocol.reference}</p>
                </div>
                {a.method !== 'faulkner' && (
                  <Segmented<DensityEquation>
                    size="sm"
                    value={a.densityEquation ?? 'siri'}
                    onChange={(densityEquation) => setA({ ...a, densityEquation })}
                    options={[
                      { value: 'siri', label: 'Siri', hint: 'Siri (1961)' },
                      { value: 'brozek', label: 'Brozek', hint: 'Brozek et al. (1963)' },
                    ]}
                  />
                )}
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {sites.map((k, i) => (
                  <Field key={k} label={`${i + 1}. ${SKINFOLD_LABELS[k]} (mm)`}>
                    <NumberInput step={0.5} min={0} value={a.skinfolds[k]} onChange={(v) => setFold(k, v)} />
                  </Field>
                ))}
              </div>
            </div>
          )}

          {a.method === 'bioimpedancia' && (
            <Field label="% de gordura (bioimpedância)" className="sm:w-56">
              <NumberInput step={0.1} min={0} max={70} value={a.bioFatPercent} onChange={(v) => setA({ ...a, bioFatPercent: v })} />
            </Field>
          )}

          <div>
            <p className="mb-2 text-xs font-semibold text-slate-600">Circunferências (cm)</p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {(Object.keys(CIRC_LABELS) as (keyof Circumferences)[]).map((k) => (
                <Field key={k} label={CIRC_LABELS[k]}>
                  <NumberInput step={0.5} min={0} value={a.circumferences[k]} onChange={(v) => setCirc(k, v)} />
                </Field>
              ))}
            </div>
            {!sites.includes('triceps') && (
              <Field label="Dobra tricipital (mm), para a circunferência muscular do braço" className="mt-3 sm:w-96">
                <NumberInput step={0.5} min={0} value={a.skinfolds.triceps} onChange={(v) => setFold('triceps', v)} />
              </Field>
            )}
          </div>

          <Field label="Observações">
            <Textarea value={a.notes} onChange={(e) => setA({ ...a, notes: e.target.value })} />
          </Field>
        </div>

        <ResultPanel r={r} target={target} onTarget={setTarget} sex={patient.sex} needsFolds={!!protocol && r.fatPercent === undefined} />
      </div>
    </Modal>
  );
}

function ResultPanel({
  r,
  target,
  onTarget,
  sex,
  needsFolds,
}: {
  r: AssessmentResult;
  target?: number;
  onTarget: (v: number | undefined) => void;
  sex: Patient['sex'];
  needsFolds: boolean;
}) {
  const fatShare = r.fatPercent !== undefined ? Math.min(Math.max(r.fatPercent, 0), 100) : undefined;
  return (
    <aside className="h-fit space-y-4 rounded-2xl bg-brand-950 p-5 text-sm text-brand-100 lg:sticky lg:top-0">
      <p className="text-[0.68rem] font-semibold tracking-[0.16em] text-gold-300 uppercase">Resultado</p>

      <div>
        <p className="text-xs text-brand-300">Gordura corporal</p>
        <p className="font-display text-4xl font-semibold text-white tabular-nums">{r.fatPercent !== undefined ? `${num(r.fatPercent)}%` : '—'}</p>
        {r.fatClass && <p className="text-xs text-gold-300">{r.fatClass}</p>}
        {fatShare !== undefined && (
          <div className="mt-3">
            <div className="flex h-2.5 overflow-hidden rounded-full">
              <div className="bg-gold-400" style={{ width: `${fatShare}%` }} />
              <div className="flex-1 bg-brand-400" />
            </div>
            <div className="mt-1.5 flex justify-between text-xs">
              <span>
                <span className="mr-1 inline-block h-2 w-2 rounded-full bg-gold-400" />
                Gorda {num(r.fatMass)} kg
              </span>
              <span>
                <span className="mr-1 inline-block h-2 w-2 rounded-full bg-brand-400" />
                Magra {num(r.leanMass)} kg
              </span>
            </div>
          </div>
        )}
        {needsFolds && <p className="mt-2 text-xs text-amber-300">Preencha todas as dobras do protocolo.</p>}
      </div>

      <dl className="space-y-2 border-t border-white/10 pt-4">
        <Row label="Idade" value={`${r.age} anos`} />
        <Row label="IMC" value={`${num(r.bmi)} kg/m²`} sub={r.bmiClass} />
        <Row label="Soma das dobras" value={r.skinfoldSum !== undefined ? `${num(r.skinfoldSum)} mm` : '—'} />
        <Row label="Densidade corporal" value={num(r.bodyDensity, 4)} />
        <Row label="Cintura (risco OMS)" value={r.waistRisk ?? '—'} warn={r.waistRisk !== undefined && r.waistRisk !== 'normal'} />
        <Row label="Relação cintura/quadril" value={num(r.waistHipRatio, 2)} warn={r.waistHipRatio !== undefined && waistHipRisk(r.waistHipRatio, sex)} />
        <Row label="Relação cintura/estatura" value={num(r.waistHeightRatio, 2)} warn={r.waistHeightRatio !== undefined && r.waistHeightRatio > 0.5} />
        <Row label="Circ. muscular do braço" value={r.armMuscleCircumference !== undefined ? `${num(r.armMuscleCircumference)} cm` : '—'} />
      </dl>

      <div className="border-t border-white/10 pt-4">
        <label className="block">
          <span className="text-xs text-brand-300">% de gordura desejado</span>
          <input
            type="number"
            min={3}
            max={50}
            step={0.5}
            value={target ?? ''}
            onChange={(e) => onTarget(e.target.value === '' ? undefined : Number(e.target.value))}
            className="mt-1 w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-white outline-none focus:border-gold-400"
            placeholder={sex === 'M' ? 'ex.: 15' : 'ex.: 23'}
          />
        </label>
        <p className="mt-2 text-xs text-brand-300">
          Peso-meta mantendo a massa magra:{' '}
          <span className={cx('font-semibold', r.targetWeight ? 'text-white' : '')}>{r.targetWeight ? `${num(r.targetWeight)} kg` : '—'}</span>
        </p>
      </div>
    </aside>
  );
}

function Row({ label, value, sub, warn }: { label: string; value: string; sub?: string; warn?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-brand-300">{label}</dt>
      <dd className={cx('text-right font-semibold tabular-nums', warn ? 'text-amber-300' : 'text-white')}>
        {value}
        {sub && <span className="block text-xs font-normal text-brand-300">{sub}</span>}
      </dd>
    </div>
  );
}
