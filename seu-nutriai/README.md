# Seu NutriAI — área do nutricionista

Gestão de pacientes, avaliação física, gasto energético, prescrição dietética, substituições e relatórios em PDF.
React 19 + TypeScript + Vite + Tailwind CSS 4 + Recharts + jsPDF. Os dados ficam no LocalStorage do navegador.

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # testes dos cálculos, do banco de alimentos e do importador
npm run build
```

## Módulos

| Tela | O que faz |
|---|---|
| Painel | Pacientes, consultas e receita do mês, próximas consultas, pacientes recentes |
| Pacientes | Cadastro, busca e status |
| Anamnese | Histórico clínico, hábitos, recordatório 24 h (salvamento automático) |
| Antropometria | Protocolo escolhido a cada avaliação: Pollock 3 ou 7 dobras, Durnin & Womersley, Faulkner ou bioimpedância; Siri ou Brozek; IMC (OMS / Lipschitz para idosos), % gordura com classificação de Lohman, massa gorda e magra, risco pela cintura, RCQ, RCEst, CMB e peso-meta |
| Evolução | Gráficos de peso, % gordura, composição e circunferências; relatório em PDF |
| Gasto energético | Harris-Benedict, Mifflin-St Jeor, FAO/OMS, Cunningham, Katch-McArdle, Tinsley (peso e massa magra), Ten Haaf, DRI/IOM e kcal/kg; FA, ETA, déficit/superávit; macros em g/kg, % VET ou "restante do VET" |
| Plano alimentar | Refeições, medidas caseiras, Prescrito × Teórico com ajuste direto, micronutrientes × DRI, importador de texto, PDF com substituições, suplementos e lista de compras |
| Substituições | Calculadora de equivalências (kcal ou macro principal) e lista de trocas do plano |
| Suplementação | Compostos, dose, forma, horário e justificativa |
| Lista de compras | Ingredientes do plano por setor, para 7/14/30 dias |
| Agenda e financeiro | Consultas, pagamentos, recebido × a receber |
| Banco de alimentos | TACO 4ª ed. completa (597 itens, com micronutrientes) + itens USDA/rótulo + alimentos personalizados |
| Configurações | Perfil profissional (aparece nos PDFs), conexão com o Obsidian e backup em JSON |

## Obsidian e agente estagiário

O app sincroniza os pacientes com uma pasta do seu cofre do Obsidian (Chrome ou Edge, app rodando localmente):

1. Instale o kit no cofre: `npm run obsidian:instalar -- "/caminho/do/cofre"` (agente `nutri-estagiario`, skills `novo-paciente` e `montar-cardapio`, modelo de nota). Não sobrescreve arquivos existentes.
2. No app: Configurações → Obsidian → "Escolher pasta do cofre".
3. No terminal, dentro do cofre, peça ao Claude Code: "Paciente nova: …". O agente cria a nota em `Pacientes/`, o app importa em segundos e o estagiário calcula TMB, GET, VET e macros pelo objetivo, com alertas para você revisar.

Cada paciente vira `Pacientes/<Nome>.md`; a cópia completa fica em `Pacientes/.seu-nutriai/`. Edições no topo da nota, na Anamnese, no Plano alimentar, nas Orientações e nas Observações voltam para o app. `recalcular: sim` pede um novo cálculo.

CLI com os mesmos cálculos do app: `npm run -s nutri -- calcular|validar <nota.md>`, `alimentos <termo>`, `modelo`.

## Banco de alimentos

`src/data/taco.generated.ts` é gerado a partir dos CSVs da Tabela TACO (repositório
[raulfdm/taco-api](https://github.com/raulfdm/taco-api), pasta `references/csv`):

```bash
python3 scripts/build_taco.py <pasta com food.csv e nutrients.csv>
```

As medidas caseiras e os IDs estáveis dos alimentos mais usados ficam no próprio script.

## Estrutura

```
src/
  types.ts              modelo de dados
  data/                 TACO, itens complementares e dados de exemplo
  lib/store.ts          estado reativo + StorageAdapter (troque por uma API sem mexer na UI)
  lib/anthropometry.ts  IMC, protocolos de dobras, Siri/Brozek, classificações
  lib/energy.ts         TMB/GET/VET e metas de macros
  lib/micros.ts         micronutrientes e referências DRI
  lib/diet.ts           somatório nutricional e medidas caseiras
  lib/substitutions.ts  motor de equivalências
  lib/dietParser.ts     importador de cardápios em texto
  lib/pdf.ts            PDFs do plano alimentar e da evolução
  views/                telas; views/tabs/ = abas do prontuário
```

Ainda não incluído: portal do paciente (planejado para depois).
