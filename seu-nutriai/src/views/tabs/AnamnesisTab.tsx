import { Card, Field, Textarea } from '../../components/ui';
import { date } from '../../lib/format';
import type { Anamnesis } from '../../types';
import type { TabProps } from '../PatientProfileView';

type Key = Exclude<keyof Anamnesis, 'updatedAt'>;

const SECTIONS: { title: string; fields: [Key, string, string?][] }[] = [
  {
    title: 'Histórico clínico',
    fields: [
      ['pathologies', 'Patologias e queixas', 'Diabetes, hipertensão, SOP, gastrite...'],
      ['medications', 'Medicamentos em uso'],
      ['familyHistory', 'Histórico familiar'],
      ['allergies', 'Alergias e intolerâncias'],
    ],
  },
  {
    title: 'Hábitos e estilo de vida',
    fields: [
      ['routine', 'Rotina diária', 'Horários de trabalho, estudo, deslocamento'],
      ['physicalActivity', 'Atividade física', 'Modalidade, frequência, duração e horário'],
      ['sleep', 'Sono', 'Horas por noite, qualidade, despertares'],
      ['bowel', 'Funcionamento intestinal', 'Frequência e escala de Bristol'],
      ['waterIntake', 'Ingestão hídrica'],
      ['alcoholSmoking', 'Álcool e tabagismo'],
    ],
  },
  {
    title: 'Comportamento alimentar',
    fields: [
      ['preferences', 'Preferências alimentares'],
      ['aversions', 'Aversões'],
      ['recall24h', 'Recordatório alimentar 24 h', 'Horário — refeição — alimentos e quantidades'],
    ],
  },
];

export function AnamnesisTab({ patient, update }: TabProps) {
  const a = patient.anamnesis;
  const set = (k: Key, v: string) =>
    update((p) => ({ ...p, anamnesis: { ...p.anamnesis, [k]: v, updatedAt: new Date().toISOString() } }));

  return (
    <div className="space-y-6">
      {a.updatedAt && <p className="text-xs text-slate-400">Atualizada em {date(a.updatedAt)} · salvamento automático</p>}
      {SECTIONS.map((s) => (
        <Card key={s.title} title={s.title}>
          <div className="grid gap-4 md:grid-cols-2">
            {s.fields.map(([k, label, placeholder]) => (
              <Field key={k} label={label} className={k === 'recall24h' ? 'md:col-span-2' : undefined}>
                <Textarea
                  className={k === 'recall24h' ? 'min-h-40' : undefined}
                  placeholder={placeholder}
                  value={a[k]}
                  onChange={(e) => set(k, e.target.value)}
                />
              </Field>
            ))}
          </div>
        </Card>
      ))}
    </div>
  );
}
