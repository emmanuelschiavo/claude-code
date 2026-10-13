import { Printer, ShoppingCart } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Button, Card, EmptyState, Select } from '../../components/ui';
import { SECTOR_LABELS } from '../../data/taco';
import { itemGrams } from '../../lib/diet';
import { num } from '../../lib/format';
import { findFood } from '../../lib/store';
import type { Food, MarketSector } from '../../types';
import type { TabProps } from '../PatientProfileView';

const SECTOR_ORDER: MarketSector[] = ['hortifruti', 'acougue', 'laticinios', 'padaria', 'mercearia', 'outros'];

function formatQty(grams: number): string {
  return grams >= 1000 ? `${num(grams / 1000, 2)} kg` : `${num(Math.ceil(grams / 10) * 10, 0)} g`;
}

export function ShoppingTab({ patient }: TabProps) {
  const [days, setDays] = useState(7);

  const bySector = useMemo(() => {
    const totals = new Map<string, { food: Food; grams: number }>();
    for (const meal of patient.diet.meals) {
      for (const it of meal.items) {
        const food = findFood(it.foodId);
        if (!food) continue;
        const entry = totals.get(food.id) ?? { food, grams: 0 };
        entry.grams += itemGrams(it, food);
        totals.set(food.id, entry);
      }
    }
    const groups = new Map<MarketSector, { food: Food; grams: number }[]>();
    for (const e of totals.values()) {
      const list = groups.get(e.food.sector) ?? [];
      list.push({ ...e, grams: e.grams * days });
      groups.set(e.food.sector, list);
    }
    return SECTOR_ORDER.filter((s) => groups.has(s)).map((s) => ({
      sector: s,
      items: groups.get(s)!.sort((a, b) => a.food.name.localeCompare(b.food.name, 'pt-BR')),
    }));
  }, [patient.diet.meals, days]);

  if (bySector.length === 0) {
    return (
      <EmptyState icon={<ShoppingCart size={32} />} title="Lista vazia">
        A lista de compras é gerada automaticamente a partir do plano alimentar.
      </EmptyState>
    );
  }

  return (
    <Card
      title="Lista de compras"
      actions={
        <>
          <Select className="w-36" value={days} onChange={(e) => setDays(Number(e.target.value))}>
            <option value={7}>1 semana</option>
            <option value={14}>2 semanas</option>
            <option value={30}>1 mês</option>
          </Select>
          <Button variant="secondary" onClick={() => window.print()}>
            <Printer size={16} /> Imprimir
          </Button>
        </>
      }
    >
      <div className="print-area grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <h1 className="hidden text-lg font-bold print:block sm:col-span-2 lg:col-span-3">
          Lista de compras — {patient.name} ({days} dias)
        </h1>
        {bySector.map(({ sector, items }) => (
          <div key={sector} className="break-inside-avoid">
            <h3 className="mb-2 border-b border-slate-200 pb-1 text-sm font-semibold text-emerald-700">{SECTOR_LABELS[sector]}</h3>
            <ul className="space-y-1.5 text-sm">
              {items.map(({ food, grams }) => (
                <li key={food.id} className="flex items-start gap-2">
                  <input type="checkbox" className="mt-0.5 accent-emerald-600" aria-label={food.name} />
                  <span className="flex-1 text-slate-700">{food.name}</span>
                  <span className="shrink-0 font-medium text-slate-800">{formatQty(grams)}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <p className="mt-4 text-xs text-slate-400">Quantidades em peso pronto para consumo, conforme o cardápio; ajuste para o peso cru quando necessário.</p>
    </Card>
  );
}
