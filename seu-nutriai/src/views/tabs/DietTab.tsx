import { ArrowDown, ArrowUp, ClipboardPaste, FileDown, Plus, RotateCcw, Trash2, Utensils } from 'lucide-react';
import { useMemo, useState } from 'react';
import { FoodPicker } from '../../components/FoodPicker';
import { Adequacy, Button, Card, confirmDialog, EmptyState, Field, IconButton, Input, Modal, NumberInput, Select, Textarea } from '../../components/ui';
import { dietNutrients, itemGrams, itemNutrients, mealNutrients } from '../../lib/diet';
import { parseDietText, type ParsedMeal } from '../../lib/dietParser';
import { num } from '../../lib/format';
import { patientMetrics } from '../../lib/patientMetrics';
import { dietMicros, fiberReference, MICRO_KEYS, MICRO_LABELS, microReference } from '../../lib/micros';
import type { DietPdfOptions } from '../../lib/pdf';
import { findFood, getProfile, uid, useFoods } from '../../lib/store';
import type { DietItem, MacroKey, Meal, Nutrients, Patient } from '../../types';
import type { TabProps } from '../PatientProfileView';
import { MACRO_LABEL } from './EnergyTab';

export function DietTab({ patient, update }: TabProps) {
  const [picking, setPicking] = useState<string | null>(null); // id da refeição
  const [importing, setImporting] = useState(false);
  const [pdfOpen, setPdfOpen] = useState(false);
  const diet = patient.diet;
  const totals = dietNutrients(diet, findFood);

  const setMeals = (fn: (meals: Meal[]) => Meal[]) =>
    update((p) => ({ ...p, diet: { ...p.diet, meals: fn(p.diet.meals), updatedAt: new Date().toISOString() } }));
  const setMeal = (id: string, fn: (m: Meal) => Meal) => setMeals((ms) => ms.map((m) => (m.id === id ? fn(m) : m)));
  const move = (index: number, dir: -1 | 1) =>
    setMeals((ms) => {
      const next = [...ms];
      const [m] = next.splice(index, 1);
      next.splice(index + dir, 0, m!);
      return next;
    });

  return (
    <div className="space-y-6">
      <ComparisonCard patient={patient} totals={totals} update={update} />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-slate-800">Refeições</h2>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => setImporting(true)}>
            <ClipboardPaste size={16} /> Importar texto
          </Button>
          <Button variant="secondary" onClick={() => setPdfOpen(true)} disabled={diet.meals.every((m) => m.items.length === 0)}>
            <FileDown size={16} /> Baixar PDF
          </Button>
          <Button onClick={() => setMeals((ms) => [...ms, { id: uid(), name: 'Nova refeição', time: '', items: [], notes: '' }])}>
            <Plus size={16} /> Refeição
          </Button>
        </div>
      </div>

      {diet.meals.length === 0 && (
        <EmptyState icon={<Utensils size={32} />} title="Plano alimentar vazio">
          Adicione refeições ou importe um cardápio em texto.
        </EmptyState>
      )}

      {diet.meals.map((meal, i) => {
        const mt = mealNutrients(meal, findFood);
        return (
          <Card
            key={meal.id}
            title={
              <span className="flex flex-wrap items-center gap-2">
                <Input className="w-32" type="time" value={meal.time} onChange={(e) => setMeal(meal.id, (m) => ({ ...m, time: e.target.value }))} />
                <Input className="w-56 font-semibold" value={meal.name} onChange={(e) => setMeal(meal.id, (m) => ({ ...m, name: e.target.value }))} />
              </span>
            }
            actions={
              <>
                <span className="self-center text-xs text-slate-500">
                  {num(mt.kcal, 0)} kcal · {num(totals.kcal ? (mt.kcal / totals.kcal) * 100 : 0, 0)}% do dia
                </span>
                <IconButton label="Subir" disabled={i === 0} onClick={() => move(i, -1)}>
                  <ArrowUp size={15} />
                </IconButton>
                <IconButton label="Descer" disabled={i === diet.meals.length - 1} onClick={() => move(i, 1)}>
                  <ArrowDown size={15} />
                </IconButton>
                <IconButton
                  label="Excluir refeição"
                  onClick={async () => {
                    const ok =
                      meal.items.length === 0 ||
                      (await confirmDialog({ title: 'Excluir refeição', message: `"${meal.name}" e seus ${meal.items.length} alimentos serão removidos.`, confirmLabel: 'Excluir', danger: true }));
                    if (ok) setMeals((ms) => ms.filter((m) => m.id !== meal.id));
                  }}
                >
                  <Trash2 size={15} />
                </IconButton>
              </>
            }
          >
            <MealItems meal={meal} onChange={(fn) => setMeal(meal.id, fn)} />
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              <Button variant="ghost" onClick={() => setPicking(meal.id)}>
                <Plus size={16} /> Adicionar alimento
              </Button>
              <span className="text-xs text-slate-500">
                CHO {num(mt.carbs, 0)} g · PTN {num(mt.protein, 0)} g · LIP {num(mt.fat, 0)} g · Fibras {num(mt.fiber, 0)} g
              </span>
            </div>
            <Input
              className="mt-3"
              placeholder="Observações da refeição (opções, modo de preparo...)"
              value={meal.notes}
              onChange={(e) => setMeal(meal.id, (m) => ({ ...m, notes: e.target.value }))}
            />
          </Card>
        );
      })}

      <MicrosCard patient={patient} />

      <Card title="Orientações gerais">
        <Textarea
          className="min-h-28"
          placeholder="Hidratação, preparo dos alimentos, comportamento alimentar..."
          value={diet.guidelines}
          onChange={(e) => update((p) => ({ ...p, diet: { ...p.diet, guidelines: e.target.value } }))}
        />
      </Card>

      {picking && (
        <Modal title="Adicionar alimento" onClose={() => setPicking(null)}>
          <FoodPicker
            autoFocus
            onPick={(food) => {
              const measure = food.measures[0];
              const item: DietItem = { id: uid(), foodId: food.id, amount: measure ? 1 : 100, measure: measure?.label ?? '' };
              setMeal(picking, (m) => ({ ...m, items: [...m.items, item] }));
              setPicking(null);
            }}
          />
        </Modal>
      )}
      {importing && <ImportModal onClose={() => setImporting(false)} onImport={(meals, replace) => setMeals((ms) => (replace ? meals : [...ms, ...meals]))} />}
      {pdfOpen && <DietPdfModal patient={patient} onClose={() => setPdfOpen(false)} />}
    </div>
  );
}

