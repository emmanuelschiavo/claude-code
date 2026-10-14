import { newPatient } from '../../data/seed';
import type { ActivityLevel, Anamnesis, Assessment, Consultation, DietPlan, Food, GoalType, Patient, PatientStatus, Sex } from '../../types';
import { evaluateAssessment, latestAssessment } from '../anthropometry';
import { describeItem, dietNutrients, mealNutrients, type FoodLookup } from '../diet';
import { normalize, parseDietText, toMeals } from '../dietParser';
import { FORMULA_LABELS, waterGoalMl } from '../energy';
import { date, dateTime, num } from '../format';
import { ACTIVITY_LABELS, GOAL_LABELS } from '../intern';
import { patientMetrics } from '../patientMetrics';

// Nota de paciente no Obsidian. Frontmatter e as seções Anamnese, Plano
// alimentar, Orientações e Observações são editáveis e voltam para o app; as
// demais seções são geradas pelo app a cada sincronização.

export interface NoteContext {
  foods: Food[];
  lookup: FoodLookup;
  consultations: Consultation[];
}

export interface ParsedNote {
  frontmatter: Record<string, string>;
  /** Corpo de cada seção "## Título", com o título normalizado como chave. */
  sections: Record<string, string>;
}

/** Campos editáveis, chave → valor textual (comparados para detectar edições). */
export type EditableFields = Record<string, string>;

export const ANAMNESIS_HEADINGS: [keyof Omit<Anamnesis, 'updatedAt'>, string][] = [
  ['pathologies', 'Patologias e queixas'],
  ['medications', 'Medicamentos'],
  ['familyHistory', 'Histórico familiar'],
  ['allergies', 'Alergias e intolerâncias'],
  ['routine', 'Rotina'],
  ['physicalActivity', 'Atividade física'],
  ['sleep', 'Sono'],
  ['bowel', 'Intestino'],
  ['waterIntake', 'Ingestão hídrica'],
  ['alcoholSmoking', 'Álcool e tabagismo'],
  ['preferences', 'Preferências'],
  ['aversions', 'Aversões'],
  ['recall24h', 'Recordatório 24 h'],
];

const EDITABLE_SECTIONS = { anamnese: 'Anamnese', plano: 'Plano alimentar', orientacoes: 'Orientações', observacoes: 'Observações' } as const;

/** Chaves de frontmatter que o app entende. */
export const FM_KEYS = [
  'nome',
  'nascimento',
  'idade',
  'sexo',
  'telefone',
  'email',
  'objetivo',
  'objetivo_tipo',
  'atividade',
  'status',
  'peso',
  'altura',
  'gordura',
  'cintura',
  'quadril',
  'gordura_alvo',
  'data_avaliacao',
] as const;

const key = (s: string) => normalize(s).replace(/[^a-z0-9]+/g, ' ').trim();

// ---------------------------------------------------------------------------
// Leitura
// ---------------------------------------------------------------------------

function unquote(v: string): string {
  const t = v.trim();
  if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) {
    return t.slice(1, -1).replace(/\\"/g, '"');
  }
  return t;
}

