#!/usr/bin/env node
// Instala no cofre do Obsidian o agente estagiário, as skills e o modelo de nota.
//
//   npm run obsidian:instalar -- "/caminho/do/cofre" [--pasta Pacientes] [--forcar]
//
// Não sobrescreve arquivos existentes, a não ser com --forcar.
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const app = resolve(here, '..');
const kit = join(app, 'obsidian-kit');

const args = process.argv.slice(2);
const force = args.includes('--forcar');
const folderIdx = args.indexOf('--pasta');
const folder = folderIdx >= 0 ? args[folderIdx + 1] : 'Pacientes';
const vaultArg = args.find((a, i) => !a.startsWith('--') && (folderIdx < 0 || i !== folderIdx + 1));

if (!vaultArg) {
  console.error('Uso: npm run obsidian:instalar -- "/caminho/do/cofre" [--pasta Pacientes] [--forcar]');
  process.exit(1);
}
const vault = resolve(process.env.INIT_CWD ?? process.cwd(), vaultArg);
if (!existsSync(vault) || !statSync(vault).isDirectory()) {
  console.error(`Pasta do cofre não encontrada: ${vault}`);
  process.exit(1);
}
if (!existsSync(join(vault, '.obsidian'))) console.warn('Aviso: não achei ".obsidian" nessa pasta. Confirme que é a raiz do cofre.');

const nutri = `npm --prefix "${app}" run -s nutri --`;
const replace = (text) => text.replaceAll('{{NUTRI}}', nutri).replaceAll('{{PASTA}}', folder);

function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)]));
}

let created = 0;
let skipped = 0;
for (const src of walk(kit)) {
  const rel = relative(kit, src);
  const dest = join(vault, rel);
  if (existsSync(dest) && !force) {
    console.log(`  já existe, mantido: ${rel}`);
    skipped++;
    continue;
  }
  mkdirSync(dirname(dest), { recursive: true });
  if (src.endsWith('.md')) writeFileSync(dest, replace(readFileSync(src, 'utf8')));
  else cpSync(src, dest);
  console.log(`  instalado: ${rel}`);
  created++;
}
mkdirSync(join(vault, folder), { recursive: true });

console.log(`
Pronto: ${created} arquivo(s) instalado(s), ${skipped} mantido(s).

No app (Chrome ou Edge): Configurações → Obsidian → "Escolher pasta do cofre" → selecione ${vault}
e use a pasta "${folder}".

No terminal, dentro do cofre, abra o Claude Code e diga, por exemplo:
  "Paciente nova: Juliana Prado, 29 anos, 72 kg, 1,63 m, quer emagrecer 6 kg, musculação 4x/semana, resistência à insulina."
O agente nutri-estagiario cria a nota, calcula, e a paciente aparece no app em poucos segundos.`);
