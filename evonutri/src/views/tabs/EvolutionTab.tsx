import { LineChart as LineIcon } from 'lucide-react';
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card, EmptyState, Stat } from '../../components/ui';
import { evaluateAssessment } from '../../lib/anthropometry';
import { date, num } from '../../lib/format';
import type { TabProps } from '../PatientProfileView';

export function EvolutionTab({ patient }: TabProps) {
  const points = [...patient.assessments]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((a) => {
      const r = evaluateAssessment(a, patient.sex, patient.birthDate);
      return {
        data: date(a.date).slice(0, 5),
        peso: a.weight,
        gordura: r.fatPercent !== undefined ? Number(r.fatPercent.toFixed(1)) : null,
        massaMagra: r.leanMass !== undefined ? Number(r.leanMass.toFixed(1)) : null,
        massaGorda: r.fatMass !== undefined ? Number(r.fatMass.toFixed(1)) : null,
        cintura: a.circumferences.waist ?? null,
        quadril: a.circumferences.hip ?? null,
      };
    });

  if (points.length < 2) {
    return (
      <EmptyState icon={<LineIcon size={32} />} title="Evolução indisponível">
        São necessárias pelo menos duas avaliações para gerar os gráficos.
      </EmptyState>
    );
  }

  const first = points[0]!;
  const last = points[points.length - 1]!;
  const delta = (a: number | null, b: number | null, unit: string) =>
    a === null || b === null ? '—' : `${b - a > 0 ? '+' : ''}${num(b - a)} ${unit}`;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Variação de peso" value={delta(first.peso, last.peso, 'kg')} sub={`${points.length} avaliações`} />
        <Stat label="Variação de % gordura" value={delta(first.gordura, last.gordura, 'p.p.')} />
        <Stat label="Variação de massa magra" value={delta(first.massaMagra, last.massaMagra, 'kg')} tone="sky" />
        <Stat label="Variação de cintura" value={delta(first.cintura, last.cintura, 'cm')} tone="amber" />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Chart title="Peso (kg)" data={points} lines={[{ key: 'peso', name: 'Peso', color: '#059669' }]} />
        <Chart title="Gordura corporal (%)" data={points} lines={[{ key: 'gordura', name: '% gordura', color: '#f59e0b' }]} />
        <Chart
          title="Composição corporal (kg)"
          data={points}
          lines={[
            { key: 'massaMagra', name: 'Massa magra', color: '#0284c7' },
            { key: 'massaGorda', name: 'Massa gorda', color: '#f59e0b' },
          ]}
        />
        <Chart
          title="Circunferências (cm)"
          data={points}
          lines={[
            { key: 'cintura', name: 'Cintura', color: '#059669' },
            { key: 'quadril', name: 'Quadril', color: '#64748b' },
          ]}
        />
      </div>
    </div>
  );
}

function Chart({ title, data, lines }: { title: string; data: object[]; lines: { key: string; name: string; color: string }[] }) {
  return (
    <Card title={title}>
      <div className="h-56">
        <ResponsiveContainer>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="data" tick={{ fontSize: 12 }} />
            <YAxis domain={['auto', 'auto']} tick={{ fontSize: 12 }} width={36} />
            <Tooltip />
            {lines.length > 1 && <Legend />}
            {lines.map((l) => (
              <Line key={l.key} type="monotone" dataKey={l.key} name={l.name} stroke={l.color} strokeWidth={2} dot={{ r: 3 }} connectNulls />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
