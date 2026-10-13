import type { Food } from '../types';

// Converte um plano alimentar em texto livre em refeições e itens.
// Formato aceito (flexível):
//   Café da manhã - 07:00
//   - 2 fatias de pão integral
//   - 1 col. sopa de requeijão
//   - 150ml de leite desnatado
//   Almoço (12h30)
//   100g arroz integral

export interface ParsedItem {
  raw: string;
  amount: number;
  /** Rótulo de medida caseira do alimento, ou '' para gramas. */
  measure: string;
  food?: Food;
  /** Texto do alimento como escrito, para revisão manual. */
  foodText: string;
}

export interface ParsedMeal {
  name: string;
  time: string;
  items: ParsedItem[];
}

const MEAL_KEYWORDS = [
  'café da manhã',
  'cafe da manha',
  'desjejum',
  'colação',
  'colacao',
  'lanche',
  'almoço',
  'almoco',
  'jantar',
  'ceia',
  'pré-treino',
  'pre-treino',
  'pré treino',
  'pre treino',
  'pós-treino',
  'pos-treino',
  'pós treino',
  'pos treino',
  'refeição',
  'refeicao',
];

/** Sinônimos de medidas → palavra-chave para casar com o rótulo do alimento. */
const MEASURE_ALIASES: [RegExp, string][] = [
  [/^(colheres|colher|col\.?|c\.)\s*(de\s+)?(sopa|sp)\b/, 'colher de sopa'],
  [/^(colheres|colher|col\.?|c\.)\s*(de\s+)?(sobremesa)\b/, 'colher de sobremesa'],
  [/^(colheres|colher|col\.?|c\.)\s*(de\s+)?(chá|cha)\b/, 'colher de chá'],
  [/^(colheres|colher|col\.?)\s*(de\s+)?servir\b/, 'colher de servir'],
  [/^(escumadeiras?)\b/, 'escumadeira'],
  [/^(conchas?)\b/, 'concha'],
  [/^(fatias?)\b/, 'fatia'],
  [/^(unidades?|und?\.?|un)\b/, 'unidade'],
  [/^(scoops?|medidores?)\b/, 'scoop'],
  [/^(xícaras?|xicaras?|xic\.?)\b/, 'xícara'],
  [/^(copos?)\b/, 'copo'],
  [/^(potes?)\b/, 'pote'],
  [/^(filés?|files?)\b/, 'filé'],
  [/^(bifes?)\b/, 'bife'],
  [/^(pedaços?|pedacos?)\b/, 'pedaço'],
  [/^(pontas?\s+de\s+faca)\b/, 'ponta de faca'],
  [/^(folhas?)\b/, 'folha'],
  [/^(ramos?)\b/, 'ramo'],
];

const NUMBER_WORDS: Record<string, number> = {
  meia: 0.5,
  meio: 0.5,
  um: 1,
  uma: 1,
  dois: 2,
  duas: 2,
  tres: 3,
  três: 3,
  quatro: 4,
  cinco: 5,
};

const STOPWORDS = new Set(['de', 'da', 'do', 'das', 'dos', 'com', 'sem', 'e', 'a', 'o', 'em', 'tipo', 'ou']);

export function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9.,/\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokens(s: string): string[] {
  return normalize(s)
    .split(/[\s,/-]+/)
    .map((t) => t.replace(/s$/, '')) // plural simples
    .filter((t) => t.length > 1 && !STOPWORDS.has(t));
}

/** Melhor alimento para o texto, por sobreposição de palavras. */
export function matchFood(text: string, foods: Food[]): Food | undefined {
  const query = tokens(text);
  if (query.length === 0) return undefined;
  let best: Food | undefined;
  let bestScore = 0;
  for (const food of foods) {
    const name = new Set(tokens(food.name));
    let hits = 0;
    for (const q of query) if (name.has(q)) hits++;
    if (hits === 0) continue;
    // Prioriza cobertura da consulta; desempata por nome mais curto.
    const score = hits / query.length + hits / (name.size * 10);
    if (score > bestScore) {
      bestScore = score;
      best = food;
    }
  }
  // Exige que a primeira palavra (normalmente o alimento) apareça no nome.
  if (best && !tokens(best.name).includes(query[0]!)) {
    return bestScore >= 0.5 ? best : undefined;
  }
  return best;
}

