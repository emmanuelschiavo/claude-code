import { Pencil, Plus, Ruler, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Badge, Button, Card, EmptyState, Field, IconButton, Input, Modal, NumberInput, Select, Textarea } from '../../components/ui';
import {
  evaluateAssessment,
  latestAssessment,
  POLLOCK3_SITES,
  POLLOCK7_SITES,
  SKINFOLD_LABELS,
  waistHipRisk,
} from '../../lib/anthropometry';
import { date, num, todayIso } from '../../lib/format';
import { uid } from '../../lib/store';
import type { Assessment, BodyFatMethod, Circumferences, Patient, Skinfolds } from '../../types';
import type { TabProps } from '../PatientProfileView';

const METHOD_LABEL: Record<BodyFatMethod, string> = {
  pollock3: 'Pollock 3 dobras',
  pollock7: 'Pollock 7 dobras',
  bioimpedancia: 'Bioimpedância',
  nenhum: 'Apenas peso e medidas',
};

const CIRC_LABELS: Record<keyof Circumferences, string> = {
  waist: 'Cintura',
  hip: 'Quadril',
  abdomen: 'Abdômen',
  arm: 'Braço',
  thigh: 'Coxa',
  calf: 'Panturrilha',
};

export function AnthropometryTab({ patient, update }: TabProps) {
  const [editing, setEditing] = useState<Assessment | null>(null);
  const list = [...patient.assessments].sort((a, b) => b.date.localeCompare(a.date));

  const startNew = () => {
    const last = latestAssessment(patient.assessments);
    setEditing({
      id: uid(),
      date: todayIso(),
      weight: last?.weight ?? 0,
      height: last?.height ?? 0,
      method: last?.method ?? 'pollock3',
      skinfolds: {},
      circumferences: {},
      notes: '',
    });
  };

  const save = (a: Assessment) => {
    update((p) => {
      const exists = p.assessments.some((x) => x.id === a.id);
      return { ...p, assessments: exists ? p.assessments.map((x) => (x.id === a.id ? a : x)) : [...p.assessments, a] };
    });
    setEditing(null);
  };

  return (
    <div className="space-y-6">
      <Card
        title="Avaliações físicas"
        actions={
          <Button onClick={startNew}>
            <Plus size={16} /> Nova avaliação
          </Button>
        }
      >
        {list.length === 0 ? (
          <EmptyState icon={<Ruler size={32} />} title="Nenhuma avaliação registrada">
            Registre peso, altura e dobras cutâneas para calcular composição corporal e gasto energético.
          </EmptyState>
        ) : (
          <div className="-mx-5 -my-5 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs text-slate-500 uppercase">
                <tr>
                  <th className="px-4 py-3">Data</th>
                  <th className="px-4 py-3">Método</th>
                  <th className="px-4 py-3 text-right">Peso</th>
                  <th className="px-4 py-3 text-right">IMC</th>
                  <th className="px-4 py-3 text-right">% G</th>
                  <th className="px-4 py-3 text-right">MG (kg)</th>
                  <th className="px-4 py-3 text-right">MM (kg)</th>
                  <th className="px-4 py-3 text-right">RCQ</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {list.map((a) => {
                  const r = evaluateAssessment(a, patient.sex, patient.birthDate);
                  return (
                    <tr key={a.id}>
                      <td className="px-4 py-3 whitespace-nowrap">{date(a.date)}</td>
                      <td className="px-4 py-3">{METHOD_LABEL[a.method]}</td>
                      <td className="px-4 py-3 text-right">{num(a.weight)} kg</td>
                      <td className="px-4 py-3 text-right">
                        {num(r.bmi)}
                        <span className="block text-xs text-slate-400">{r.bmiClass}</span>
                      </td>
                      <td className="px-4 py-3 text-right">{num(r.fatPercent)}</td>
                      <td className="px-4 py-3 text-right">{num(r.fatMass)}</td>
                      <td className="px-4 py-3 text-right">{num(r.leanMass)}</td>
                      <td className="px-4 py-3 text-right">
                        {r.waistHipRatio !== undefined ? (
                          <Badge tone={waistHipRisk(r.waistHipRatio, patient.sex) ? 'red' : 'emerald'}>{num(r.waistHipRatio, 2)}</Badge>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <IconButton label="Editar" onClick={() => setEditing(a)}>
                          <Pencil size={15} />
                        </IconButton>
                        <IconButton
                          label="Excluir"
                          onClick={() =>
                            confirm('Excluir esta avaliação?') &&
                            update((p) => ({ ...p, assessments: p.assessments.filter((x) => x.id !== a.id) }))
                          }
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
      <p className="text-xs text-slate-400">
        Densidade corporal por Jackson & Pollock (1978, homens) e Jackson, Pollock & Ward (1980, mulheres); % de gordura pela equação de Siri (1961).
        RCQ com risco elevado acima de 0,90 (homens) e 0,85 (mulheres), segundo a OMS.
      </p>

      {editing && <AssessmentModal patient={patient} value={editing} onSave={save} onClose={() => setEditing(null)} />}
    </div>
  );
}

function AssessmentModal({ patient, value, onSave, onClose }: { patient: Patient; value: Assessment; onSave: (a: Assessment) => void; onClose: () => void }) {
  const [a, setA] = useState(value);
  const r = evaluateAssessment(a, patient.sex, patient.birthDate);
  const required: (keyof Skinfolds)[] =
    a.method === 'pollock3' ? POLLOCK3_SITES[patient.sex] : a.method === 'pollock7' ? POLLOCK7_SITES : [];
  const setFold = (k: keyof Skinfolds, v: number | undefined) => setA({ ...a, skinfolds: { ...a.skinfolds, [k]: v } });
  const setCirc = (k: keyof Circumferences, v: number | undefined) => setA({ ...a, circumferences: { ...a.circumferences, [k]: v } });
  const valid = a.weight > 0 && a.height > 0 && !!a.date;

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
          <Button disabled={!valid} onClick={() => onSave(a)}>
            Salvar avaliação
          </Button>
        </>
      }
    >
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <div className="grid gap-4 sm:grid-cols-4">
            <Field label="Data">
              <Input type="date" value={a.date} onChange={(e) => setA({ ...a, date: e.target.value })} />
            </Field>
            <Field label="Peso (kg)">
              <NumberInput step={0.1} min={0} value={a.weight || undefined} onChange={(v) => setA({ ...a, weight: v ?? 0 })} />
            </Field>
            <Field label="Altura (cm)">
              <NumberInput step={0.5} min={0} value={a.height || undefined} onChange={(v) => setA({ ...a, height: v ?? 0 })} />
            </Field>
            <Field label="Método">
              <Select value={a.method} onChange={(e) => setA({ ...a, method: e.target.value as BodyFatMethod })}>
                {Object.entries(METHOD_LABEL).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          {a.method === 'bioimpedancia' && (
            <Field label="% de gordura (bioimpedância)" className="sm:w-48">
              <NumberInput step={0.1} min={0} max={70} value={a.bioFatPercent} onChange={(v) => setA({ ...a, bioFatPercent: v })} />
            </Field>
          )}

          {(a.method === 'pollock3' || a.method === 'pollock7') && (
            <div>
              <p className="mb-2 text-sm font-medium text-slate-700">Dobras cutâneas (mm)</p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {required.map((k) => (
                  <Field key={k} label={SKINFOLD_LABELS[k]}>
                    <NumberInput step={0.5} min={0} value={a.skinfolds[k]} onChange={(v) => setFold(k, v)} />
                  </Field>
                ))}
              </div>
            </div>
          )}

          <div>
            <p className="mb-2 text-sm font-medium text-slate-700">Circunferências (cm)</p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {(Object.keys(CIRC_LABELS) as (keyof Circumferences)[]).map((k) => (
                <Field key={k} label={CIRC_LABELS[k]}>
                  <NumberInput step={0.5} min={0} value={a.circumferences[k]} onChange={(v) => setCirc(k, v)} />
                </Field>
              ))}
            </div>
          </div>

          <Field label="Observações">
            <Textarea value={a.notes} onChange={(e) => setA({ ...a, notes: e.target.value })} />
          </Field>
        </div>

        <aside className="h-fit space-y-3 rounded-xl bg-emerald-50 p-4 text-sm">
          <p className="font-semibold text-emerald-800">Resultado</p>
          <Row label="Idade na avaliação" value={`${r.age} anos`} />
          <Row label="IMC" value={`${num(r.bmi)} kg/m²`} sub={r.bmiClass} />
          <Row label="Densidade corporal" value={num(r.bodyDensity, 4)} />
          <Row label="% de gordura" value={r.fatPercent !== undefined ? `${num(r.fatPercent)}%` : '—'} />
          <Row label="Massa gorda" value={r.fatMass !== undefined ? `${num(r.fatMass)} kg` : '—'} />
          <Row label="Massa magra" value={r.leanMass !== undefined ? `${num(r.leanMass)} kg` : '—'} />
          <Row label="Relação cintura/quadril" value={num(r.waistHipRatio, 2)} />
          {required.length > 0 && r.fatPercent === undefined && (
            <p className="text-xs text-amber-700">Preencha todas as dobras do protocolo para calcular a composição corporal.</p>
          )}
        </aside>
      </div>
    </Modal>
  );
}

function Row({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <span className="text-emerald-900/70">{label}</span>
      <span className="text-right font-medium text-emerald-900">
        {value}
        {sub && <span className="block text-xs font-normal">{sub}</span>}
      </span>
    </div>
  );
}
