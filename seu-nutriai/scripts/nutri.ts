/**
 * CLI do Seu NutriAI para o agente estagiário no terminal do Obsidian.
 * Usa exatamente os mesmos cálculos do app.
 *
 *   npm run -s nutri -- calcular <nota.md>     calcula e grava a seção "Cálculos" na nota
 *   npm run -s nutri -- validar <nota.md>      confere o plano alimentar contra as metas
 *   npm run -s nutri -- alimentos <termo...>   busca alimentos (nomes exatos e medidas)
 *   npm run -s nutri -- modelo                 imprime o modelo de nota de paciente
 *
 * Caminhos relativos são resolvidos a partir da pasta onde o comando foi chamado.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { TACO_FOODS } from '../src/data/taco';
import { itemGrams, itemNutrients } from '../src/lib/diet';
import { normalize, parseDietText } from '../src/lib/dietParser';
import { num } from '../src/lib/format';
import { applyIntern } from '../src/lib/intern';
import { fiberReference } from '../src/lib/micros';
import { extractEditable, parseNote, patientFromNote, renderNote } from '../src/lib/obsidian/note';
import { patientMetrics } from '../src/lib/patientMetrics';
import type { Patient } from '../src/types';

process.stdout.on('error', () => process.exit(0)); // ex.: saída cortada por `head`

const index = new Map(TACO_FOODS.map((f) => [f.id, f]));
const lookup = (id: string) => index.get(id);
const cwd = process.env.INIT_CWD ?? process.cwd();
const today = new Date().toISOString().slice(0, 10);

function fail(msg: string): never {
  console.error(msg);
  process.exit(1);
}

function loadPatient(file: string): { path: string; text: string; patient: Patient } {
  const path = resolve(cwd, file);
  let text: string;
  try {
    text = readFileSync(path, 'utf8');
  } catch {
    fail(`Não encontrei a nota: ${path}`);
  }
  const note = parseNote(text);
  if (!note.frontmatter.nome) fail('A nota precisa de "nome:" no topo (frontmatter).');
  const { patient } = patientFromNote(note, TACO_FOODS, today, note.frontmatter.id || undefined);
  return { path, text, patient };
}

/** Recorta uma seção "## Título" de uma nota renderizada. */
function section(md: string, title: string): string {
  const start = md.indexOf(`## ${title}`);
  if (start < 0) return '';
  const next = md.indexOf('\n## ', start + 3);
  return md.slice(start, next < 0 ? undefined : next).trim();
}

