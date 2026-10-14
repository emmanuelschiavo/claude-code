import type { Food, FoodGroup, HouseholdMeasure, MarketSector } from '../types';
import { TACO_ROWS } from './taco.generated';

// Banco de alimentos: Tabela TACO 4ª ed. completa (NEPA/UNICAMP, 597 itens),
// gerada por scripts/build_taco.py, mais alguns itens comuns que a TACO não
// tem, com valores do USDA FoodData Central ou de rótulos (marcados na fonte).

export type TacoRow = [
  id: string,
  name: string,
  group: FoodGroup,
  sector: MarketSector,
  kcal: number,
  carbs: number,
  protein: number,
  fat: number,
  fiber: number,
  sodium: number,
  calcium: number,
  iron: number,
  potassium: number,
  magnesium: number,
  zinc: number,
  vitaminC: number,
  vitaminA: number,
  measures: [string, number][],
];

const m = (label: string, grams: number): HouseholdMeasure => ({ label, grams });

function fromRow(r: TacoRow): Food {
  const [id, name, group, sector, kcal, carbs, protein, fat, fiber, sodium, calcium, iron, potassium, magnesium, zinc, vitaminC, vitaminA, measures] = r;
  return {
    id,
    name,
    group,
    sector,
    source: 'TACO',
    kcal,
    carbs,
    protein,
    fat,
    fiber,
    micros: { sodium, calcium, iron, potassium, magnesium, zinc, vitaminC, vitaminA },
    measures: measures.map(([label, grams]) => m(label, grams)),
  };
}

type Extra = Omit<Food, 'micros'>;

/** Itens fora da TACO, por 100 g. */
const EXTRAS: Extra[] = [
  { id: 'whey-concentrado', name: 'Whey protein concentrado (média de rótulos)', group: 'suplementos', sector: 'outros', source: 'Rótulo', kcal: 400, carbs: 8, protein: 80, fat: 6, fiber: 0, measures: [m('scoop', 30)] },
  { id: 'whey-isolado', name: 'Whey protein isolado (média de rótulos)', group: 'suplementos', sector: 'outros', source: 'Rótulo', kcal: 370, carbs: 3, protein: 87, fat: 1, fiber: 0, measures: [m('scoop', 30)] },
  { id: 'usda-chia', name: 'Chia, semente', group: 'gorduras', sector: 'mercearia', source: 'USDA', kcal: 486, carbs: 42.1, protein: 16.5, fat: 30.7, fiber: 34.4, measures: [m('colher de sopa', 12)] },
  { id: 'usda-quinoa-cozida', name: 'Quinoa, cozida', group: 'cereais', sector: 'mercearia', source: 'USDA', kcal: 120, carbs: 21.3, protein: 4.4, fat: 1.9, fiber: 2.8, measures: [m('colher de sopa', 20)] },
  { id: 'usda-pasta-amendoim', name: 'Pasta de amendoim, integral', group: 'gorduras', sector: 'mercearia', source: 'USDA', kcal: 588, carbs: 20, protein: 25.1, fat: 50.4, fiber: 6, measures: [m('colher de sopa', 15), m('colher de chá', 5)] },
  { id: 'usda-tilapia', name: 'Tilápia, filé, grelhado', group: 'proteinas', sector: 'acougue', source: 'USDA', kcal: 128, carbs: 0, protein: 26.2, fat: 2.7, fiber: 0, measures: [m('filé médio', 100)] },
  { id: 'usda-grao-bico-cozido', name: 'Grão-de-bico, cozido', group: 'leguminosas', sector: 'mercearia', source: 'USDA', kcal: 164, carbs: 27.4, protein: 8.9, fat: 2.6, fiber: 7.6, measures: [m('colher de sopa', 22), m('concha média', 86)] },
  { id: 'usda-macarrao-cozido', name: 'Macarrão, trigo, cozido', group: 'cereais', sector: 'mercearia', source: 'USDA', kcal: 158, carbs: 30.9, protein: 5.8, fat: 0.9, fiber: 1.8, measures: [m('pegador', 110), m('colher de sopa', 25)] },
  { id: 'usda-iogurte-grego-desnatado', name: 'Iogurte grego natural, desnatado', group: 'laticinios', sector: 'laticinios', source: 'USDA', kcal: 59, carbs: 3.6, protein: 10.2, fat: 0.4, fiber: 0, measures: [m('pote', 100)] },
  { id: 'usda-chocolate-70', name: 'Chocolate amargo 70–85% cacau', group: 'acucares', sector: 'mercearia', source: 'USDA', kcal: 598, carbs: 45.9, protein: 7.8, fat: 42.6, fiber: 10.9, measures: [m('quadrado', 5), m('barra pequena', 25)] },
];

export const TACO_FOODS: Food[] = [...TACO_ROWS.map(fromRow), ...EXTRAS];

export const FOOD_GROUP_LABELS: Record<FoodGroup, string> = {
  cereais: 'Cereais, pães e tubérculos',
  leguminosas: 'Leguminosas',
  proteinas: 'Carnes, peixes e ovos',
  laticinios: 'Leite e derivados',
  frutas: 'Frutas',
  vegetais: 'Verduras e legumes',
  gorduras: 'Óleos, gorduras e oleaginosas',
  acucares: 'Açúcares e doces',
  bebidas: 'Bebidas',
  preparacoes: 'Preparações',
  outros: 'Outros',
  suplementos: 'Suplementos',
};

export const SECTOR_LABELS: Record<MarketSector, string> = {
  hortifruti: 'Hortifrúti',
  acougue: 'Açougue, peixaria e ovos',
  laticinios: 'Frios e laticínios',
  mercearia: 'Mercearia',
  padaria: 'Padaria',
  outros: 'Outros',
};
