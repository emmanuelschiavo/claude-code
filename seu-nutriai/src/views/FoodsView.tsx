import { Plus, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Badge, Button, Card, confirmDialog, Field, IconButton, Input, Modal, NumberInput, PageHeader, Select } from '../components/ui';
import { FOOD_GROUP_LABELS, SECTOR_LABELS } from '../data/taco';
import { normalize } from '../lib/dietParser';
import { num } from '../lib/format';
import { actions, uid, useFoods } from '../lib/store';
import type { Food, FoodGroup, MarketSector } from '../types';

export function FoodsView() {
  const foods = useFoods();
  const [query, setQuery] = useState('');
  const [group, setGroup] = useState<FoodGroup | ''>('');
  const [draft, setDraft] = useState<Food | null>(null);
  const [limit, setLimit] = useState(80);

  const list = useMemo(() => {
    const words = normalize(query).split(' ').filter(Boolean);
    return foods.filter((f) => (!group || f.group === group) && words.every((w) => normalize(f.name).includes(w)));
  }, [foods, query, group]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={`${foods.length} alimentos`}
        title="Banco de alimentos"
        subtitle="Tabela TACO 4ª ed. completa, itens complementares (USDA e rótulos) e seus alimentos personalizados. Valores por 100 g."
        actions={
        <Button
          onClick={() =>
            setDraft({ id: `custom-${uid()}`, name: '', group: 'cereais', sector: 'mercearia', source: 'Personalizado', kcal: 0, carbs: 0, protein: 0, fat: 0, fiber: 0, measures: [] })
          }
        >
          <Plus size={16} /> Alimento personalizado
        </Button>
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row">
        <Input className="flex-1" placeholder="Buscar alimento" value={query} onChange={(e) => { setQuery(e.target.value); setLimit(80); }} />
        <Select className="sm:w-64" value={group} onChange={(e) => setGroup(e.target.value as FoodGroup | '')}>
          <option value="">Todos os grupos</option>
          {Object.entries(FOOD_GROUP_LABELS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </Select>
      </div>

      <Card>
        <div className="-mx-6 -mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs text-slate-500 uppercase">
              <tr>
                <th className="px-4 py-3">Alimento</th>
                <th className="px-4 py-3 text-right">kcal</th>
                <th className="px-4 py-3 text-right">CHO (g)</th>
                <th className="px-4 py-3 text-right">PTN (g)</th>
                <th className="px-4 py-3 text-right">LIP (g)</th>
                <th className="px-4 py-3 text-right">Fibra (g)</th>
                <th className="hidden px-4 py-3 text-right xl:table-cell">Na (mg)</th>
                <th className="hidden px-4 py-3 text-right xl:table-cell">Ca (mg)</th>
                <th className="hidden px-4 py-3 text-right xl:table-cell">Fe (mg)</th>
                <th className="hidden px-4 py-3 lg:table-cell">Medidas caseiras</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {list.slice(0, limit).map((f) => (
                <tr key={f.id}>
                  <td className="px-4 py-2">
                    <span className="text-slate-800">{f.name}</span>
                    <span className="block text-xs text-slate-400">
                      {FOOD_GROUP_LABELS[f.group]} {f.source !== 'TACO' && <Badge tone="sky">{f.source}</Badge>}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right">{num(f.kcal, 0)}</td>
                  <td className="px-4 py-2 text-right">{num(f.carbs)}</td>
                  <td className="px-4 py-2 text-right">{num(f.protein)}</td>
                  <td className="px-4 py-2 text-right">{num(f.fat)}</td>
                  <td className="px-4 py-2 text-right">{num(f.fiber)}</td>
                  <td className="hidden px-4 py-2 text-right text-slate-500 xl:table-cell">{num(f.micros?.sodium, 0)}</td>
                  <td className="hidden px-4 py-2 text-right text-slate-500 xl:table-cell">{num(f.micros?.calcium, 0)}</td>
                  <td className="hidden px-4 py-2 text-right text-slate-500 xl:table-cell">{num(f.micros?.iron, 1)}</td>
                  <td className="hidden px-4 py-2 text-xs text-slate-500 lg:table-cell">
                    {f.measures.map((m) => `${m.label} = ${num(m.grams)} g`).join(' · ') || '—'}
                  </td>
                  <td className="px-4 py-2 text-right">
                    {f.source === 'Personalizado' && (
                      <IconButton
                        label="Excluir"
                        onClick={async () =>
                          (await confirmDialog({ title: 'Excluir alimento', message: `"${f.name}" será removido do banco.`, confirmLabel: 'Excluir', danger: true })) &&
                          actions.deleteCustomFood(f.id)
                        }
                      >
                        <Trash2 size={15} />
                      </IconButton>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {list.length > limit && (
          <div className="border-t border-slate-100 pt-4 text-center">
            <Button variant="ghost" onClick={() => setLimit((l) => l + 120)}>
              Mostrar mais ({list.length - limit} restantes)
            </Button>
          </div>
        )}
      </Card>

      {draft && <CustomFoodModal value={draft} onClose={() => setDraft(null)} />}
    </div>
  );
}

function CustomFoodModal({ value, onClose }: { value: Food; onClose: () => void }) {
  const [f, setF] = useState(value);
  const [measure, setMeasure] = useState({ label: '', grams: undefined as number | undefined });
  const set = <K extends keyof Food>(k: K, v: Food[K]) => setF({ ...f, [k]: v });
  const nums: [keyof Food & ('kcal' | 'carbs' | 'protein' | 'fat' | 'fiber'), string][] = [
    ['kcal', 'Energia (kcal)'],
    ['carbs', 'Carboidratos (g)'],
    ['protein', 'Proteínas (g)'],
    ['fat', 'Lipídios (g)'],
    ['fiber', 'Fibras (g)'],
  ];
  const save = () => {
    actions.addCustomFood(f);
    onClose();
  };
  return (
    <Modal
      title="Alimento personalizado"
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={save} disabled={!f.name.trim()}>
            Salvar
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nome *" className="sm:col-span-2">
          <Input autoFocus value={f.name} onChange={(e) => set('name', e.target.value)} />
        </Field>
        <Field label="Grupo (define as substituições)">
          <Select value={f.group} onChange={(e) => set('group', e.target.value as FoodGroup)}>
            {Object.entries(FOOD_GROUP_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Setor do mercado">
          <Select value={f.sector} onChange={(e) => set('sector', e.target.value as MarketSector)}>
            {Object.entries(SECTOR_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </Select>
        </Field>
        <p className="text-xs font-medium text-slate-500 sm:col-span-2">Composição por 100 g</p>
        {nums.map(([k, label]) => (
          <Field key={k} label={label}>
            <NumberInput min={0} step={0.1} value={f[k]} onChange={(v) => set(k, v ?? 0)} />
          </Field>
        ))}
        <div className="sm:col-span-2">
          <p className="mb-1 text-xs font-medium text-slate-600">Medidas caseiras</p>
          <ul className="mb-2 space-y-1 text-sm">
            {f.measures.map((m, i) => (
              <li key={i} className="flex items-center justify-between rounded bg-slate-50 px-2 py-1">
                {m.label} = {num(m.grams)} g
                <IconButton label="Remover" onClick={() => set('measures', f.measures.filter((_, j) => j !== i))}>
                  <Trash2 size={14} />
                </IconButton>
              </li>
            ))}
          </ul>
          <div className="flex gap-2">
            <Input placeholder="Ex.: scoop" value={measure.label} onChange={(e) => setMeasure({ ...measure, label: e.target.value })} />
            <NumberInput placeholder="g" className="w-24" value={measure.grams} onChange={(v) => setMeasure({ ...measure, grams: v })} />
            <Button
              variant="secondary"
              disabled={!measure.label.trim() || !measure.grams}
              onClick={() => {
                set('measures', [...f.measures, { label: measure.label.trim(), grams: measure.grams! }]);
                setMeasure({ label: '', grams: undefined });
              }}
            >
              Adicionar
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
