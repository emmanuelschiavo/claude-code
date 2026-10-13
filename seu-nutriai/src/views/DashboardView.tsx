import { CalendarClock, CircleDollarSign, Plus, UserCheck, Users } from 'lucide-react';
import { useMemo } from 'react';
import { Bar, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { navigate } from '../App';
import { Badge, Button, Card, EmptyState, PageHeader, Stat } from '../components/ui';
import { latestAssessment } from '../lib/anthropometry';
import { brl, date, dateTime, nowLocalIso } from '../lib/format';
import { useDb } from '../lib/store';

const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

function greeting(): string {
  const h = new Date().getHours();
  return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
}

export function DashboardView() {
  const patients = useDb((db) => db.patients);
  const consultations = useDb((db) => db.consultations);
  const profile = useDb((db) => db.profile);

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
  const recent = [...patients].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5);
  const firstName = profile?.name?.replace(/^(dra?\.?|nutri\.?)\s+/i, '').split(' ')[0];
  const today = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={today}
        title={`${greeting()}${firstName ? `, ${firstName}` : ''}`}
        subtitle="Este é o resumo do seu consultório."
        actions={
          <Button onClick={() => navigate('/pacientes')}>
            <Plus size={16} /> Novo atendimento
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat icon={<Users size={18} />} label="Pacientes" value={patients.length} sub="cadastrados" />
        <Stat icon={<UserCheck size={18} />} tone="sky" label="Em acompanhamento" value={active} sub={`${patients.length - active} com alta ou inativos`} />
        <Stat icon={<CalendarClock size={18} />} tone="slate" label="Consultas no mês" value={data.thisMonth} sub={`${data.upcoming.length} agendadas`} />
        <Stat icon={<CircleDollarSign size={18} />} tone="gold" label="Recebido no mês" value={brl(data.revenue)} sub={`${brl(data.pending)} a receber`} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card title="Atendimentos e receita" subtitle="Últimos 6 meses" className="lg:col-span-2">
          <div className="h-64">
            <ResponsiveContainer>
              <ComposedChart data={data.chart} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="#edf1ef" vertical={false} />
                <XAxis dataKey="mes" tick={{ fontSize: 12, fill: '#66746e' }} tickLine={false} axisLine={false} />
                <YAxis yAxisId="c" allowDecimals={false} tick={{ fontSize: 12, fill: '#66746e' }} tickLine={false} axisLine={false} width={28} />
                <YAxis yAxisId="r" orientation="right" tick={{ fontSize: 11, fill: '#9a7745' }} tickLine={false} axisLine={false} width={56} tickFormatter={(v) => `R$${v}`} />
                <Tooltip formatter={(v, n) => (n === 'Receita' ? brl(Number(v)) : v)} />
                <Bar yAxisId="c" dataKey="consultas" name="Consultas" fill="#195646" radius={[6, 6, 0, 0]} maxBarSize={36} />
                <Line yAxisId="r" dataKey="receita" name="Receita" stroke="#b8925a" strokeWidth={2.5} dot={{ r: 3, fill: '#b8925a' }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Próximas consultas" actions={<a href="#/agenda" className="text-sm font-semibold text-brand-700 hover:underline">Agenda</a>}>
          {data.upcoming.length === 0 ? (
            <EmptyState icon={<CalendarClock size={24} />} title="Nenhuma consulta agendada" />
          ) : (
            <ul className="divide-y divide-slate-100">
              {data.upcoming.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-3 py-3 first:pt-0">
                  <a href={`#/pacientes/${c.patientId}`} className="flex min-w-0 items-center gap-3">
                    <span className="flex w-11 shrink-0 flex-col items-center rounded-xl bg-brand-50 py-1 text-brand-800">
                      <span className="font-display text-base leading-none font-semibold">{c.date.slice(8, 10)}</span>
                      <span className="text-[0.65rem] uppercase">{MONTHS[Number(c.date.slice(5, 7)) - 1]}</span>
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-slate-800 hover:text-brand-700">{nameOf(c.patientId)}</span>
                      <span className="text-xs text-slate-500">{dateTime(c.date).slice(11)}</span>
                    </span>
                  </a>
                  <Badge tone={c.type === 'primeira' ? 'gold' : 'slate'}>{c.type === 'primeira' ? '1ª consulta' : c.type === 'online' ? 'Online' : 'Retorno'}</Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card title="Pacientes recentes" actions={<a href="#/pacientes" className="text-sm font-semibold text-brand-700 hover:underline">Ver todos</a>}>
        {recent.length === 0 ? (
          <EmptyState icon={<Users size={24} />} title="Nenhum paciente ainda" />
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {recent.map((p) => {
              const last = latestAssessment(p.assessments);
              return (
                <li key={p.id}>
                  <a href={`#/pacientes/${p.id}`} className="block rounded-xl border border-slate-200 p-3 transition hover:border-brand-300 hover:bg-brand-50/40">
                    <span className="mb-2 flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 font-display text-sm font-semibold text-brand-800">
                      {p.name.charAt(0).toUpperCase()}
                    </span>
                    <span className="block truncate text-sm font-semibold text-slate-800">{p.name}</span>
                    <span className="block truncate text-xs text-slate-500">{last ? `Última avaliação ${date(last.date)}` : 'Sem avaliação'}</span>
                  </a>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}
