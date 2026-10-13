import { jsPDF } from 'jspdf';
import { autoTable, type RowInput } from 'jspdf-autotable';
import { SECTOR_LABELS } from '../data/taco';
import type { Food, MarketSector, Patient, ProfessionalProfile } from '../types';
import { evaluateAssessment, isSkinfoldMethod, PROTOCOLS, SKINFOLD_LABELS } from './anthropometry';
import { dietNutrients, itemGrams, mealNutrients } from './diet';
import { date, num, todayIso } from './format';
import { patientMetrics } from './patientMetrics';
import { findEquivalents, practicalGrams } from './substitutions';

// PDFs com a identidade Seu NutriAI. Fontes padrão do PDF (Helvetica) cobrem
// Latin-1; caracteres fora disso são trocados em `t()`.

const C = {
  ink: [10, 33, 28] as const, // brand-950
  brand: [25, 86, 70] as const, // brand-700
  brandSoft: [238, 247, 243] as const, // brand-50
  gold: [184, 146, 90] as const, // gold-500
  text: [34, 44, 41] as const,
  muted: [102, 116, 110] as const,
  line: [223, 229, 226] as const,
  amber: [217, 119, 6] as const,
  sky: [2, 132, 199] as const,
};

const PAGE = { w: 210, h: 297, margin: 16 };

function t(s: string): string {
  return s
    .replace(/[–—]/g, '-')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/…/g, '...')
    .replace(/≈/g, '~')
    .replace(/≥/g, '>=')
    .replace(/≤/g, '<=')
    .replace(/[^\u0000-ÿ]/g, '');
}

type Doc = jsPDF & { lastAutoTable?: { finalY: number } };

function finalY(doc: Doc, fallback: number): number {
  return doc.lastAutoTable?.finalY ?? fallback;
}

function header(doc: Doc, title: string, patient: Patient, profile: ProfessionalProfile) {
  doc.setFillColor(...C.ink);
  doc.rect(0, 0, PAGE.w, 30, 'F');
  // Marca
  doc.setFillColor(...C.gold);
  doc.roundedRect(PAGE.margin, 9, 12, 12, 3, 3, 'F');
  // Folha: dois triângulos formando um losango inclinado
  const lx = PAGE.margin;
  doc.setFillColor(...C.ink);
  doc.triangle(lx + 3, 18.5, lx + 9.5, 11.5, lx + 7.5, 17, 'F');
  doc.triangle(lx + 3, 18.5, lx + 9.5, 11.5, lx + 4.5, 13, 'F');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(15);
  doc.setTextColor(255, 255, 255);
  doc.text('Seu ', PAGE.margin + 16, 17.5);
  const seuW = doc.getTextWidth('Seu ');
  doc.setFont('helvetica', 'bold');
  doc.text('Nutri', PAGE.margin + 16 + seuW, 17.5);
  doc.setTextColor(...C.gold);
  doc.text('AI', PAGE.margin + 16 + seuW + doc.getTextWidth('Nutri'), 17.5);

  // Profissional
  const right = PAGE.w - PAGE.margin;
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'bold');
  doc.text(t(profile.name || 'Nutricionista'), right, 13, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(172, 216, 198);
  const lines = [profile.crn && `CRN ${profile.crn}`, profile.clinic, [profile.phone, profile.instagram].filter(Boolean).join('  ·  ')].filter(Boolean) as string[];
  lines.forEach((l, i) => doc.text(t(l), right, 17.5 + i * 3.8, { align: 'right' }));

  // Título e paciente
  doc.setTextColor(...C.gold);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text(t(title.toUpperCase()), PAGE.margin, 40, { charSpace: 0.6 });
  doc.setTextColor(...C.text);
  doc.setFontSize(18);
  doc.text(t(patient.name), PAGE.margin, 48);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...C.muted);
  const m = patientMetrics(patient);
  const info = [`${m.age} anos`, patient.sex === 'F' ? 'Feminino' : 'Masculino', patient.goal, `Emitido em ${date(todayIso())}`].filter(Boolean).join('   ·   ');
  doc.text(t(info), PAGE.margin, 54);
  doc.setDrawColor(...C.line);
  doc.line(PAGE.margin, 58, PAGE.w - PAGE.margin, 58);
}