export function parseNote(md: string): ParsedNote {
  const text = md.replace(/\r\n/g, '\n');
  const frontmatter: Record<string, string> = {};
  let body = text;
  const fm = text.match(/^---\n([\s\S]*?)\n---\n?/);
  if (fm) {
    body = text.slice(fm[0].length);
    for (const line of fm[1]!.split('\n')) {
      const m = line.match(/^([A-Za-zÀ-ú_][\wÀ-ú-]*)\s*:\s*(.*)$/);
      if (m) frontmatter[key(m[1]!).replace(/ /g, '_')] = unquote(m[2]!);
    }
  }
  const sections: Record<string, string> = {};
  let current: string | undefined;
  let buf: string[] = [];
  const flush = () => {
    if (current !== undefined) sections[current] = buf.join('\n').trim();
  };
  for (const line of body.split('\n')) {
    const h = line.match(/^##\s+(.+?)\s*$/);
    if (h && !line.startsWith('###')) {
      flush();
      current = key(h[1]!);
      buf = [];
    } else if (current !== undefined) {
      buf.push(line);
    }
  }
  flush();
  return { frontmatter, sections };
}

function subsections(body: string): Record<string, string> {
  const out: Record<string, string> = {};
  let current: string | undefined;
  let buf: string[] = [];
  const flush = () => {
    if (current !== undefined) out[current] = buf.join('\n').trim();
  };
  for (const line of body.split('\n')) {
    const h = line.match(/^###\s+(.+?)\s*$/);
    if (h) {
      flush();
      current = key(h[1]!);
      buf = [];
    } else if (current !== undefined) buf.push(line);
  }
  flush();
  return out;
}

/** Remove a linha de ajuda em itálico que o app escreve no topo das seções editáveis. */
function stripHint(s: string): string {
  return s.replace(/^_[^\n]*_\s*\n?/, '').trim();
}

export function extractEditable(note: ParsedNote): EditableFields {
  const out: EditableFields = {};
  for (const k of FM_KEYS) if (note.frontmatter[k] !== undefined) out[`fm:${k}`] = note.frontmatter[k]!.trim();
  if (note.frontmatter.recalcular !== undefined) out['fm:recalcular'] = note.frontmatter.recalcular.trim();
  const anam = note.sections[key(EDITABLE_SECTIONS.anamnese)];
  if (anam !== undefined) {
    const subs = subsections(anam);
    for (const [field, label] of ANAMNESIS_HEADINGS) {
      const v = subs[key(label)];
      if (v !== undefined) out[`anamnese:${field}`] = v === '—' ? '' : v;
    }
  }
  for (const [k, title] of Object.entries(EDITABLE_SECTIONS)) {
    if (k === 'anamnese') continue;
    const v = note.sections[key(title)];
    if (v !== undefined) out[k] = stripHint(v);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Aplicação das edições
// ---------------------------------------------------------------------------

function parseNumber(v: string | undefined): number | undefined {
  if (!v) return undefined;
  const n = Number(v.replace(',', '.').replace(/[^\d.-]/g, ''));
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

function parseDate(v: string | undefined): string | undefined {
  if (!v) return undefined;
  const t = v.trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(t)) return t.slice(0, 10);
  const br = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (br) return `${br[3]}-${br[2]!.padStart(2, '0')}-${br[1]!.padStart(2, '0')}`;
  return undefined;
}

function parseSex(v: string): Sex | undefined {
  const t = normalize(v);
  if (/^(f|fem|feminino|mulher)/.test(t)) return 'F';
  if (/^(m|masc|masculino|homem)/.test(t)) return 'M';
  return undefined;
}

const GOAL_TYPES: GoalType[] = ['emagrecimento', 'hipertrofia', 'recomposicao', 'manutencao', 'saude'];
const ACTIVITY_LEVELS: ActivityLevel[] = ['sedentario', 'leve', 'moderado', 'intenso', 'atleta'];

function parseEnum<T extends string>(v: string, values: T[]): T | undefined {
  const t = normalize(v).replace(/[^a-z]/g, '');
  return values.find((x) => t.startsWith(x.slice(0, 5)));
}

function parseStatus(v: string): PatientStatus | undefined {
  const t = normalize(v);
  if (t.startsWith('ativ') || t.includes('acompanh')) return 'ativo';
  if (t.startsWith('alta')) return 'alta';
  if (t.startsWith('inativ')) return 'inativo';
  return undefined;
}

export interface ApplyResult {
  patient: Patient;
  changes: string[];
  /** O frontmatter pediu recálculo do estagiário. */
  recalc: boolean;
}

/** Aplica os campos editados no Obsidian ao paciente. */
export function applyEditable(p: Patient, fields: EditableFields, foods: Food[], today: string): ApplyResult {
  const changes: string[] = [];
  let next: Patient = { ...p, anamnesis: { ...p.anamnesis }, diet: { ...p.diet } };
  const f = (k: string) => fields[`fm:${k}`];

  if (f('nome')?.trim()) next.name = f('nome')!.trim();
  const birth = parseDate(f('nascimento'));
  if (birth) next.birthDate = birth;
  else if (parseNumber(f('idade'))) next.birthDate = `${Number(today.slice(0, 4)) - Math.round(parseNumber(f('idade'))!)}-01-01`;
  if (f('sexo') !== undefined) next.sex = parseSex(f('sexo')!) ?? next.sex;
  if (f('telefone') !== undefined) next.phone = f('telefone')!;
  if (f('email') !== undefined) next.email = f('email')!;
  if (f('objetivo') !== undefined) next.goal = f('objetivo')!;
  if (f('objetivo_tipo') !== undefined) next.goalType = parseEnum(f('objetivo_tipo')!, GOAL_TYPES);
  if (f('atividade') !== undefined) next.activityLevel = parseEnum(f('atividade')!, ACTIVITY_LEVELS);
  if (f('status') !== undefined) next.status = parseStatus(f('status')!) ?? next.status;
  if (f('gordura_alvo') !== undefined) next.targetFatPercent = parseNumber(f('gordura_alvo'));
  for (const k of ['nome', 'nascimento', 'idade', 'sexo', 'telefone', 'email', 'objetivo', 'objetivo_tipo', 'atividade', 'status', 'gordura_alvo'])
    if (f(k) !== undefined) changes.push(`dados (${k})`);

  // Medidas no frontmatter viram (ou atualizam) a avaliação da data informada.
  const measures = { peso: parseNumber(f('peso')), altura: parseNumber(f('altura')), gordura: parseNumber(f('gordura')), cintura: parseNumber(f('cintura')), quadril: parseNumber(f('quadril')) };
  if (Object.values(measures).some((v) => v !== undefined)) {
    const day = parseDate(f('data_avaliacao')) ?? today;
    const last = latestAssessment(next.assessments);
    const existing = next.assessments.find((a) => a.date === day);
    const baseA: Assessment = existing ?? {
      id: crypto.randomUUID(),
      date: day,
      weight: last?.weight ?? 0,
      height: last?.height ?? 0,
      method: 'nenhum',
      skinfolds: {},
      circumferences: {},
      notes: 'Registrada pelo Obsidian',
    };
    const a: Assessment = {
      ...baseA,
      weight: measures.peso ?? baseA.weight,
      height: measures.altura ?? baseA.height,
      circumferences: { ...baseA.circumferences, waist: measures.cintura ?? baseA.circumferences.waist, hip: measures.quadril ?? baseA.circumferences.hip },
    };
    if (measures.gordura !== undefined) {
      a.method = 'bioimpedancia';
      a.bioFatPercent = measures.gordura;
    }
    next.assessments = existing ? next.assessments.map((x) => (x.id === a.id ? a : x)) : [...next.assessments, a];
    changes.push(existing ? `avaliação de ${date(day)} atualizada` : `nova avaliação em ${date(day)}`);
  }

  for (const [field] of ANAMNESIS_HEADINGS) {
    const v = fields[`anamnese:${field}`];
    if (v !== undefined) {
      next.anamnesis[field] = v;
      next.anamnesis.updatedAt = new Date().toISOString();
      if (!changes.includes('anamnese')) changes.push('anamnese');
    }
  }
  if (fields.plano !== undefined) {
    next.diet = { ...next.diet, meals: toMeals(parseDietText(fields.plano, foods)), updatedAt: new Date().toISOString() };
    changes.push('plano alimentar');
  }
  if (fields.orientacoes !== undefined) {
    next.diet = { ...next.diet, guidelines: fields.orientacoes };
    changes.push('orientações');
  }
  if (fields.observacoes !== undefined) {
    next.notes = fields.observacoes;
    changes.push('observações');
  }
  const recalc = /^(sim|s|true|1|yes)$/i.test((fields['fm:recalcular'] ?? '').trim());
  if (recalc) changes.push('pedido de recálculo');
  return { patient: next, changes, recalc };
}

/** Cria um paciente a partir de uma nota escrita no Obsidian (ex.: pelo agente estagiário). */
export function patientFromNote(note: ParsedNote, foods: Food[], today: string, id?: string): ApplyResult {
  const base = newPatient({ id: id ?? crypto.randomUUID(), diet: { meals: [], guidelines: '' } });
  return applyEditable(base, extractEditable(note), foods, today);
}

// ---------------------------------------------------------------------------
// Escrita
// ---------------------------------------------------------------------------

function yaml(v: string | number | undefined): string {
  if (v === undefined || v === '') return '';
  if (typeof v === 'number') return String(Number(v.toFixed(2)));
  return /^[\w .@+()À-ú-]*$/.test(v) && !/^\d/.test(v) ? v : JSON.stringify(v);
}

export function dietToText(diet: DietPlan, lookup: FoodLookup): string {
  const out: string[] = [];
  for (const meal of diet.meals) {
    out.push(`### ${meal.name}${meal.time ? ` - ${meal.time}` : ''}`);
    for (const it of meal.items) {
      const food = lookup(it.foodId);
      if (!food) continue;
      const qty = Number.isInteger(it.amount) ? String(it.amount) : String(Number(it.amount.toFixed(2)));
      out.push(`- ${qty} ${it.measure || 'g'} de ${food.name}`);
    }
    if (meal.notes) out.push(`Obs.: ${meal.notes}`);
    out.push('');
  }
  return out.join('\n').trim();
}

/** Nome de arquivo seguro para a nota. */
export function noteFileName(p: Patient): string {
  const safe = p.name.replace(/[\\/:*?"<>|#^[\]]/g, ' ').replace(/\s+/g, ' ').trim() || 'Paciente';
  return `${safe}.md`;
}

export function renderNote(p: Patient, ctx: NoteContext, now: string): string {
  const m = patientMetrics(p);
  const last = m.latest;
  const r = m.result;
  const fm: [string, string | number | undefined][] = [
    ['tipo', 'paciente'],
    ['id', p.id],
    ['nome', p.name],
    ['nascimento', p.birthDate],
    ['sexo', p.sex],
    ['telefone', p.phone],
    ['email', p.email],
    ['objetivo', p.goal],
    ['objetivo_tipo', p.goalType],
    ['atividade', p.activityLevel],
    ['status', p.status],
    ['peso', last?.weight],
    ['altura', last?.height],
    ['gordura', r?.fatPercent !== undefined ? Number(r.fatPercent.toFixed(1)) : undefined],
    ['cintura', last?.circumferences.waist],
    ['quadril', last?.circumferences.hip],
    ['gordura_alvo', p.targetFatPercent],
    ['data_avaliacao', last?.date],
    ['vet', m.energy?.vet !== undefined ? Math.round(m.energy.vet) : undefined],
    ['recalcular', 'não'],
    ['atualizado_em', now.slice(0, 16).replace('T', ' ')],
    ['tags', 'paciente'],
  ];
  const lines: string[] = ['---', ...fm.map(([k, v]) => `${k}: ${yaml(v)}`), '---', '', `# ${p.name}`, ''];

  const gen = '_Gerado pelo Seu NutriAI. Para alterar, use o app._';
  const edit = '_Editável: o que você mudar aqui volta para o app._';

  // Resumo
  lines.push('## Resumo', gen, '');
  lines.push('| | |', '|---|---|');
  lines.push(`| Idade | ${m.age} anos · ${p.sex === 'F' ? 'feminino' : 'masculino'} |`);
  lines.push(`| Objetivo | ${p.goal || '—'}${p.goalType ? ` (${GOAL_LABELS[p.goalType]})` : ''} |`);
  if (p.activityLevel) lines.push(`| Atividade | ${ACTIVITY_LABELS[p.activityLevel]} |`);
  if (last) {
    lines.push(`| Peso / altura | ${num(last.weight)} kg · ${num(last.height, 0)} cm (${date(last.date)}) |`);
    lines.push(`| IMC | ${num(r?.bmi)} kg/m² · ${r?.bmiClass ?? '—'} |`);
    if (r?.fatPercent !== undefined) lines.push(`| Gordura | ${num(r.fatPercent)}% · ${r.fatClass} · MM ${num(r.leanMass)} kg |`);
  }
  if (m.energy?.vet !== undefined) lines.push(`| VET | ${num(m.energy.vet, 0)} kcal/dia |`);
  lines.push('');

  // Anamnese
  lines.push('## Anamnese', edit, '');
  for (const [field, label] of ANAMNESIS_HEADINGS) lines.push(`### ${label}`, p.anamnesis[field]?.trim() || '—', '');

  // Avaliações
  lines.push('## Avaliações', gen, '');
  const list = [...p.assessments].sort((a, b) => b.date.localeCompare(a.date));
  if (list.length === 0) lines.push('Nenhuma avaliação. Informe `peso` e `altura` no topo da nota para registrar uma.', '');
  else {
    lines.push('| Data | Peso | IMC | % G | M. magra | Cintura |', '|---|---|---|---|---|---|');
    for (const a of list) {
      const e = evaluateAssessment(a, p.sex, p.birthDate, p.targetFatPercent);
      lines.push(`| ${date(a.date)} | ${num(a.weight)} kg | ${num(e.bmi)} | ${num(e.fatPercent)} | ${e.leanMass !== undefined ? `${num(e.leanMass)} kg` : '—'} | ${a.circumferences.waist ? `${num(a.circumferences.waist)} cm` : '—'} |`);
    }
    lines.push('');
  }

  // Cálculos
  lines.push('## Cálculos', gen, '');
  if (m.energy?.vet !== undefined && m.targets && m.weight) {
    const t = m.targets;
    lines.push(`- Fórmula: ${FORMULA_LABELS[p.energy.formula]}`);
    lines.push(`- TMB ${num(m.energy.bmr, 0)} kcal · GET ${num(m.energy.get, 0)} kcal · VET **${num(m.energy.vet, 0)} kcal**`);
    lines.push(
      `- Carboidratos ${num(t.grams.carbs, 0)} g (${num(t.grams.carbs / m.weight, 1)} g/kg) · Proteínas ${num(t.grams.protein, 0)} g (${num(t.grams.protein / m.weight, 1)} g/kg) · Lipídios ${num(t.grams.fat, 0)} g (${num(t.grams.fat / m.weight, 1)} g/kg)`,
    );
    if (last) lines.push(`- Água: ${num(waterGoalMl(last.weight) / 1000, 1)} L/dia`);
  } else lines.push(m.energy?.missing ?? 'Registre peso e altura para calcular.');
  lines.push('');
  if (p.intern) {
    lines.push(`### Estagiário · ${dateTime(p.intern.generatedAt.slice(0, 16))} · ${p.intern.reviewed ? 'revisado' : 'aguardando sua revisão'}`);
    for (const n of p.intern.notes) lines.push(`- ${n}`);
    if (p.intern.alerts.length) {
      lines.push('', '> [!warning] Conferir');
      for (const a of p.intern.alerts) lines.push(`> - ${a}`);
    }
    lines.push('');
  }

  // Plano alimentar
  const totals = dietNutrients(p.diet, ctx.lookup);
  lines.push('## Plano alimentar', `_Editável. Formato: "### Refeição - HH:MM" e uma linha por alimento ("- 2 fatia de Pão, trigo, forma, integral" ou "- 120 g de ..."). Total atual: ${num(totals.kcal, 0)} kcal._`, '');
  lines.push(dietToText(p.diet, ctx.lookup) || '', '');

  lines.push('## Orientações', edit, '', p.diet.guidelines.trim(), '');

  // Suplementação
  lines.push('## Suplementação', gen, '');
  if (p.supplements.length === 0) lines.push('Nenhum suplemento prescrito.', '');
  else {
    for (const s of p.supplements) lines.push(`- **${s.name}** — ${s.dose} (${s.form}) · ${s.timing}${s.justification ? ` · ${s.justification}` : ''}`);
    lines.push('');
  }

  // Consultas
  const cons = ctx.consultations.filter((c) => c.patientId === p.id).sort((a, b) => b.date.localeCompare(a.date));
  lines.push('## Consultas', gen, '');
  if (cons.length === 0) lines.push('Nenhuma consulta registrada.', '');
  else {
    for (const c of cons) lines.push(`- ${dateTime(c.date)} · ${c.type === 'primeira' ? '1ª consulta' : c.type === 'online' ? 'online' : 'retorno'} · ${c.paymentStatus}`);
    lines.push('');
  }

  lines.push('## Observações', edit, '', p.notes.trim(), '');
  return lines.join('\n').replace(/\n{3,}/g, '\n\n');
}

/** Detalhe de cada refeição para relatórios em texto (usado pela CLI). */
export function mealSummary(p: Patient, lookup: FoodLookup): string[] {
  return p.diet.meals.map((meal) => {
    const n = mealNutrients(meal, lookup);
    const items = meal.items.map((it) => `${describeItem(it, lookup(it.foodId))} ${lookup(it.foodId)?.name ?? '?'}`).join('; ');
    return `${meal.time || '--:--'} ${meal.name}: ${num(n.kcal, 0)} kcal (C ${num(n.carbs, 0)} · P ${num(n.protein, 0)} · G ${num(n.fat, 0)}) — ${items}`;
  });
}
