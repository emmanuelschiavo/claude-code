import { ArrowLeft, CalendarPlus, Pencil, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { navigate } from '../App';
import { PatientForm } from '../components/PatientForm';
import { Button, confirmDialog, cx, EmptyState, Modal } from '../components/ui';
import { num } from '../lib/format';
import { patientMetrics } from '../lib/patientMetrics';
import { actions, useDb } from '../lib/store';
import type { Patient } from '../types';
import { ConsultationModal, newConsultation } from './FinanceView';
import { STATUS_LABEL } from './PatientsView';
import { AnamnesisTab } from './tabs/AnamnesisTab';
import { AnthropometryTab } from './tabs/AnthropometryTab';
import { DietTab } from './tabs/DietTab';
import { EnergyTab } from './tabs/EnergyTab';
import { EvolutionTab } from './tabs/EvolutionTab';
import { ShoppingTab } from './tabs/ShoppingTab';
import { SubstitutionsTab } from './tabs/SubstitutionsTab';
import { SupplementationTab } from './tabs/SupplementationTab';

export interface TabProps {
  patient: Patient;
  update: (fn: (p: Patient) => Patient) => void;
}

const TABS = [
  { id: 'anamnese', label: 'Anamnese', Component: AnamnesisTab },
  { id: 'antropometria', label: 'Antropometria', Component: AnthropometryTab },
  { id: 'evolucao', label: 'Evolução', Component: EvolutionTab },
  { id: 'energia', label: 'Gasto energético', Component: EnergyTab },
  { id: 'plano', label: 'Plano alimentar', Component: DietTab },
  { id: 'substituicoes', label: 'Substituições', Component: SubstitutionsTab },
  { id: 'suplementos', label: 'Suplementação', Component: SupplementationTab },
  { id: 'compras', label: 'Lista de compras', Component: ShoppingTab },
] as const;

export function PatientProfileView({ id, tab }: { id: string; tab?: string }) {
  const patient = useDb((db) => db.patients.find((p) => p.id === id));
  const [editing, setEditing] = useState<Patient | null>(null);
  const [scheduling, setScheduling] = useState(false);

  if (!patient) {
    return (
      <EmptyState icon={<ArrowLeft />} title="Paciente não encontrado">
        <a href="#/pacientes" className="text-brand-700 hover:underline">
          Voltar para a lista
        </a>
      </EmptyState>
    );
  }

  const active = TABS.find((t) => t.id === tab) ?? TABS[0];
  const update = (fn: (p: Patient) => Patient) => actions.updatePatient(patient.id, fn);
  const m = patientMetrics(patient);

  const remove = async () => {
    const ok = await confirmDialog({
      title: 'Excluir paciente',
      message: `${patient.name} e todas as consultas dele(a) serão apagados. Esta ação não pode ser desfeita.`,
      confirmLabel: 'Excluir paciente',
      danger: true,
    });
    if (ok) {
      actions.deletePatient(patient.id);
      navigate('/pacientes');
    }
  };

  return (
    <div className="space-y-6">
      <a href="#/pacientes" className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-brand-800">
        <ArrowLeft size={16} /> Pacientes
      </a>

      <header className="relative overflow-hidden rounded-3xl bg-brand-950 p-6 text-white sm:p-8">
        <svg className="pointer-events-none absolute -top-10 -right-10 h-64 w-64 text-white/[0.04]" viewBox="0 0 100 100" aria-hidden="true">
          <path d="M10 85C10 45 40 15 90 10 88 55 58 88 15 88" fill="currentColor" />
        </svg>
        <div className="relative flex flex-wrap items-start justify-between gap-5">
          <div className="flex min-w-0 items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gold-400 font-display text-xl font-semibold text-brand-950">
              {patient.name.trim().charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-2xl font-semibold sm:text-[1.9rem]">{patient.name}</h1>
              <p className="mt-0.5 text-sm text-brand-200">
                {m.age} anos · {patient.sex === 'F' ? 'Feminino' : 'Masculino'}
                {patient.goal && <> · {patient.goal}</>}
              </p>
              <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-0.5 text-xs font-semibold text-brand-100">
                <span className={cx('h-1.5 w-1.5 rounded-full', patient.status === 'ativo' ? 'bg-brand-300' : patient.status === 'alta' ? 'bg-sky-300' : 'bg-slate-400')} />
                {STATUS_LABEL[patient.status]}
              </span>
              {patient.intern && !patient.intern.reviewed && (
                <a
                  href={`#/pacientes/${patient.id}/energia`}
                  className="mt-2 ml-2 inline-flex items-center gap-1.5 rounded-full bg-gold-400 px-2.5 py-0.5 text-xs font-semibold text-brand-950 hover:bg-gold-300"
                >
                  Estagiário: revisar cálculos
                </a>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="gold" onClick={() => setScheduling(true)}>
              <CalendarPlus size={16} /> Agendar retorno
            </Button>
            <Button className="bg-white/10 text-white hover:bg-white/20" onClick={() => setEditing(patient)}>
              <Pencil size={16} /> Dados
            </Button>
            <Button className="text-red-300 hover:bg-white/10" variant="ghost" onClick={remove} aria-label="Excluir paciente">
              <Trash2 size={16} />
            </Button>
          </div>
        </div>

        <dl className="relative mt-7 grid grid-cols-2 gap-x-6 gap-y-4 border-t border-white/10 pt-5 sm:grid-cols-3 lg:grid-cols-6">
          <Metric label="Peso" value={m.latest ? `${num(m.latest.weight)} kg` : '—'} />
          <Metric label="IMC" value={m.result ? num(m.result.bmi) : '—'} sub={m.result?.bmiClass} />
          <Metric label="Gordura" value={m.result?.fatPercent !== undefined ? `${num(m.result.fatPercent)}%` : '—'} sub={m.result?.fatClass} />
          <Metric label="Massa magra" value={m.result?.leanMass !== undefined ? `${num(m.result.leanMass)} kg` : '—'} />
          <Metric label="GET" value={m.energy?.get !== undefined ? `${num(m.energy.get, 0)} kcal` : '—'} />
          <Metric label="VET planejado" value={m.energy?.vet !== undefined ? `${num(m.energy.vet, 0)} kcal` : '—'} highlight />
        </dl>
      </header>

      <nav className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <div className="flex min-w-max gap-1 rounded-2xl border border-slate-200/80 bg-white p-1.5 shadow-sm">
          {TABS.map((t) => (
            <a
              key={t.id}
              href={`#/pacientes/${patient.id}/${t.id}`}
              className={cx(
                'rounded-xl px-3.5 py-2 text-sm font-semibold whitespace-nowrap transition',
                t.id === active.id ? 'bg-brand-800 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800',
              )}
            >
              {t.label}
            </a>
          ))}
        </div>
      </nav>

      <active.Component patient={patient} update={update} />

      {editing && (
        <Modal
          title="Dados do paciente"
          onClose={() => setEditing(null)}
          footer={
            <>
              <Button variant="secondary" onClick={() => setEditing(null)}>
                Cancelar
              </Button>
              <Button
                disabled={!editing.name.trim()}
                onClick={() => {
                  update(() => editing);
                  setEditing(null);
                }}
              >
                Salvar
              </Button>
            </>
          }
        >
          <PatientForm value={editing} onChange={setEditing} />
        </Modal>
      )}
      {scheduling && <ConsultationModal lockPatient value={newConsultation(patient.id)} onClose={() => setScheduling(false)} />}
    </div>
  );
}

function Metric({ label, value, sub, highlight }: { label: string; value: string; sub?: string; highlight?: boolean }) {
  return (
    <div className="min-w-0">
      <dt className="text-[0.68rem] font-semibold tracking-[0.12em] text-brand-300 uppercase">{label}</dt>
      <dd className={cx('mt-1 font-display text-xl font-semibold tabular-nums', highlight ? 'text-gold-300' : 'text-white')}>{value}</dd>
      {sub && <dd className="truncate text-xs text-brand-300">{sub}</dd>}
    </div>
  );
}