function footers(doc: Doc, profile: ProfessionalProfile) {
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setDrawColor(...C.line);
    doc.line(PAGE.margin, PAGE.h - 13, PAGE.w - PAGE.margin, PAGE.h - 13);
    doc.setFontSize(7.5);
    doc.setTextColor(...C.muted);
    doc.setFont('helvetica', 'normal');
    const contact = [profile.email, profile.address].filter(Boolean).join('  ·  ');
    doc.text(t(contact || 'Seu NutriAI'), PAGE.margin, PAGE.h - 8);
    doc.text(`${i} / ${pages}`, PAGE.w - PAGE.margin, PAGE.h - 8, { align: 'right' });
  }
}

function ensureSpace(doc: Doc, y: number, needed: number): number {
  if (y + needed > PAGE.h - 20) {
    doc.addPage();
    return 20;
  }
  return y;
}

function sectionTitle(doc: Doc, y: number, text: string): number {
  y = ensureSpace(doc, y, 18);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(...C.ink);
  doc.text(t(text), PAGE.margin, y);
  doc.setFillColor(...C.gold);
  doc.rect(PAGE.margin, y + 1.8, 10, 0.8, 'F');
  return y + 7;
}

function paragraph(doc: Doc, y: number, text: string, size = 9.5): number {
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(size);
  doc.setTextColor(...C.text);
  const lines = doc.splitTextToSize(t(text), PAGE.w - PAGE.margin * 2) as string[];
  for (const line of lines) {
    y = ensureSpace(doc, y, 6);
    doc.text(line, PAGE.margin, y);
    y += size * 0.45;
  }
  return y + 2;
}

/** Faixa de indicadores (rótulo + valor). */
function metricStrip(doc: Doc, y: number, items: { label: string; value: string; sub?: string }[]): number {
  const w = (PAGE.w - PAGE.margin * 2) / items.length;
  doc.setFillColor(...C.brandSoft);
  doc.roundedRect(PAGE.margin, y, PAGE.w - PAGE.margin * 2, 19, 3, 3, 'F');
  items.forEach((it, i) => {
    const x = PAGE.margin + 5 + i * w;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...C.muted);
    doc.text(t(it.label.toUpperCase()), x, y + 6);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(...C.ink);
    doc.text(t(it.value), x, y + 12.5);
    if (it.sub) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(...C.brand);
      doc.text(t(it.sub), x, y + 16.5);
    }
  });
  return y + 26;
}

const tableBase = {
  theme: 'plain' as const,
  margin: { left: PAGE.margin, right: PAGE.margin },
  styles: { font: 'helvetica', fontSize: 9, textColor: C.text as unknown as [number, number, number], cellPadding: { top: 1.8, bottom: 1.8, left: 2, right: 2 } },
  headStyles: { fontStyle: 'bold' as const, fontSize: 7.5, textColor: C.muted as unknown as [number, number, number] },
};

function slug(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w\s-]/g, '').trim();
}

function fileName(kind: string, patient: Patient): string {
  return `${kind} - ${slug(patient.name)} - ${date(todayIso()).replace(/\//g, '-')}.pdf`;
}

/** Salva o PDF; dentro de um artefato do Claude usa a ponte de downloads quando existir. */
async function save(doc: Doc, name: string) {
  const bridge = (window as unknown as { claude?: { downloads?: { save?: (b: Blob, n: string) => Promise<unknown> } } }).claude?.downloads;
  if (bridge?.save) {
    await bridge.save(doc.output('blob'), name);
    return;
  }
  doc.save(name);
}

// ---------------------------------------------------------------------------
// Plano alimentar
// ---------------------------------------------------------------------------

export interface DietPdfOptions {
  macros: boolean;
  substitutions: boolean;
  supplements: boolean;
  guidelines: boolean;
  shopping: boolean;
}