function parseTime(line: string): string {
  const m = line.match(/(\d{1,2})\s*(?:h|:)\s*(\d{2})?/i);
  if (!m) return '';
  const h = Number(m[1]);
  if (h > 23) return '';
  return `${String(h).padStart(2, '0')}:${m[2] ?? '00'}`;
}

function isMealHeader(line: string): boolean {
  const n = normalize(line).replace(/[:\-–()]/g, ' ');
  if (/^\d/.test(n) && !/^\d{1,2}\s*(h|:)/.test(n)) return false;
  return MEAL_KEYWORDS.some((k) => n.includes(normalize(k))) && n.split(/\s+/).filter(Boolean).length <= 6;
}

function cleanMealName(line: string): string {
  return line
    .replace(/[-–(]?\s*\d{1,2}\s*(?:h|:)\s*\d{0,2}\s*\)?/gi, '')
    .replace(/[:\-–()]+$/g, '')
    .replace(/[:]/g, '')
    .trim();
}

export function parseItemLine(line: string, foods: Food[]): ParsedItem | undefined {
  let rest = line.replace(/^\s*([-*•·]|\d+[.)])\s+/, '').trim();
  if (!rest) return undefined;
  const raw = rest;

  // Quantidade numérica (2, 1,5, 1/2) ou por extenso.
  let amount = 1;
  const num = rest.match(/^(\d+(?:[.,]\d+)?)(?:\s*\/\s*(\d+))?/);
  if (num) {
    amount = Number(num[1]!.replace(',', '.'));
    if (num[2]) amount = amount / Number(num[2]);
    rest = rest.slice(num[0].length).trim();
  } else {
    const word = normalize(rest).split(' ')[0] ?? '';
    if (word in NUMBER_WORDS) {
      amount = NUMBER_WORDS[word]!;
      rest = rest.slice(rest.indexOf(' ') + 1).trim();
    }
  }

  // Unidades de massa/volume → gramas.
  let grams: number | undefined;
  const unit = rest.match(/^(kg|g|gr|gramas?|ml|l)\b\.?\s*/i);
  if (unit) {
    const u = unit[1]!.toLowerCase();
    grams = u === 'kg' || u === 'l' ? amount * 1000 : amount;
    rest = rest.slice(unit[0].length);
  }

  // Medida caseira.
  let measureKey = '';
  if (grams === undefined) {
    const n = normalize(rest);
    for (const [re, key] of MEASURE_ALIASES) {
      const mm = n.match(re);
      if (mm) {
        measureKey = key;
        rest = rest.slice(mm[0].length);
        break;
      }
    }
  }

  const foodText = rest
    .replace(/^\s*(de|da|do)\s+/i, '')
    .replace(/\(.*?\)/g, '')
    .trim();
  const food = matchFood(foodText, foods);

  if (grams !== undefined) return { raw, amount: grams, measure: '', food, foodText };

  if (food) {
    const key = normalize(measureKey || 'unidade');
    const measure = food.measures.find((x) => normalize(x.label).startsWith(key)) ??
      (measureKey ? undefined : food.measures[0]);
    if (measure) return { raw, amount, measure: measure.label, food, foodText };
  }
  // Sem medida conhecida: mantém a quantidade como gramas para revisão.
  return { raw, amount, measure: '', food, foodText };
}

export function parseDietText(text: string, foods: Food[]): ParsedMeal[] {
  const meals: ParsedMeal[] = [];
  let current: ParsedMeal | undefined;
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;
    if (isMealHeader(line)) {
      current = { name: cleanMealName(line) || 'Refeição', time: parseTime(line), items: [] };
      meals.push(current);
      continue;
    }
    // Opções alternativas ("ou ...") não entram no cálculo.
    if (/^ou\b/i.test(line)) continue;
    const item = parseItemLine(line, foods);
    if (!item) continue;
    if (!current) {
      current = { name: 'Refeição', time: '', items: [] };
      meals.push(current);
    }
    current.items.push(item);
  }
  return meals;
}
