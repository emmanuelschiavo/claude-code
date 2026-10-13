import { Printer, Repeat } from 'lucide-react';
import { useMemo, useState } from 'react';
import { FoodPicker } from '../../components/FoodPicker';
import { Button, Card, EmptyState, Field, Modal, NumberInput, Select } from '../../components/ui';
import { FOOD_GROUP_LABELS } from '../../data/taco';
import { itemGrams } from '../../lib/diet';
import { num } from '../../lib/format';
import { findFood, useFoods } from '../../lib/store';
import { defaultMode, findEquivalents, practicalGrams, type EquivalenceMode, type Equivalent } from '../../lib/substitutions';
import type { Food } from '../../types';
import type { TabProps } from '../PatientProfileView';

const MODE_LABEL: Record<EquivalenceMode, string> = {
  kcal: 'Isocalórica (kcal)',
  carbs: 'Mesmo carboidrato',
  protein: 'Mesma proteína',
  fat: 'Mesmo lipídio',
};

/** "≈ 2 colher de sopa" quando há medida caseira próxima de um número inteiro ou meio. */
export function householdHint(food: Food, grams: number): string {
  for (const m of food.measures) {
    const q = grams / m.grams;
    const rounded = Math.round(q * 2) / 2;
    if (rounded >= 0.5 && rounded <= 10 && Math.abs(q - rounded) / q < 0.2) return `≈ ${num(rounded)} ${m.label}`;
  }
  return '';
}

export function SubstitutionsTab({ patient }: TabProps) {
  const foods = useFoods();
  const [count, setCount] = useState(5);

  const items = useMemo(
    () =>
      patient.diet.meals.map((meal) => ({
        meal,
        rows: meal.items
          .map((it) => {
            const food = findFood(it.foodId);
            if (!food) return null;
            const grams = itemGrams(it, food);
            return { it, food, grams, eq: findEquivalents(food, grams, foods).slice(0, count) };
          })
          .filter((r) => r !== null && r.eq.length > 0) as { it: { id: string }; food: Food; grams: number; eq: Equivalent[] }[],
      })),
    [patient.diet.meals, foods, count],
  );

  return (
    <div className="space-y-6">
      <Calculator />

      <Card
        title="Lista de substituições do plano"
        actions={
          <>
            <Select className="w-40" value={count} onChange={(e) => setCount(Number(e.target.value))}>
              <option value={3}>3 opções por item</option>
              <option value={5}>5 opções por item</option>
              <option value={8}>8 opções por item</option>
            </Select>
            <Button variant="secondary" onClick={() => window.print()}>
              <Printer size={16} /> Imprimir
            </Button>
          </>
        }
      >
        {items.every((m) => m.rows.length === 0) ? (
          <EmptyState icon={<Repeat size={32} />} title="Sem itens substituíveis">
            Monte o plano alimentar para gerar as substituições.
          </EmptyState>
        ) : (
          <div className="print-area space-y-6">
            <h1 className="hidden text-lg font-bold print:block">Lista de substituições — {patient.name}</h1>
            {items.map(({ meal, rows }) =>
              rows.length === 0 ? null : (
                <div key={meal.id} className="break-inside-avoid">
                  <h3 className="mb-2 font-semibold text-slate-800">
                    {meal.time && <span className="mr-1 text-emerald-700">{meal.time}</span>}
                    {meal.name}
                  </h3>
                  <div className="grid gap-3 md:grid-cols-2">
                    {rows.map(({ it, food, grams, eq }) => (
                      <div key={it.id} className="rounded-lg border border-slate-200 p-3 text-sm">
                        <p className="font-medium text-slate-800">
                          {num(grams, 0)} g de {food.name}
                        </p>
                        <p className="mb-2 text-xs text-slate-400">
                          Pode trocar por ({MODE_LABEL[defaultMode(food)].toLowerCase()}):
                        </p>
                        <ul className="space-y-1">
                          {eq.map((e) => {
                            const g = practicalGrams(e.grams);
                            return (
                              <li key={e.food.id} className="flex justify-between gap-2">
                                <span className="text-slate-700">{e.food.name}</span>
                                <span className="shrink-0 text-right font-medium text-slate-800">
                                  {g} g <span className="block text-xs font-normal text-slate-400">{householdHint(e.food, g)}</span>
                                </span>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              ),
            )}
          </div>
        )}
      </Card>
    </div>
  );
}

function Calculator() {
  const foods = useFoods();
  const [food, setFood] = useState<Food | undefined>(() => findFood('arroz-branco'));
  const [grams, setGrams] = useState<number | undefined>(100);
  const [mode, setMode] = useState<EquivalenceMode>('carbs');
  const [picking, setPicking] = useState(false);
  const eq = food && grams ? findEquivalents(food, grams, foods, mode) : [];

  return (
    <Card title="Calculadora de equivalências">
      <div className="grid gap-4 sm:grid-cols-4">
        <Field label="Alimento de origem" className="sm:col-span-2">
          <button
            type="button"
            className="w-full truncate rounded-lg border border-slate-300 bg-white px-3 py-2 text-left text-sm hover:border-emerald-500"
            onClick={() => setPicking(true)}
          >
            {food?.name ?? 'Selecionar...'}
          </button>
        </Field>
        <Field label="Quantidade (g)">
          <NumberInput min={0} value={grams} onChange={setGrams} />
        </Field>
        <Field label="Critério">
          <Select value={mode} onChange={(e) => setMode(e.target.value as EquivalenceMode)}>
            {Object.entries(MODE_LABEL).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      {food && grams ? (
        <>
          <p className="mt-4 text-xs text-slate-500">
            {FOOD_GROUP_LABELS[food.group]} · {num(grams, 0)} g = {num((food.kcal * grams) / 100, 0)} kcal · CHO{' '}
            {num((food.carbs * grams) / 100)} g · PTN {num((food.protein * grams) / 100)} g · LIP {num((food.fat * grams) / 100)} g
          </p>
          <div className="-mx-5 mt-2 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-slate-500 uppercase">
                <tr>
                  <th className="px-5 py-2">Substituto</th>
                  <th className="px-2 py-2 text-right">Quantidade</th>
                  <th className="px-2 py-2 text-right">kcal</th>
                  <th className="px-2 py-2 text-right">CHO</th>
                  <th className="px-2 py-2 text-right">PTN</th>
                  <th className="px-5 py-2 text-right">LIP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {eq.map((e) => (
                  <tr key={e.food.id}>
                    <td className="px-5 py-2">{e.food.name}</td>
                    <td className="px-2 py-2 text-right font-medium">
                      {num(e.grams, 0)} g <span className="block text-xs font-normal text-slate-400">{householdHint(e.food, e.grams)}</span>
                    </td>
                    <td className="px-2 py-2 text-right">{num(e.kcal, 0)}</td>
                    <td className="px-2 py-2 text-right">{num(e.carbs)}</td>
                    <td className="px-2 py-2 text-right">{num(e.protein)}</td>
                    <td className="px-5 py-2 text-right">{num(e.fat)}</td>
                  </tr>
                ))}
                {eq.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-5 py-4 text-center text-slate-400">
                      Nenhum equivalente no mesmo grupo para este critério.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      ) : null}

      {picking && (
        <Modal title="Alimento de origem" onClose={() => setPicking(false)}>
          <FoodPicker
            autoFocus
            onPick={(f) => {
              setFood(f);
              setMode(defaultMode(f));
              setPicking(false);
            }}
          />
        </Modal>
      )}
    </Card>
  );
}