export async function exportDietPdf(patient: Patient, profile: ProfessionalProfile, lookup: (id: string) => Food | undefined, foods: Food[], opts: DietPdfOptions) {
  const doc: Doc = new jsPDF({ unit: 'mm', format: 'a4' });
  header(doc, 'Plano alimentar', patient, profile);
  let y = 66;

  const totals = dietNutrients(patient.diet, lookup);
  if (opts.macros && totals.kcal > 0) {
    const pct = (g: number, k: number) => `${num(((g * k) / totals.kcal) * 100, 0)}%`;
    const m = patientMetrics(patient);
    y = metricStrip(doc, y, [
      { label: 'Energia', value: `${num(totals.kcal, 0)} kcal`, sub: m.weight ? `${num(totals.kcal / m.weight, 1)} kcal/kg` : undefined },
      { label: 'Carboidratos', value: `${num(totals.carbs, 0)} g`, sub: pct(totals.carbs, 4) },
      { label: 'Proteínas', value: `${num(totals.protein, 0)} g`, sub: m.weight ? `${pct(totals.protein, 4)} · ${num(totals.protein / m.weight, 1)} g/kg` : pct(totals.protein, 4) },
      { label: 'Lipídios', value: `${num(totals.fat, 0)} g`, sub: pct(totals.fat, 9) },
      { label: 'Fibras', value: `${num(totals.fiber, 0)} g` },
    ]);
  }

  for (const meal of patient.diet.meals) {
    if (meal.items.length === 0) continue;
    y = ensureSpace(doc, y, 30);
    // Faixa da refeição
    doc.setFillColor(...C.ink);
    doc.roundedRect(PAGE.margin, y, PAGE.w - PAGE.margin * 2, 9, 2, 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(...C.gold);
    doc.text(meal.time || '--:--', PAGE.margin + 4, y + 6.1);
    doc.setTextColor(255, 255, 255);
    doc.text(t(meal.name), PAGE.margin + 18, y + 6.1);
    if (opts.macros) {
      const mt = mealNutrients(meal, lookup);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(172, 216, 198);
      doc.text(t(`${num(mt.kcal, 0)} kcal  ·  C ${num(mt.carbs, 0)} g  ·  P ${num(mt.protein, 0)} g  ·  G ${num(mt.fat, 0)} g`), PAGE.w - PAGE.margin - 4, y + 6.1, { align: 'right' });
    }
    y += 11;

    const body: RowInput[] = meal.items.map((it) => {
      const food = lookup(it.foodId);
      const g = itemGrams(it, food);
      const qty = it.measure ? `${num(it.amount, 2)} ${it.measure}` : `${num(g, 0)} g`;
      return [t(food?.name ?? '—'), t(qty), it.measure ? `${num(g, 0)} g` : ''];
    });
    autoTable(doc, {
      ...tableBase,
      startY: y,
      head: [['ALIMENTO', 'QUANTIDADE', 'PESO']],
      body,
      columnStyles: { 0: { cellWidth: 100 }, 2: { halign: 'right', textColor: C.muted as unknown as [number, number, number] } },
      alternateRowStyles: { fillColor: [249, 251, 250] },
    });
    y = finalY(doc, y) + 2;

    if (meal.notes) {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8.5);
      doc.setTextColor(...C.muted);
      const lines = doc.splitTextToSize(t(`Obs.: ${meal.notes}`), PAGE.w - PAGE.margin * 2) as string[];
      y = ensureSpace(doc, y, lines.length * 4 + 2);
      doc.text(lines, PAGE.margin + 2, y + 3);
      y += lines.length * 4 + 2;
    }

    if (opts.substitutions) {
      const rows: RowInput[] = [];
      for (const it of meal.items) {
        const food = lookup(it.foodId);
        if (!food) continue;
        const g = itemGrams(it, food);
        const eq = findEquivalents(food, g, foods).slice(0, 4);
        if (eq.length === 0) continue;
        rows.push([t(`${num(g, 0)} g de ${food.name}`), t(eq.map((e) => `${e.food.name}: ${practicalGrams(e.grams)} g`).join('  |  '))]);
      }
      if (rows.length) {
        autoTable(doc, {
          ...tableBase,
          startY: y,
          head: [['PODE TROCAR', 'POR (QUANTIDADE EQUIVALENTE)']],
          body: rows,
          styles: { ...tableBase.styles, fontSize: 7.8, textColor: C.muted as unknown as [number, number, number] },
          headStyles: { ...tableBase.headStyles, textColor: C.gold as unknown as [number, number, number] },
          columnStyles: { 0: { cellWidth: 52, fontStyle: 'bold' } },
        });
        y = finalY(doc, y) + 2;
      }
    }
    y += 5;
  }

  if (opts.guidelines && patient.diet.guidelines.trim()) {
    y = sectionTitle(doc, y + 2, 'Orientações');
    y = paragraph(doc, y, patient.diet.guidelines);
  }

  if (opts.supplements && patient.supplements.length) {
    y = sectionTitle(doc, y + 4, 'Suplementação');
    autoTable(doc, {
      ...tableBase,
      startY: y,
      head: [['SUPLEMENTO', 'DOSE', 'FORMA', 'QUANDO TOMAR']],
      body: patient.supplements.map((s) => [t(s.name), t(s.dose), t(s.form), t(s.timing)]),
      alternateRowStyles: { fillColor: [249, 251, 250] },
    });
    y = finalY(doc, y) + 4;
  }

  if (opts.shopping) {
    const bySector = new Map<MarketSector, Map<string, { name: string; grams: number }>>();
    for (const meal of patient.diet.meals)
      for (const it of meal.items) {
        const food = lookup(it.foodId);
        if (!food) continue;
        const sector = bySector.get(food.sector) ?? new Map();
        const e = sector.get(food.id) ?? { name: food.name, grams: 0 };
        e.grams += itemGrams(it, food) * 7;
        sector.set(food.id, e);
        bySector.set(food.sector, sector);
      }
    if (bySector.size) {
      y = sectionTitle(doc, y + 4, 'Lista de compras (7 dias)');
      const rows: RowInput[] = [];
      for (const [sector, items] of bySector) {
        rows.push([{ content: t(SECTOR_LABELS[sector]), colSpan: 2, styles: { fontStyle: 'bold', textColor: C.brand as unknown as [number, number, number] } }]);
        for (const e of [...items.values()].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')))
          rows.push([t(`[  ]  ${e.name}`), e.grams >= 1000 ? `${num(e.grams / 1000, 2)} kg` : `${num(Math.ceil(e.grams / 10) * 10, 0)} g`]);
      }
      autoTable(doc, { ...tableBase, startY: y, body: rows, columnStyles: { 1: { halign: 'right' } } });
    }
  }

  footers(doc, profile);
  await save(doc, fileName('Plano alimentar', patient));
}

// ---------------------------------------------------------------------------
// Evolução / avaliação física
// ---------------------------------------------------------------------------

interface Series {
  label: string;
  color: readonly [number, number, number];
  values: (number | undefined)[];
}

function niceRange(values: number[]): [number, number] {
  let min = Math.min(...values);
  let max = Math.max(...values);
  if (min === max) {
    min -= 1;
    max += 1;
  }
  const pad = (max - min) * 0.15;
  return [Math.floor(min - pad), Math.ceil(max + pad)];
}

function lineChart(doc: Doc, x: number, y: number, w: number, h: number, title: string, labels: string[], series: Series[]) {
  doc.setDrawColor(...C.line);
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(x, y, w, h, 3, 3, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...C.ink);
  doc.text(t(title), x + 4, y + 6);

  const all = series.flatMap((s) => s.values.filter((v): v is number => v !== undefined));
  if (all.length === 0) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...C.muted);
    doc.text('Sem dados', x + w / 2, y + h / 2, { align: 'center' });
    return;
  }
  const [lo, hi] = niceRange(all);
  const px = x + 12;
  const py = y + 11;
  const pw = w - 18;
  const ph = h - 21;
  const sx = (i: number) => px + (labels.length === 1 ? pw / 2 : (i / (labels.length - 1)) * pw);
  const sy = (v: number) => py + ph - ((v - lo) / (hi - lo)) * ph;

  // Grade e eixo Y (3 linhas)
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  for (let i = 0; i <= 2; i++) {
    const v = lo + ((hi - lo) * i) / 2;
    const gy = sy(v);
    doc.setDrawColor(237, 241, 239);
    doc.line(px, gy, px + pw, gy);
    doc.setTextColor(...C.muted);
    doc.text(num(v, 1), px - 2, gy + 1, { align: 'right' });
  }
  // Eixo X
  const step = Math.ceil(labels.length / 6);
  labels.forEach((l, i) => {
    if (i % step === 0 || i === labels.length - 1) doc.text(l, sx(i), py + ph + 4.5, { align: 'center' });
  });

  for (const s of series) {
    doc.setDrawColor(...s.color);
    doc.setLineWidth(0.6);
    let prev: [number, number] | undefined;
    s.values.forEach((v, i) => {
      if (v === undefined) return;
      const pt: [number, number] = [sx(i), sy(v)];
      if (prev) doc.line(prev[0], prev[1], pt[0], pt[1]);
      prev = pt;
    });
    doc.setFillColor(...s.color);
    s.values.forEach((v, i) => v !== undefined && doc.circle(sx(i), sy(v), 0.9, 'F'));
    // Valor final destacado
    const lastIdx = s.values.map((v, i) => (v !== undefined ? i : -1)).filter((i) => i >= 0).pop();
    if (lastIdx !== undefined) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(...s.color);
      doc.text(num(s.values[lastIdx], 1), sx(lastIdx), sy(s.values[lastIdx]!) - 2, { align: 'center' });
    }
    doc.setLineWidth(0.2);
  }
  if (series.length > 1) {
    let lx = x + w - 4;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    for (const s of [...series].reverse()) {
      const tw = doc.getTextWidth(s.label);
      lx -= tw;
      doc.setTextColor(...C.muted);
      doc.text(t(s.label), lx, y + 6);
      doc.setFillColor(...s.color);
      doc.circle(lx - 2, y + 5.1, 1, 'F');
      lx -= 7;
    }
  }
}

