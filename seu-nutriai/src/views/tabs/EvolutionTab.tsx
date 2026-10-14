import { FileDown, LineChart as LineIcon } from 'lucide-react';
import { useState } from 'react';
import { Area, AreaChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Button, Card, EmptyState, Stat } from '../../components/ui';
import { evaluateAssessment } from '../../lib/anthropometry';
import { date, num } from '../../lib/format';
import { getProfile } from '../../lib/store';
import type { TabProps } from '../PatientProfileView';

const COLORS = { brand: '#195646', gold: '#b8925a', sky: '#0284c7', grid: '#edf1ef', axis: '#66746e' };

export function EvolutionTab({ patient }: TabProps) {
  const [busy, setBusy] = useState(false);
  const points = [...patient.assessments]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((a) => {
      const r = evaluateAssessment(a, patient.sex, patient.birthDate, patient.targetFatPercent);
      const round = (v?: number) => (v !== undefined ? Number(v.toFixed(1)) : null);
      return {
        data: date(a.date).slice(0, 5),
        peso: a.weight,
        imc: round(r.bmi),
        gordura: round(r.fatPercent),
        massaMagra: round(r.leanMass),
        massaGorda: round(r.fatMass),
        cintura: a.circumferences.waist ?? null,
        quadril: a.circumferences.hip ?? null,
        abdomen: a.circumferences.abdomen ?? null,
      };
    });

  const exportPdf = async () => {
    setBusy(true);
    try {
      await (await import('../../lib/pdf')).exportEvolutionPdf(patient, getProfile());
    } finally {
      setBusy(false);
    }
  };

  if (points.length < 2) {
    return (
      <EmptyState icon={<LineIcon size={28} />} title="Evolução disponível a partir da 2ª avaliação">
        Registre pelo menos duas avaliações na aba Antropometria para acompanhar a evolução.
      </EmptyState>
    );
  }

  const first = points[0]!;
  const last = points[points.length - 1]!;
  const delta = (a: number | null, b: number | null, unit: string) =>
    a === null || b === null ? '—' : `${b - a > 0 ? '+' : ''}${num(b - a)} ${unit}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-500">
          {points.length} avaliações · de {first.data} a {last.data}
        </p>
        <Button onClick={exportPdf} disabled={busy}>
          <FileDown size={16} /> {busy ? 'Gerando…' : 'Baixar evolução em PDF'}
        </Button>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Peso" value={delta(first.peso, last.peso, 'kg')} sub={`${num(first.peso)} → ${num(last.peso)} kg`} />
        <Stat label="Gordura corporal" value={delta(first.gordura, last.gordura, 'p.p.')} tone="gold" sub={`${num(first.gordura ?? undefined)} → ${num(last.gordura ?? undefined)}%`} />
        <Stat label="Massa magra" value={delta(first.massaMagra, last.massaMagra, 'kg')} tone="sky" />
        <Stat label="Cintura" value={delta(first.cintura, last.cintura, 'cm')} tone="amber" />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <AreaCard title="Peso (kg)" data={points} dataKey="peso" color={COLORS.brand} />
        <AreaCard title="Gordura corporal (%)" data={points} dataKey="gordura" color={COLORS.gold} />
        <Chart
          title="Composição corporal (kg)"
          data={points}
          lines={[
            { key: 'massaMagra', name: 'Massa magra', color: COLORS.sky },
            { key: 'massaGorda', name: 'Massa gorda', color: COLORS.gold },
          ]}
        />
        <Chart
          title="Circunferências (cm)"
          data={points}
          lines={[
            { key: 'cintura', name: 'Cintura', color: COLORS.brand },
            { key: 'abdomen', name: 'Abdômen', color: COLORS.sky },
            { key: 'quadril', name: 'Quadril', color: COLORS.gold },
          ]}
        />
      </div>
    </div>
  );
}

const axisProps = { tick: { fontSize: 11, fill: COLORS.axis }, tickLine: false, axisLine: false } as const;

function AreaCard({ title, data, dataKey, color }: { title: string; data: object[]; dataKey: string; color: string }) {
  const id = `grad-${dataKey}`;
  return (
    <Card title={title}>
      <div className="h-56">
        <ResponsiveContainer>
          <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.22} />
                <stop offset="100%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke={COLORS.grid} vertical={false} />
            <XAxis dataKey="data" {...axisProps} />
            <YAxis domain={['auto', 'auto']} width={36} {...axisProps} />
            <Tooltip />
            <Area type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2.5} fill={`url(#${id})`} dot={{ r: 3, fill: color }} connectNulls />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

function Chart({ title, data, lines }: { title: string; data: object[]; lines: { key: string; name: string; color: string }[] }) {
  return (
    <Card title={title}>
      <div className="h-56">
        <ResponsiveContainer>
          <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid stroke={COLORS.grid} vertical={false} />
            <XAxis dataKey="data" {...axisProps} />
            <YAxis domain={['auto', 'auto']} width={36} {...axisProps} />
            <Tooltip />
            <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
            {lines.map((l) => (
              <Line key={l.key} type="monotone" dataKey={l.key} name={l.name} stroke={l.color} strokeWidth={2.5} dot={{ r: 3 }} connectNulls />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
