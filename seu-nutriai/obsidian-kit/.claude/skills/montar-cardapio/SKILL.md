---
name: montar-cardapio
description: Monta ou ajusta o rascunho de plano alimentar de um paciente do Seu NutriAI dentro das metas calculadas, com alimentos da TACO e medidas caseiras. Use quando o nutricionista pedir "monta o cardápio", "ajusta a dieta", "troca o jantar" ou similar.
---

# Montar cardápio

1. **Leia a nota do paciente** em `{{PASTA}}/`: metas da seção "Cálculos", anamnese (alergias, aversões, preferências, rotina, horário de treino, patologias) e o plano atual, se houver. Sem seção "Cálculos", rode `{{NUTRI}} calcular "<nota>"` primeiro.
2. **Distribua o VET** pelas refeições conforme a rotina. Referência: café 20–25%, almoço 30–35%, lanches 10–15% cada, jantar 20–25%. Coloque proteína em todas as refeições principais e carboidrato antes e depois do treino.
3. **Escolha alimentos comuns e acessíveis** e consulte os nomes exatos e as medidas com `{{NUTRI}} alimentos <termo>`. Prefira itens com medida caseira.
4. **Escreva a seção `## Plano alimentar`** no formato exato:
   ```
   ### Café da manhã - 07:00
   - 2 fatia de Pão, trigo, forma, integral
   - 120 g de Frango, peito, sem pele, grelhado
   Obs.: pode trocar o pão por 3 colheres de sopa de tapioca
   ```
5. **Valide**: `{{NUTRI}} validar "<nota>"`. Ajuste as quantidades até tudo ficar entre 90% e 110% (energia, carboidratos, proteínas, lipídios) e sem itens "NÃO RECONHECIDO". Repita no máximo 5 vezes; se não fechar, explique o que impede.
6. **Orientações**: na seção `## Orientações`, escreva 3 a 6 orientações práticas para o paciente (água, preparo, mastigação, como usar as substituições).
7. **Responda** com o total validado (kcal e macros), as escolhas principais e o que o nutricionista deve conferir. O app importa o plano sozinho em alguns segundos.

Nunca troque alimentos por itens que a anamnese aponta como alergia ou aversão.
