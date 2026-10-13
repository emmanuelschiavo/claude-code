import { Plus, Search, Users } from 'lucide-react';
import { useMemo, useState } from 'react';
import { navigate } from '../App';
import { PatientForm } from '../components/PatientForm';
import { Badge, Button, EmptyState, Input, Modal, PageHeader, Select } from '../components/ui';
import { newPatient } from '../data/seed';
import { ageAt, latestAssessment } from '../lib/anthropometry';
import { normalize } from '../lib/dietParser';
import { date, num } from '../lib/format';
import { actions, useDb } from '../lib/store';
import type { Patient, PatientStatus } from '../types';

export const STATUS_LABEL: Record<PatientStatus, string> = { ativo: 'Em acompanhamento', alta: 'Alta', inativo: 'Inativo' };
export const STATUS_TONE: Record<PatientStatus, 'brand' | 'sky' | 'slate'> = { ativo: 'brand', alta: 'sky', inativo: 'slate' };

export function PatientsView() {
  const patients = useDb((db) => db.patients);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<PatientStatus | ''>('');
  const [draft, setDraft] = useState<Patient | null>(null);

  const list = useMemo(() => {
    const q = normalize(query);
    return patients
      .filter((p) => (!status || p.status === status) && (!q || normalize(`${p.name} ${p.email} ${p.phone}`).includes(q)))
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  }, [patients, query, status]);

  const save = () => {
    if (!draft || !draft.name.trim()) return;
    actions.addPatient(draft);
    setDraft(null);
    navigate(`/pacientes/${draft.id}/anamnese`);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={`${patients.length} cadastrados`}
        title="Pacientes"
        subtitle="Prontuários, avaliações e planos alimentares."
        actions={
          <Button onClick={() => setDraft(newPatient())}>
            <Plus size={16} /> Novo paciente
          </Button>
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search size={16} className="pointer-events-none absolute top-2.5 left-3 text-slate-400" />
          <Input className="pl-9" placeholder="Buscar por nome, e-mail ou telefone" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <Select className="sm:w-56" value={status} onChange={(e) => setStatus(e.target.value as PatientStatus | '')}>
          <option value="">Todos os status</option>
          {Object.entries(STATUS_LABEL).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </Select>
      </div>

      {list.length === 0 ? (
        <EmptyState icon={<Users size={32} />} title="Nenhum paciente encontrado">
          Cadastre um paciente para iniciar o atendimento.
        </EmptyState>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs text-slate-500 uppercase">
              <tr>
                <th className="px-4 py-3">Paciente</th>
                <th className="px-4 py-3">Idade</th>
                <th className="hidden px-4 py-3 md:table-cell">Objetivo</th>
                <th className="px-4 py-3">Último peso</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {list.map((p) => {
                const last = latestAssessment(p.assessments);
                return (
                  <tr key={p.id} className="cursor-pointer hover:bg-slate-50" onClick={() => navigate(`/pacientes/${p.id}`)}>
                    <td className="px-4 py-3">
                      <span className="font-medium text-slate-800">{p.name}</span>
                      <span className="block text-xs text-slate-400">{p.phone || p.email}</span>
                    </td>
                    <td className="px-4 py-3">{ageAt(p.birthDate)} anos</td>
                    <td className="hidden max-w-xs truncate px-4 py-3 text-slate-600 md:table-cell">{p.goal || '—'}</td>
                    <td className="px-4 py-3">
                      {last ? (
                        <>
                          {num(last.weight)} kg <span className="block text-xs text-slate-400">{date(last.date)}</span>
                        </>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={STATUS_TONE[p.status]}>{STATUS_LABEL[p.status]}</Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {draft && (
        <Modal
          title="Novo paciente"
          onClose={() => setDraft(null)}
          footer={
            <>
              <Button variant="secondary" onClick={() => setDraft(null)}>
                Cancelar
              </Button>
              <Button onClick={save} disabled={!draft.name.trim()}>
                Cadastrar
              </Button>
            </>
          }
        >
          <PatientForm value={draft} onChange={setDraft} />
        </Modal>
      )}
    </div>
  );
}