function MealItems({ meal, onChange }: { meal: Meal; onChange: (fn: (m: Meal) => Meal) => void }) {
  if (meal.items.length === 0) return <p className="text-sm text-slate-400">Nenhum alimento.</p>;
  const setItem = (id: string, patch: Partial<DietItem>) =>
    onChange((m) => ({ ...m, items: m.items.map((it) => (it.id === id ? { ...it, ...patch } : it)) }));
  return (
    <div className="-mx-6 overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="text-left text-xs text-slate-500 uppercase">
          <tr>
            <th className="px-6 py-1.5">Alimento</th>
            <th className="px-2 py-1.5">Qtd.</th>
            <th className="px-2 py-1.5">Medida</th>
            <th className="px-2 py-1.5 text-right">g</th>
            <th className="px-2 py-1.5 text-right">kcal</th>
            <th className="px-2 py-1.5 text-right">CHO</th>
            <th className="px-2 py-1.5 text-right">PTN</th>
            <th className="px-2 py-1.5 text-right">LIP</th>
            <th className="px-6 py-1.5" />
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {meal.items.map((it) => {
            const food = findFood(it.foodId);
            const n = itemNutrients(it, findFood);
            const grams = itemGrams(it, food);
            return (
              <tr key={it.id}>
                <td className="min-w-48 px-6 py-1.5 text-slate-800">{food?.name ?? <span className="text-red-600">Alimento removido</span>}</td>
                <td className="px-2 py-1.5">
                  <NumberInput className="w-20 py-1" min={0} step={it.measure ? 0.5 : 5} value={it.amount} onChange={(v) => setItem(it.id, { amount: v ?? 0 })} />
                </td>
                <td className="px-2 py-1.5">
                  <Select
                    className="w-44 py-1"
                    value={it.measure}
                    onChange={(e) => {
                      // Mantém a mesma massa ao trocar a unidade.
                      const next = e.target.value;
                      const g = food?.measures.find((x) => x.label === next)?.grams;
                      const amount = next && g ? Number((grams / g).toFixed(2)) : Math.round(grams);
                      setItem(it.id, { measure: next, amount });
                    }}
                  >
                    <option value="">gramas (g/mL)</option>
                    {food?.measures.map((m) => (
                      <option key={m.label} value={m.label}>
                        {m.label} ({num(m.grams)} g)
                      </option>
                    ))}
                  </Select>
                </td>
                <td className="px-2 py-1.5 text-right text-slate-500">{num(grams, 0)}</td>
                <td className="px-2 py-1.5 text-right">{num(n.kcal, 0)}</td>
                <td className="px-2 py-1.5 text-right">{num(n.carbs)}</td>
                <td className="px-2 py-1.5 text-right">{num(n.protein)}</td>
                <td className="px-2 py-1.5 text-right">{num(n.fat)}</td>
                <td className="px-6 py-1.5 text-right">
                  <IconButton label="Remover" onClick={() => onChange((m) => ({ ...m, items: m.items.filter((x) => x.id !== it.id) }))}>
                    <Trash2 size={14} />
                  </IconButton>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/** Tabela "Prescrito × Teórico": meta planejada versus soma real do cardápio. */
function ComparisonCard({ patient, totals, update }: { patient: Patient; totals: Nutrients; update: TabProps['update'] }) {
  const m = patientMetrics(patient);
  if (!m.targets || !m.energy?.vet || !m.weight) {
    return (
      <Card title="Prescrito × Teórico">
        <p className="text-sm text-slate-500">
          Registre uma avaliação e defina o gasto energético para comparar o cardápio com as metas. Total atual do cardápio:{' '}
          <strong>{num(totals.kcal, 0)} kcal</strong>.
        </p>
      </Card>
    );
  }
  const { targets, weight } = m;
  const vet = m.energy.vet;
  const setOverride = (k: MacroKey, v: number | undefined) =>
    update((p) => {
      const overrides = { ...p.energy.overrides };
      if (v === undefined) delete overrides[k];
      else overrides[k] = v;
      return { ...p, energy: { ...p.energy, overrides } };
    });

  const rows: { key: MacroKey | 'kcal'; label: string; target: number; actual: number; unit: string }[] = [
    { key: 'kcal', label: 'Energia', target: vet, actual: totals.kcal, unit: 'kcal' },
    ...(['carbs', 'protein', 'fat'] as MacroKey[]).map((k) => ({ key: k, label: MACRO_LABEL[k], target: targets.grams[k], actual: totals[k], unit: 'g' })),
  ];

  return (
    <Card title="Prescrito × Teórico" actions={<span className="text-xs text-slate-400">Peso de referência: {num(weight)} kg</span>}>
      <div className="-mx-6 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-slate-500 uppercase">
            <tr>
              <th className="px-6 py-2">Nutriente</th>
              <th className="px-2 py-2">Prescrito (meta)</th>
              <th className="px-2 py-2 text-right">Teórico (cardápio)</th>
              <th className="px-2 py-2 text-right">Diferença</th>
              <th className="px-2 py-2 text-right">g/kg teórico</th>
              <th className="px-2 py-2 text-right">% VET teórico</th>
              <th className="w-40 px-6 py-2">Adequação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((r) => {
              const adequacy = r.target ? (r.actual / r.target) * 100 : 0;
              const diff = r.actual - r.target;
              const isMacro = r.key !== 'kcal';
              const hasOverride = isMacro && patient.energy.overrides[r.key as MacroKey] !== undefined;
              return (
                <tr key={r.key}>
                  <td className="px-6 py-2 font-medium text-slate-700">{r.label}</td>
                  <td className="px-2 py-2">
                    {isMacro ? (
                      <span className="flex items-center gap-1">
                        <NumberInput
                          className="w-24 py-1"
                          min={0}
                          value={Math.round(r.target)}
                          onChange={(v) => setOverride(r.key as MacroKey, v)}
                          title="Ajuste direto da meta em gramas"
                        />
                        <span className="text-xs text-slate-400">g</span>
                        {hasOverride && (
                          <IconButton label="Voltar ao cálculo da meta" onClick={() => setOverride(r.key as MacroKey, undefined)}>
                            <RotateCcw size={14} />
                          </IconButton>
                        )}
                      </span>
                    ) : (
                      `${num(r.target, 0)} kcal`
                    )}
                  </td>
                  <td className="px-2 py-2 text-right font-semibold">
                    {num(r.actual, 0)} {r.unit}
                  </td>
                  <td className={`px-2 py-2 text-right ${Math.abs(adequacy - 100) > 10 ? 'text-amber-600' : 'text-slate-500'}`}>
                    {diff > 0 ? '+' : ''}
                    {num(diff, 0)} {r.unit}
                  </td>
                  <td className="px-2 py-2 text-right">{isMacro ? num(r.actual / weight, 2) : `${num(r.actual / weight, 1)} kcal/kg`}</td>
                  <td className="px-2 py-2 text-right">
                    {isMacro && totals.kcal ? `${num(((r.actual * (r.key === 'fat' ? 9 : 4)) / totals.kcal) * 100, 0)}%` : '—'}
                  </td>
                  <td className="px-6 py-2">
                    <div className="flex items-center gap-2">
                      <Adequacy value={adequacy} />
                      <span className="w-10 text-right text-xs text-slate-500">{num(adequacy, 0)}%</span>
                    </div>
                  </td>
                </tr>
              );
            })}
            <tr>
              <td className="px-6 py-2 font-medium text-slate-700">Fibras</td>
              <td className="px-2 py-2 text-slate-500">{fiberReference(patient.sex, m.age)} g (DRI)</td>
              <td className="px-2 py-2 text-right font-semibold">{num(totals.fiber, 0)} g</td>
              <td colSpan={4} />
            </tr>
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-slate-400">
        Adequação entre 90% e 110% em verde. Editar a meta em gramas cria um ajuste manual sobre a distribuição definida em Gasto energético.
      </p>
    </Card>
  );
}

function ImportModal({ onClose, onImport }: { onClose: () => void; onImport: (meals: Meal[], replace: boolean) => void }) {
  const foods = useFoods();
  const [text, setText] = useState('');
  const [replace, setReplace] = useState(false);
  const parsed: ParsedMeal[] = useMemo(() => parseDietText(text, foods), [text, foods]);
  const matched = parsed.reduce((s, m) => s + m.items.filter((i) => i.food).length, 0);
  const total = parsed.reduce((s, m) => s + m.items.length, 0);

  const confirmImport = () => {
    const meals: Meal[] = parsed.map((pm) => ({
      id: uid(),
      name: pm.name,
      time: pm.time,
      notes: pm.items
        .filter((i) => !i.food)
        .map((i) => `Não reconhecido: ${i.raw}`)
        .join(' | '),
      items: pm.items.filter((i) => i.food).map((i) => ({ id: uid(), foodId: i.food!.id, amount: i.amount, measure: i.measure })),
    }));
    onImport(meals, replace);
    onClose();
  };

  return (
    <Modal
      wide
      title="Importar cardápio em texto"
      onClose={onClose}
      footer={
        <>
          <label className="mr-auto flex items-center gap-2 text-sm text-slate-600">
            <input type="checkbox" className="accent-brand-600" checked={replace} onChange={(e) => setReplace(e.target.checked)} />
            Substituir o plano atual
          </label>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button disabled={matched === 0} onClick={confirmImport}>
            Importar {matched} alimento(s)
          </Button>
        </>
      }
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <Field label="Cole o plano alimentar" hint="Uma refeição por título (ex.: “Almoço - 12:30”) e um alimento por linha. Linhas iniciadas com “ou” são ignoradas.">
          <Textarea
            autoFocus
            className="min-h-80 font-mono text-xs"
            placeholder={'Café da manhã - 07:00\n- 2 fatias de pão integral\n- 1 col. sopa de requeijão\n- 1 copo de leite desnatado\n\nAlmoço 12h30\n- 4 colheres de sopa de arroz integral\n- 1 concha de feijão carioca\n- 120g de peito de frango grelhado'}
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
        </Field>
        <div>
          <p className="mb-1 text-xs font-medium text-slate-600">
            Pré-visualização {total > 0 && `— ${matched} de ${total} reconhecidos`}
          </p>
          <div className="max-h-80 space-y-3 overflow-y-auto rounded-lg border border-slate-200 p-3 text-sm">
            {parsed.length === 0 && <p className="text-slate-400">Nada para importar ainda.</p>}
            {parsed.map((m, i) => (
              <div key={i}>
                <p className="font-semibold text-slate-800">
                  {m.time && <span className="mr-1 text-brand-700">{m.time}</span>}
                  {m.name}
                </p>
                <ul className="mt-1 space-y-0.5">
                  {m.items.map((it, j) => (
                    <li key={j} className={it.food ? 'text-slate-600' : 'text-red-600'}>
                      {it.food ? (
                        <>
                          ✓ {num(it.amount, 2)} {it.measure || 'g'} — {it.food.name}
                        </>
                      ) : (
                        <>✗ {it.raw} (não reconhecido)</>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs text-slate-400">Itens não reconhecidos ficam registrados nas observações da refeição para inclusão manual.</p>
        </div>
      </div>
    </Modal>
  );
}

function MicrosCard({ patient }: { patient: Patient }) {
  const { totals, complete } = dietMicros(patient.diet, findFood);
  const m = patientMetrics(patient);
  const fiber = dietNutrients(patient.diet, findFood).fiber;
  const fiberRef = fiberReference(patient.sex, m.age);
  return (
    <Card title="Micronutrientes do cardápio" subtitle="Comparados às DRIs para o sexo e a idade do paciente. Sódio é limite máximo.">
      <div className="grid gap-x-8 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
        {[...MICRO_KEYS.map((k) => ({ key: k, ...MICRO_LABELS[k], value: totals[k], ref: microReference(k, patient.sex, m.age) })), { key: 'fiber', label: 'Fibras', unit: 'g', value: fiber, ref: { value: fiberRef, kind: 'meta' as const } }].map((x) => {
          const pct = x.ref.value ? (x.value / x.ref.value) * 100 : 0;
          return (
            <div key={x.key}>
              <div className="mb-1 flex items-baseline justify-between gap-2 text-sm">
                <span className="font-medium text-slate-700">{x.label}</span>
                <span className="text-xs text-slate-500 tabular-nums">
                  <span className="font-semibold text-slate-800">{num(x.value, x.unit === 'mg' && x.value < 20 ? 1 : 0)}</span> / {num(x.ref.value, 0)} {x.unit}
                  {x.ref.kind === 'limite' && ' (máx.)'}
                </span>
              </div>
              <Adequacy value={pct} kind={x.ref.kind === 'limite' ? 'limit' : 'min'} />
            </div>
          );
        })}
      </div>
      {!complete && <p className="mt-4 text-xs text-slate-400">Alguns alimentos (USDA, rótulo ou personalizados) não têm micronutrientes cadastrados e ficaram de fora da soma.</p>}
    </Card>
  );
}

function DietPdfModal({ patient, onClose }: { patient: Patient; onClose: () => void }) {
  const foods = useFoods();
  const [opts, setOpts] = useState<DietPdfOptions>({ macros: true, substitutions: true, supplements: true, guidelines: true, shopping: false });
  const [busy, setBusy] = useState(false);
  const items: [keyof DietPdfOptions, string, string][] = [
    ['macros', 'Resumo de calorias e macronutrientes', 'Totais do dia e de cada refeição'],
    ['substitutions', 'Substituições equivalentes', 'Até 4 trocas por alimento, com a quantidade'],
    ['guidelines', 'Orientações gerais', ''],
    ['supplements', 'Suplementação', ''],
    ['shopping', 'Lista de compras da semana', 'Agrupada por setor do mercado'],
  ];
  const generate = async () => {
    setBusy(true);
    try {
      await (await import('../../lib/pdf')).exportDietPdf(patient, getProfile(), findFood, foods, opts);
      onClose();
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal
      title="Baixar plano alimentar em PDF"
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={generate} disabled={busy}>
            <FileDown size={16} /> {busy ? 'Gerando…' : 'Gerar PDF'}
          </Button>
        </>
      }
    >
      <p className="mb-4 text-sm text-slate-500">Escolha o que vai no documento. O cabeçalho usa os dados do seu perfil em Configurações.</p>
      <div className="space-y-2">
        {items.map(([k, label, hint]) => (
          <label key={k} className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-3 hover:border-brand-300">
            <input type="checkbox" className="mt-0.5 h-4 w-4 accent-brand-700" checked={opts[k]} onChange={(e) => setOpts({ ...opts, [k]: e.target.checked })} />
            <span>
              <span className="block text-sm font-semibold text-slate-800">{label}</span>
              {hint && <span className="block text-xs text-slate-500">{hint}</span>}
            </span>
          </label>
        ))}
      </div>
    </Modal>
  );
}
