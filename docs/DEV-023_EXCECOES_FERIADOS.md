# DEV-023 — Exceções e feriados

Em **Agenda → Exceções e feriados**, gestão e administração escolhem uma data e cadastram um feriado da unidade, um bloqueio de horário ou um horário substituto. A operação exige MFA e vínculo ativo na unidade. A grade e sua API exibem as exceções dentro do mesmo escopo de acesso dos horários.

## Precedência

1. Um feriado ativo fecha a disponibilidade da unidade no dia inteiro. **Liberar dia** reabre os horários que as demais regras permitem.
2. Um horário substituto troca as janelas do profissional naquela data e indica a sala. Cada profissional pode ter um horário substituto ativo por dia. O banco bloqueia conflito de sala com outro horário substituto ou com uma disponibilidade semanal de outro profissional.
3. Bloqueios da unidade e do profissional retiram intervalos dos horários disponíveis. O horário final **24:00** representa o início do dia seguinte.
4. Compromissos existentes permanecem visíveis. O sistema rejeita mudanças que afetem reservas pendentes e impede novas reservas ou remarcações em horários indisponíveis. Para retirar um horário substituto, resolva os compromissos pendentes daquele profissional e data.

A consulta usa o fuso de São Paulo. É possível consultar datas passadas. O cadastro e a retirada de exceções começam no dia corrente. Retirar um registro o desativa e conserva a trilha de auditoria.

## Ambiente de teste

Aplique `database/dev023_excecoes_feriados.sql` após DEV-022. As operações de escrita compartilham uma revisão transacional por unidade para coordenar a criação de exceções com reservas e com regras semanais concorrentes. Uma transação obsoleta deve ser repetida após conferir a grade.

A precedência descrita foi adotada para o Piloto e testada com dados fictícios. A homologação operacional com a clínica e a implantação no Supabase hospedado seguem pendentes. A próxima tarefa é **DEV-024 — Motor de cotas**.