function calcular(file: string) {
  const { path, text, patient } = loadPatient(file);
  const withPlan = applyIntern(patient, 'obsidian-novo');
  const m = patientMetrics(withPlan);
  const calc = section(renderNote(withPlan, { foods: TACO_FOODS, lookup, consultations: [] }, new Date().toISOString()), 'Cálculos').replace(
    '_Gerado pelo Seu NutriAI. Para alterar, use o app._',
    '_Prévia do estagiário no terminal. O app refaz este cálculo ao importar a nota._',
  );
  const updated = /^## Cálculos/m.test(text)
    ? text.replace(/## Cálculos[\s\S]*?(?=\n## |$)/, `${calc}\n`)
    : text.replace(/\n## Plano alimentar/, `\n${calc}\n\n## Plano alimentar`).replace(/^(?![\s\S]*## Cálculos)([\s\S]*)$/, `$1\n\n${calc}\n`);
  writeFileSync(path, updated);

  console.log(`Paciente: ${withPlan.name} · ${m.age} anos · ${withPlan.sex === 'F' ? 'feminino' : 'masculino'}`);
  if (!m.energy?.vet || !m.targets || !m.weight) {
    console.log(`Não foi possível calcular: ${withPlan.intern?.alerts.join(' ') ?? 'faltam dados.'}`);
    process.exit(2);
  }
  console.log(`VET: ${num(m.energy.vet, 0)} kcal · CHO ${num(m.targets.grams.carbs, 0)} g · PTN ${num(m.targets.grams.protein, 0)} g · LIP ${num(m.targets.grams.fat, 0)} g`);
  console.log('\nJustificativas:');
  for (const n of withPlan.intern?.notes ?? []) console.log(`- ${n}`);
  if (withPlan.intern?.alerts.length) {
    console.log('\nConferir:');
    for (const a of withPlan.intern.alerts) console.log(`- ${a}`);
  }
  console.log(`\nSeção "Cálculos" gravada em ${path}`);
}

function validar(file: string) {
  const { text, patient } = loadPatient(file);
  const withPlan = applyIntern(patient, 'obsidian-novo');
  const m = patientMetrics(withPlan);
  const plano = extractEditable(parseNote(text)).plano ?? '';
  const meals = parseDietText(plano, TACO_FOODS);
  if (meals.length === 0) fail('A nota não tem itens na seção "## Plano alimentar".');

  let unknown = 0;
  const tot = { kcal: 0, carbs: 0, protein: 0, fat: 0, fiber: 0 };
  for (const meal of meals) {
    console.log(`\n${meal.time || '--:--'} ${meal.name}`);
    for (const it of meal.items) {
      if (!it.food) {
        unknown++;
        console.log(`  ✗ NÃO RECONHECIDO: "${it.raw}"  → use "npm run -s nutri -- alimentos <termo>" e copie o nome exato`);
        continue;
      }
      const item = { id: '', foodId: it.food.id, amount: it.amount, measure: it.measure };
      const n = itemNutrients(item, lookup);
      for (const k of Object.keys(tot) as (keyof typeof tot)[]) tot[k] += n[k];
      const measureWarn = !it.measure && it.amount < 5 ? '  (atenção: quantidade lida como gramas)' : '';
      console.log(`  ✓ ${num(it.amount, 2)} ${it.measure || 'g'} ${it.food.name} = ${num(itemGrams(item, it.food), 0)} g · ${num(n.kcal, 0)} kcal${measureWarn}`);
    }
  }
  console.log(`\nTotal: ${num(tot.kcal, 0)} kcal · CHO ${num(tot.carbs, 0)} g · PTN ${num(tot.protein, 0)} g · LIP ${num(tot.fat, 0)} g · fibras ${num(tot.fiber, 0)} g`);
  if (m.energy?.vet && m.targets) {
    const row = (label: string, actual: number, target: number) => {
      const pct = (actual / target) * 100;
      const ok = pct >= 90 && pct <= 110;
      console.log(`  ${ok ? '✓' : '!'} ${label}: ${num(actual, 0)} de ${num(target, 0)} (${num(pct, 0)}%)${ok ? '' : ' → ajustar para ficar entre 90% e 110%'}`);
      return ok;
    };
    console.log('\nAdequação às metas:');
    const ok = [
      row('Energia (kcal)', tot.kcal, m.energy.vet),
      row('Carboidratos (g)', tot.carbs, m.targets.grams.carbs),
      row('Proteínas (g)', tot.protein, m.targets.grams.protein),
      row('Lipídios (g)', tot.fat, m.targets.grams.fat),
    ].every(Boolean);
    console.log(`  ${tot.fiber >= fiberReference(withPlan.sex, m.age) ? '✓' : '!'} Fibras: ${num(tot.fiber, 0)} g (meta ${fiberReference(withPlan.sex, m.age)} g)`);
    if (unknown || !ok) process.exitCode = 1;
  } else if (unknown) process.exitCode = 1;
}

function alimentos(terms: string[]) {
  const all = terms.includes('--todos');
  const words = normalize(terms.filter((t) => t !== '--todos').join(' ')).split(' ').filter(Boolean);
  if (words.length === 0) fail('Informe um termo. Ex.: npm run -s nutri -- alimentos frango');
  const found = TACO_FOODS.filter((f) => words.every((w) => normalize(f.name).includes(w)))
    .filter((f) => all || f.measures.length > 0 || words.length > 1)
    .sort((a, b) => b.measures.length - a.measures.length || a.name.length - b.name.length)
    .slice(0, 25);
  if (found.length === 0) {
    console.log(all ? 'Nada encontrado.' : 'Nada com medida caseira. Tente com --todos para buscar na TACO inteira.');
    return;
  }
  for (const f of found) {
    const measures = f.measures.map((m) => `${m.label} = ${num(m.grams)} g`).join('; ');
    console.log(`${f.name}\n   100 g: ${num(f.kcal, 0)} kcal · C ${num(f.carbs)} · P ${num(f.protein)} · G ${num(f.fat)} · fibra ${num(f.fiber)}${measures ? `\n   medidas: ${measures}` : ''}`);
  }
}

const MODELO = `---
tipo: paciente
nome: Nome Completo
nascimento: 1990-05-20
sexo: F
telefone:
email:
objetivo: Emagrecimento com preservação de massa magra
objetivo_tipo:
atividade:
status: ativo
peso: 70
altura: 165
gordura:
cintura:
quadril:
---

# Nome Completo

## Anamnese
### Patologias e queixas
### Medicamentos
### Histórico familiar
### Alergias e intolerâncias
### Rotina
### Atividade física
### Sono
### Intestino
### Ingestão hídrica
### Álcool e tabagismo
### Preferências
### Aversões
### Recordatório 24 h

## Plano alimentar
### Café da manhã - 07:00
- 2 fatia de Pão, trigo, forma, integral

## Orientações

## Observações
`;

const [cmd, ...args] = process.argv.slice(2);
switch (cmd) {
  case 'calcular':
    calcular(args[0] ?? fail('Uso: calcular <nota.md>'));
    break;
  case 'validar':
    validar(args[0] ?? fail('Uso: validar <nota.md>'));
    break;
  case 'alimentos':
    alimentos(args);
    break;
  case 'modelo':
    process.stdout.write(MODELO);
    break;
  default:
    console.log('Comandos: calcular <nota.md> · validar <nota.md> · alimentos <termo> [--todos] · modelo');
}
