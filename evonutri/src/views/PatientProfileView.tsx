import { ArrowLeft, CalendarPlus, Pencil, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { navigate } from '../App';
import { PatientForm } from '../components/PatientForm';
import { Badge, Button, cx, EmptyState, Modal } from '../components/ui';
import { num } from '../lib/format';
import { patientMetrics } from '../lib/patientMetrics';
import { actions, useDb } from '../lib/store';
import type { Patient } from '../types';
import { ConsultationModal, newConsultation } from './FinanceView';
import { STATUS_LABEL, STATUS_TONE } from './PatientsView';
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
        <a href="#/pacientes" className="text-emerald-600 hover:underline">
          Voltar para a lista
        </a>
      </EmptyState>
    );
  }

  const active = TABS.find((t) => t.id === tab) ?? TABS[0];
  const update = (fn: (p: Patient) => Patient) => actions.updatePatient(patient.id, fn);
  const m = patientMetrics(patient);

  return (
    <div className="space-y-5">
      <a href="#/pacientes" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800">
        <ArrowLeft size={16} /> Pacientes
      </a>

      <header className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-lg font-semibold text-emerald-700">
              {patient.name.trim().charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-bold text-slate-800">{patient.name}</h1>
                <Badge tone={STATUS_TONE[patient.status]}>{STATUS_LABEL[patient.status]}</Badge>
              </div>
              <p className="text-sm text-slate-500">
                {m.age} anos · {patient.sex === 'F' ? 'Feminino' : 'Masculino'}
                {patient.goal && ` · ${patient.goal}`}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => setScheduling(true)}>
              <CalendarPlus size={16} /> Agendar
            </Button>
            <Button variant="secondary" onClick={() => setEditing(patient)}>
              <Pencil size={16} /> Dados
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                if (confirm(`Excluir ${patient.name} e todas as consultas? Esta ação não pode ser desfeita.`)) {
                  actions.deletePatient(patient.id);
                  navigate('/pacientes');
                }
              }}
            >
              <Trash2 size={16} />
            </Button>
          </div>
        </div>
        <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4 text-sm sm:grid-cols-5">
          <Metric label="Peso" value={m.latest ? `${num(m.latest.weight)} kg` : '—'} />
          <Metric label="IMC" value={m.result ? `${num(m.result.bmi)} kg/m²` : '—'} sub={m.result?.bmiClass} />
          <Metric label="% gordura" value={m.result?.fatPercent !== undefined ? `${num(m.result.fatPercent)}%` : '—'} />
          <Metric label="Massa magra" value={m.result?.leanMass !== undefined ? `${num(m.result.leanMass)} kg` : '—'} />
          <Metric label="VET planejado" value={m.energy?.vet !== undefined ? `${num(m.energy.vet, 0)} kcal` : '—'} />
        </dl>
      </header>

      <nav className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <div className="flex min-w-max gap-1 border-b border-slate-200">
          {TABS.map((t) => (
            <a
              key={t.id}
              href={`#/pacientes/${patient.id}/${t.id}`}
              className={cx(
                '-mb-px border-b-2 px-3 py-2 text-sm font-medium whitespace-nowrap transition',
                t.id === active.id ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-slate-500 hover:text-slate-800',
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

function Metric({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div>
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="font-semibold text-slate-800">{value}</dd>
      {sub && <dd className="text-xs text-slate-400">{sub}</dd>}
    </div>
  );
}
