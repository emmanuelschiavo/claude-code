import { ACTIVITY_LABELS, GOAL_LABELS, inferActivity, inferGoal } from '../lib/intern';
import type { ActivityLevel, GoalType, Patient, PatientStatus, Sex } from '../types';
import { Field, Input, Select, Textarea } from './ui';

export function PatientForm({ value, onChange }: { value: Patient; onChange: (p: Patient) => void }) {
  const set = <K extends keyof Patient>(k: K, v: Patient[K]) => onChange({ ...value, [k]: v });
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Nome completo *" className="sm:col-span-2">
        <Input autoFocus value={value.name} onChange={(e) => set('name', e.target.value)} />
      </Field>
      <Field label="Data de nascimento">
        <Input type="date" value={value.birthDate} onChange={(e) => set('birthDate', e.target.value)} />
      </Field>
      <Field label="Sexo biológico" hint="Usado nas equações preditivas.">
        <Select value={value.sex} onChange={(e) => set('sex', e.target.value as Sex)}>
          <option value="F">Feminino</option>
          <option value="M">Masculino</option>
        </Select>
      </Field>
      <Field label="Telefone">
        <Input value={value.phone} onChange={(e) => set('phone', e.target.value)} />
      </Field>
      <Field label="E-mail">
        <Input type="email" value={value.email} onChange={(e) => set('email', e.target.value)} />
      </Field>
      <Field label="Objetivo" className="sm:col-span-2">
        <Input value={value.goal} placeholder="Ex.: hipertrofia, emagrecimento, controle glicêmico" onChange={(e) => set('goal', e.target.value)} />
      </Field>
      <Field label="Tipo de objetivo" hint={value.goalType ? undefined : `Automático: ${GOAL_LABELS[inferGoal(value.goal)]}`}>
        <Select value={value.goalType ?? ''} onChange={(e) => set('goalType', (e.target.value || undefined) as GoalType | undefined)}>
          <option value="">Automático (pelo texto do objetivo)</option>
          {Object.entries(GOAL_LABELS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </Select>
      </Field>
      <Field
        label="Nível de atividade"
        hint={value.activityLevel ? undefined : `Automático: ${ACTIVITY_LABELS[inferActivity(value.anamnesis.physicalActivity) ?? 'leve']}`}
      >
        <Select value={value.activityLevel ?? ''} onChange={(e) => set('activityLevel', (e.target.value || undefined) as ActivityLevel | undefined)}>
          <option value="">Automático (pela anamnese)</option>
          {Object.entries(ACTIVITY_LABELS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Status">
        <Select value={value.status} onChange={(e) => set('status', e.target.value as PatientStatus)}>
          <option value="ativo">Em acompanhamento</option>
          <option value="alta">Alta</option>
          <option value="inativo">Inativo</option>
        </Select>
      </Field>
      <Field label="Observações" className="sm:col-span-2">
        <Textarea value={value.notes} onChange={(e) => set('notes', e.target.value)} />
      </Field>
    </div>
  );
}
