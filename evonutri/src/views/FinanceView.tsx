import { CalendarDays, CircleDollarSign, Clock, Pencil, Plus, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Badge, Button, Card, EmptyState, Field, IconButton, Input, Modal, NumberInput, Select, Stat, Textarea } from '../components/ui';
import { brl, dateTime, nowLocalIso } from '../lib/format';
import { actions, uid, useDb } from '../lib/store';
import type { Consultation, PaymentStatus } from '../types';

const TYPE_LABEL: Record<Consultation['type'], string> = { primeira: '1ª consulta', retorno: 'Retorno', online: 'Online' };
const PAY_TONE: Record<PaymentStatus, 'emerald' | 'amber' | 'red'> = { pago: 'emerald', pendente: 'amber', cancelado: 'red' };

export function newConsultation(patientId = ''): Consultation {
  return { id: uid(), patientId, date: nowLocalIso(), type: 'retorno', price: 0, paymentStatus: 'pendente', paymentMethod: 'Pix', notes: '' };
}

export function FinanceView() {
  const patients = useDb((db) => db.patients);
  const consultations = useDb((db) => db.consultations);
  const [month, setMonth] = useState(() => nowLocalIso().slice(0, 7));
  const [editing, setEditing] = useState<Consultation | null>(null);

  const inMonth = useMemo(
    () => consultations.filter((c) => c.date.startsWith(month)).sort((a, b) => a.date.localeCompare(b.date)),
    [consultations, month],
  );
  const totals = useMemo(() => {
    const sum = (s: PaymentStatus) => inMonth.filter((c) => c.paymentStatus === s).reduce((t, c) => t + c.price, 0);
    return { paid: sum('pago'), pending: sum('pendente'), count: inMonth.filter((c) => c.paymentStatus !== 'cancelado').length };
  }, [inMonth]);

  const nameOf = (id: string) => patients.find((p) => p.id === id)?.name ?? 'Paciente removido';

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Agenda e financeiro</h1>
          <p className="text-sm text-slate-500">Consultas, recebimentos e pendências.</p>
        </div>
        <div className="flex gap-2">
          <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="w-44" />
          <Button onClick={() => setEditing(newConsultation(patients[0]?.id))} disabled={patients.length === 0}>
            <Plus size={16} /> Consulta
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat icon={<CalendarDays size={20} />} tone="slate" label="Consultas no mês" value={totals.count} />
        <Stat icon={<CircleDollarSign size={20} />} label="Recebido" value={brl(totals.paid)} />
        <Stat icon={<Clock size={20} />} tone="amber" label="A receber" value={brl(totals.pending)} />
      </div>

      <Card title="Consultas do mês">
        {inMonth.length === 0 ? (
          <EmptyState icon={<CalendarDays size={32} />} title="Nenhuma consulta neste mês" />
        ) : (
          <div className="-mx-5 -my-5 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs text-slate-500 uppercase">
                <tr>
                  <th className="px-4 py-3">Data</th>
                  <th className="px-4 py-3">Paciente</th>
                  <th className="px-4 py-3">Tipo</th>
                  <th className="px-4 py-3 text-right">Valor</th>
                  <th className="px-4 py-3">Pagamento</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {inMonth.map((c) => (
                  <tr key={c.id}>
                    <td className="px-4 py-3 whitespace-nowrap">{dateTime(c.date)}</td>
                    <td className="px-4 py-3">
                      <a href={`#/pacientes/${c.patientId}`} className="font-medium text-slate-700 hover:text-emerald-700">
                        {nameOf(c.patientId)}
                      </a>
                    </td>
                    <td className="px-4 py-3">{TYPE_LABEL[c.type]}</td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">{brl(c.price)}</td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        title="Alternar pago/pendente"
                        onClick={() =>
                          c.paymentStatus !== 'cancelado' &&
                          actions.upsertConsultation({ ...c, paymentStatus: c.paymentStatus === 'pago' ? 'pendente' : 'pago' })
                        }
                      >
                        <Badge tone={PAY_TONE[c.paymentStatus]}>{c.paymentStatus}</Badge>
                      </button>
                      {c.paymentMethod && <span className="ml-2 text-xs text-slate-400">{c.paymentMethod}</span>}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <IconButton label="Editar" onClick={() => setEditing(c)}>
                        <Pencil size={15} />
                      </IconButton>
                      <IconButton
                        label="Excluir"
                        onClick={() => confirm('Excluir esta consulta?') && actions.deleteConsultation(c.id)}
                      >
                        <Trash2 size={15} />
                      </IconButton>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {editing && <ConsultationModal value={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}

export function ConsultationModal({ value, onClose, lockPatient }: { value: Consultation; onClose: () => void; lockPatient?: boolean }) {
  const patients = useDb((db) => db.patients);
  const [c, setC] = useState(value);
  const set = <K extends keyof Consultation>(k: K, v: Consultation[K]) => setC({ ...c, [k]: v });
  const save = () => {
    actions.upsertConsultation(c);
    onClose();
  };
  return (
    <Modal
      title="Consulta"
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={save} disabled={!c.patientId || !c.date}>
            Salvar
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Paciente" className="sm:col-span-2">
          <Select value={c.patientId} disabled={lockPatient} onChange={(e) => set('patientId', e.target.value)}>
            {patients.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Data e hora">
          <Input type="datetime-local" value={c.date} onChange={(e) => set('date', e.target.value)} />
        </Field>
        <Field label="Tipo">
          <Select value={c.type} onChange={(e) => set('type', e.target.value as Consultation['type'])}>
            {Object.entries(TYPE_LABEL).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Valor (R$)">
          <NumberInput min={0} step={10} value={c.price} onChange={(v) => set('price', v ?? 0)} />
        </Field>
        <Field label="Pagamento">
          <Select value={c.paymentStatus} onChange={(e) => set('paymentStatus', e.target.value as PaymentStatus)}>
            <option value="pendente">Pendente</option>
            <option value="pago">Pago</option>
            <option value="cancelado">Cancelado</option>
          </Select>
        </Field>
        <Field label="Forma de pagamento" className="sm:col-span-2">
          <Select value={c.paymentMethod} onChange={(e) => set('paymentMethod', e.target.value)}>
            <option value="">—</option>
            <option>Pix</option>
            <option>Cartão</option>
            <option>Dinheiro</option>
            <option>Convênio</option>
            <option>Transferência</option>
          </Select>
        </Field>
        <Field label="Observações" className="sm:col-span-2">
          <Textarea value={c.notes} onChange={(e) => set('notes', e.target.value)} />
        </Field>
      </div>
    </Modal>
  );
}
