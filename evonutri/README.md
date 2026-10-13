# EvoNutri — área do nutricionista

Gestão de pacientes, avaliação física, gasto energético, prescrição dietética e substituições.
React 19 + TypeScript + Vite + Tailwind CSS 4 + lucide-react + Recharts. Os dados ficam no LocalStorage.

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # testes dos cálculos e do importador
npm run build
```

## Módulos

| Tela | O que faz |
|---|---|
| Painel | Pacientes ativos, consultas e receita do mês, próximas consultas |
| Pacientes | Cadastro, busca e status |
| Prontuário → Anamnese | Histórico clínico, hábitos, recordatório 24 h (salvamento automático) |
| Prontuário → Antropometria | Pollock 3 e 7 dobras (Siri), bioimpedância, IMC, MG/MM, RCQ |
| Prontuário → Evolução | Gráficos de peso, % gordura, composição e circunferências |
| Prontuário → Gasto energético | Harris-Benedict, Mifflin-St Jeor, Cunningham, Katch-McArdle, DRI/IOM; FA, ETA, déficit/superávit; macros em g/kg ou % VET |
| Prontuário → Plano alimentar | Refeições, medidas caseiras, tabela Prescrito × Teórico com ajuste direto, importador de texto, impressão/PDF |
| Prontuário → Substituições | Calculadora de equivalências (kcal ou macro principal) e lista de trocas do plano |
| Prontuário → Suplementação | Compostos, dose, forma, horário e justificativa |
| Prontuário → Lista de compras | Ingredientes do plano agrupados por setor, para 7/14/30 dias |
| Agenda e financeiro | Consultas, pagamentos, recebido × a receber |
| Alimentos | Base TACO (4ª ed.) e alimentos personalizados com medidas caseiras |
| Configurações | Backup/restauração em JSON |

## Estrutura

```
src/
  types.ts              modelo de dados
  data/taco.ts          alimentos (por 100 g) e medidas caseiras
  data/seed.ts          paciente de exemplo e valores padrão
  lib/store.ts          estado reativo + StorageAdapter (troque por uma API sem mexer na UI)
  lib/anthropometry.ts  IMC, Pollock, Siri
  lib/energy.ts         TMB/GET/VET e metas de macros
  lib/diet.ts           somatório nutricional e conversão de medidas
  lib/substitutions.ts  motor de equivalências
  lib/dietParser.ts     importador de cardápios em texto
  views/                telas; views/tabs/ = abas do prontuário
```

Ainda não incluído: portal do paciente (planejado para depois).