export async function exportEvolutionPdf(patient: Patient, profile: ProfessionalProfile) {
  const doc: Doc = new jsPDF({ unit: 'mm', format: 'a4' });
  header(doc, 'Evolução e composição corporal', patient, profile);
  let y = 66;

  const list = [...patient.assessments].sort((a, b) => a.date.localeCompare(b.date));
  const evals = list.map((a) => ({ a, r: evaluateAssessment(a, patient.sex, patient.birthDate, patient.targetFatPercent) }));
  const first = evals[0];
  const last = evals[evals.length - 1];

  if (!first || !last) {
    paragraph(doc, y, 'Nenhuma avaliação registrada.');
    footers(doc, profile);
    await save(doc, fileName('Evolucao', patient));
    return;
  }

  const delta = (a?: number, b?: number, unit = '') =>
    a === undefined || b === undefined || evals.length < 2 ? undefined : `${b - a > 0 ? '+' : ''}${num(b - a, 1)}${unit} desde ${date(first.a.date)}`;

  y = metricStrip(doc, y, [
    { label: 'Peso', value: `${num(last.a.weight, 1)} kg`, sub: delta(first.a.weight, last.a.weight, ' kg') },
    { label: 'IMC', value: num(last.r.bmi, 1), sub: last.r.bmiClass },
    { label: '% Gordura', value: last.r.fatPercent !== undefined ? `${num(last.r.fatPercent, 1)}%` : '—', sub: delta(first.r.fatPercent, last.r.fatPercent, ' p.p.') ?? last.r.fatClass },
    { label: 'Massa magra', value: last.r.leanMass !== undefined ? `${num(last.r.leanMass, 1)} kg` : '—', sub: delta(first.r.leanMass, last.r.leanMass, ' kg') },
  ]);

  const labels = evals.map((e) => date(e.a.date).slice(0, 5));
  const cw = (PAGE.w - PAGE.margin * 2 - 6) / 2;
  const ch = 58;
  y = ensureSpace(doc, y, ch * 2 + 10);
  lineChart(doc, PAGE.margin, y, cw, ch, 'Peso (kg)', labels, [{ label: 'Peso', color: C.brand, values: evals.map((e) => e.a.weight) }]);
  lineChart(doc, PAGE.margin + cw + 6, y, cw, ch, 'Gordura corporal (%)', labels, [{ label: '% G', color: C.amber, values: evals.map((e) => e.r.fatPercent) }]);
  y += ch + 6;
  lineChart(doc, PAGE.margin, y, cw, ch, 'Composição (kg)', labels, [
    { label: 'Massa magra', color: C.sky, values: evals.map((e) => e.r.leanMass) },
    { label: 'Massa gorda', color: C.amber, values: evals.map((e) => e.r.fatMass) },
  ]);
  lineChart(doc, PAGE.margin + cw + 6, y, cw, ch, 'Circunferências (cm)', labels, [
    { label: 'Cintura', color: C.brand, values: evals.map((e) => e.a.circumferences.waist) },
    { label: 'Quadril', color: C.gold, values: evals.map((e) => e.a.circumferences.hip) },
  ]);
  y += ch + 10;

  y = sectionTitle(doc, y, 'Histórico de avaliações');
  autoTable(doc, {
    ...tableBase,
    startY: y,
    head: [['DATA', 'PESO', 'IMC', '% G', 'M. GORDA', 'M. MAGRA', 'CINTURA', 'RCQ', 'MÉTODO']],
    body: [...evals].reverse().map(({ a, r }) => [
      date(a.date),
      `${num(a.weight, 1)} kg`,
      num(r.bmi, 1),
      num(r.fatPercent, 1),
      r.fatMass !== undefined ? `${num(r.fatMass, 1)} kg` : '—',
      r.leanMass !== undefined ? `${num(r.leanMass, 1)} kg` : '—',
      a.circumferences.waist ? `${num(a.circumferences.waist, 1)} cm` : '—',
      num(r.waistHipRatio, 2),
      t(isSkinfoldMethod(a.method) ? PROTOCOLS[a.method].short : a.method === 'bioimpedancia' ? 'Bioimpedância' : 'Medidas'),
    ]),
    styles: { ...tableBase.styles, fontSize: 8.2 },
    alternateRowStyles: { fillColor: [249, 251, 250] },
  });
  y = finalY(doc, y) + 6;

  // Dobras cutâneas
  const foldKeys = (Object.keys(SKINFOLD_LABELS) as (keyof typeof SKINFOLD_LABELS)[]).filter((k) => evals.some((e) => e.a.skinfolds[k]));
  if (foldKeys.length) {
    y = sectionTitle(doc, y, 'Dobras cutâneas (mm)');
    autoTable(doc, {
      ...tableBase,
      startY: y,
      head: [['DATA', ...foldKeys.map((k) => t(SKINFOLD_LABELS[k].toUpperCase())), 'SOMA']],
      body: [...evals].reverse().map(({ a, r }) => [date(a.date), ...foldKeys.map((k) => num(a.skinfolds[k], 1)), num(r.skinfoldSum, 1)]),
      styles: { ...tableBase.styles, fontSize: 8 },
      alternateRowStyles: { fillColor: [249, 251, 250] },
    });
    y = finalY(doc, y) + 6;
  }

  // Interpretação da última avaliação
  y = sectionTitle(doc, y, 'Interpretação da última avaliação');
  const notes = [
    `IMC ${num(last.r.bmi, 1)} kg/m²: ${last.r.bmiClass}.`,
    last.r.fatPercent !== undefined && `Gordura corporal ${num(last.r.fatPercent, 1)}%: ${last.r.fatClass} (Lohman, 1992).`,
    last.r.waistRisk && `Circunferência da cintura: risco cardiometabólico ${last.r.waistRisk} (OMS).`,
    last.r.waistHeightRatio !== undefined && `Relação cintura/estatura ${num(last.r.waistHeightRatio, 2)} (${last.r.waistHeightRatio > 0.5 ? 'acima' : 'dentro'} do ponto de corte de 0,5).`,
    last.r.armMuscleCircumference !== undefined && `Circunferência muscular do braço: ${num(last.r.armMuscleCircumference, 1)} cm.`,
    last.r.targetWeight !== undefined && `Peso estimado para ${num(patient.targetFatPercent, 0)}% de gordura, mantendo a massa magra: ${num(last.r.targetWeight, 1)} kg.`,
    last.a.notes && `Observações: ${last.a.notes}`,
  ].filter(Boolean) as string[];
  for (const n of notes) y = paragraph(doc, y, `•  ${n}`, 9);

  footers(doc, profile);
  await save(doc, fileName('Evolucao', patient));
}

