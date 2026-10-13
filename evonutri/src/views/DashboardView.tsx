import { CalendarClock, CircleDollarSign, UserCheck, Users } from 'lucide-react';
import { useMemo } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Badge, Card, EmptyState, Stat } from '../components/ui';
import { brl, dateTime, nowLocalIso } from '../lib/format';
import { useDb } from '../lib/store';

const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

export function DashboardView() {
  const patients = useDb((db) => db.patients);
  const consultations = useDb((db) => db.consultations);

  const data = useMemo(() => {
    const now = new Date();
    const nowIso = nowLocalIso();
    const monthKey = nowIso.slice(0, 7);
    const valid = consultations.filter((c) => c.paymentStatus !== 'cancelado');
    const thisMonth = valid.filter((c) => c.date.startsWith(monthKey) && c.date <= nowIso);
    const revenue = thisMonth.filter((c) => c.paymentStatus === 'pago').reduce((s, c) => s + c.price, 0);
    const pending = valid.filter((c) => c.paymentStatus === 'pendente' && c.date <= nowIso).reduce((s, c) => s + c.price, 0);
    const upcoming = valid.filter((c) => c.date > nowIso).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 6);

    const chart = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const inMonth = valid.filter((c) => c.date.startsWith(key) && c.date <= nowIso);
      return {
        mes: MONTHS[d.getMonth()],
        consultas: inMonth.length,
        receita: inMonth.filter((c) => c.paymentStatus === 'pago').reduce((s, c) => s + c.price, 0),
      };
    });
    return { thisMonth: thisMonth.length, revenue, pending, upcoming, chart };
  }, [consultations]);

  const active = patients.filter((p) => p.status === 'ativo').length;
  const nameOf = (id: string) => patients.find((p) => p.id === id)?.name ?? 'Paciente removido';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Painel</h1>
        <p className="text-sm text-slate-500">Visão geral do consultório.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat icon={<Users size={20} />} label="Pacientes cadastrados" value={patients.length} />
        <Stat icon={<UserCheck size={20} />} tone="sky" label="Em acompanhamento" value={active} />
        <Stat icon={<CalendarClock size={20} />} tone="slate" label="Consultas no mês" value={data.thisMonth} />
        <Stat icon={<CircleDollarSign size={20} />} tone="amber" label="Recebido no mês" value={brl(data.revenue)} sub={`${brl(data.pending)} pendente`} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card title="Consultas por mês" className="lg:col-span-2">
          <div className="h-64">
            <ResponsiveContainer>
              <BarChart data={data.chart}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} width={30} />
                <Tooltip formatter={(v, n) => (n === 'receita' ? brl(Number(v)) : v)} />
                <Bar dataKey="consultas" name="Consultas" fill="#059669" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Próximas consultas" actions={<a href="#/agenda" className="text-sm text-emerald-600 hover:underline">Ver agenda</a>}>
          {data.upcoming.length === 0 ? (
            <EmptyState icon={<CalendarClock />} title="Nenhuma consulta agendada" />
          ) : (
            <ul className="space-y-3">
              {data.upcoming.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-2 text-sm">
                  <a href={`#/pacientes/${c.patientId}`} className="min-w-0">
                    <span className="block truncate font-medium text-slate-700 hover:text-emerald-700">{nameOf(c.patientId)}</span>
                    <span className="text-xs text-slate-400">{dateTime(c.date)}</span>
                  </a>
                  <Badge tone={c.type === 'primeira' ? 'sky' : 'slate'}>{c.type === 'primeira' ? '1ª consulta' : c.type === 'online' ? 'Online' : 'Retorno'}</Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
