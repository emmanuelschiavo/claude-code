import { Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { FOOD_GROUP_LABELS } from '../data/taco';
import { normalize } from '../lib/dietParser';
import { useFoods } from '../lib/store';
import type { Food } from '../types';
import { Input } from './ui';

/** Busca de alimentos com filtro por nome (sem acentos). */
export function FoodPicker({ onPick, autoFocus }: { onPick: (food: Food) => void; autoFocus?: boolean }) {
  const foods = useFoods();
  const [query, setQuery] = useState('');
  const results = useMemo(() => {
    const words = normalize(query).split(' ').filter(Boolean);
    if (words.length === 0) return foods.slice(0, 30);
    return foods.filter((f) => {
      const n = normalize(f.name);
      return words.every((w) => n.includes(w));
    }).slice(0, 30);
  }, [foods, query]);

  return (
    <div>
      <div className="relative">
        <Search size={16} className="pointer-events-none absolute top-2.5 left-3 text-slate-400" />
        <Input
          autoFocus={autoFocus}
          className="pl-9"
          placeholder="Buscar alimento (ex.: arroz integral)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      <ul className="mt-2 max-h-72 divide-y divide-slate-100 overflow-y-auto rounded-lg border border-slate-200">
        {results.map((f) => (
          <li key={f.id}>
            <button
              type="button"
              className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-brand-50"
              onClick={() => onPick(f)}
            >
              <span>
                <span className="text-slate-800">{f.name}</span>
                <span className="block text-xs text-slate-400">
                  {FOOD_GROUP_LABELS[f.group]} · {f.source}
                </span>
              </span>
              <span className="shrink-0 text-xs text-slate-500">
                {Math.round(f.kcal)} kcal · C {f.carbs} · P {f.protein} · G {f.fat}
              </span>
            </button>
          </li>
        ))}
        {results.length === 0 && <li className="px-3 py-4 text-center text-sm text-slate-500">Nenhum alimento encontrado.</li>}
      </ul>
      <p className="mt-1 text-xs text-slate-400">Valores por 100 g.</p>
    </div>
  );
}
