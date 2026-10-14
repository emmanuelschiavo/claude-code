---
name: novo-paciente
description: Cadastra um paciente novo no cofre do Seu NutriAI a partir de uma descrição em texto livre e calcula as necessidades pelo objetivo. Use quando o nutricionista disser algo como "paciente novo", "cadastra a Maria", "chegou um paciente" ou colar dados de anamnese.
---

# Novo paciente

Delegue ao agente `nutri-estagiario` quando possível. Passo a passo:

1. **Extraia os dados** da mensagem: nome, sexo, nascimento ou idade, telefone, e-mail, objetivo, peso, altura, % de gordura (se tiver bioimpedância), cintura, quadril e tudo de anamnese (patologias, medicamentos, alergias, rotina, atividade física com frequência semanal, sono, intestino, água, álcool/tabaco, preferências, aversões, recordatório).
2. **Faltou algo essencial?** (nome, sexo, idade/nascimento, peso, altura, objetivo) Pergunte tudo de uma vez antes de criar a nota.
3. **Confira se já existe** uma nota com esse nome em `{{PASTA}}/`. Se existir, atualize essa nota em vez de criar outra.
4. **Crie a nota** `{{PASTA}}/<Nome Completo>.md` a partir de `Modelos/Paciente - Seu NutriAI.md`:
   - não escreva `id`;
   - `status: ativo`;
   - números com ponto decimal (`72.5`);
   - deixe `objetivo_tipo` e `atividade` vazios, a menos que o nutricionista diga explicitamente.
5. **Calcule**: `{{NUTRI}} calcular "{{PASTA}}/<Nome Completo>.md"`.
6. **Cardápio**: só se o nutricionista pedir. Nesse caso use a skill `montar-cardapio`.
7. **Responda** em até 8 linhas: dados registrados, VET e macros (g e g/kg), alertas do estagiário, pendências. Diga que o paciente já entrou no app com o selo "Estagiário: revisar".
