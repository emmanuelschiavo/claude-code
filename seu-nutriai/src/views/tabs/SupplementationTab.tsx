import { Pill, Plus, Trash2 } from 'lucide-react';
import { Button, Card, EmptyState, Field, IconButton, Input, Textarea } from '../../components/ui';
import { uid } from '../../lib/store';
import type { Supplement } from '../../types';
import type { TabProps } from '../PatientProfileView';

const PRESETS: Omit<Supplement, 'id'>[] = [
  { name: 'Creatina monoidratada', dose: '3–5 g', form: 'Pó', timing: 'Diariamente, em qualquer horário', justification: '' },
  { name: 'Whey protein', dose: '30 g (1 scoop)', form: 'Pó', timing: 'Pós-treino', justification: '' },
  { name: 'Ômega 3 (EPA + DHA)', dose: '1 g', form: 'Cápsula', timing: 'Junto ao almoço', justification: '' },
  { name: 'Vitamina D3', dose: '2.000 UI', form: 'Gotas', timing: 'Junto a uma refeição com gordura', justification: '' },
  { name: 'Cafeína', dose: '3 mg/kg', form: 'Cápsula', timing: '30–60 min antes do treino', justification: '' },
];

export function SupplementationTab({ patient, update }: TabProps) {
  const list = patient.supplements;
  const setList = (fn: (s: Supplement[]) => Supplement[]) => update((p) => ({ ...p, supplements: fn(p.supplements) }));
  const setOne = (id: string, patch: Partial<Supplement>) => setList((s) => s.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  const add = (base: Omit<Supplement, 'id'>) => setList((s) => [...s, { id: uid(), ...base }]);

  return (
    <div className="space-y-6">
      <Card
        title="Suplementos e fórmulas manipuladas"
        actions={
          <Button onClick={() => add({ name: '', dose: '', form: '', timing: '', justification: '' })}>
            <Plus size={16} /> Novo
          </Button>
        }
      >
        <div className="mb-4 flex flex-wrap gap-2">
          <span className="self-center text-xs text-slate-500">Atalhos:</span>
          {PRESETS.map((p) => (
            <button
              key={p.name}
              type="button"
              className="rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-600 hover:border-brand-400 hover:text-brand-700"
              onClick={() => add(p)}
            >
              + {p.name}
            </button>
          ))}
        </div>

        {list.length === 0 ? (
          <EmptyState icon={<Pill size={32} />} title="Nenhum suplemento prescrito" />
        ) : (
          <div className="space-y-4">
            {list.map((s) => (
              <div key={s.id} className="rounded-lg border border-slate-200 p-4">
                <div className="grid gap-3 sm:grid-cols-4">
                  <Field label="Nome / composição" className="sm:col-span-2">
                    <Input value={s.name} onChange={(e) => setOne(s.id, { name: e.target.value })} />
                  </Field>
                  <Field label="Dose">
                    <Input value={s.dose} onChange={(e) => setOne(s.id, { dose: e.target.value })} />
                  </Field>
                  <Field label="Forma farmacêutica">
                    <Input
                      list="supplement-forms"
                      value={s.form}
                      onChange={(e) => setOne(s.id, { form: e.target.value })}
                    />
                  </Field>
                  <Field label="Horário / posologia" className="sm:col-span-2">
                    <Input value={s.timing} onChange={(e) => setOne(s.id, { timing: e.target.value })} />
                  </Field>
                  <Field label="Justificativa clínica" className="sm:col-span-2">
                    <Textarea className="min-h-10" value={s.justification} onChange={(e) => setOne(s.id, { justification: e.target.value })} />
                  </Field>
                </div>
                <div className="mt-2 text-right">
                  <IconButton label="Remover" onClick={() => setList((l) => l.filter((x) => x.id !== s.id))}>
                    <Trash2 size={15} />
                  </IconButton>
                </div>
              </div>
            ))}
          </div>
        )}
        <datalist id="supplement-forms">
          <option value="Cápsula" />
          <option value="Comprimido" />
          <option value="Pó" />
          <option value="Sachê" />
          <option value="Gotas" />
          <option value="Cápsula manipulada" />
          <option value="Solução oral" />
        </datalist>
      </Card>
      <p className="text-xs text-slate-400">A suplementação aparece também no plano alimentar impresso.</p>
    </div>
  );
}
