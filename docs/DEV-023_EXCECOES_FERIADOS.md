# DEV-023 — Exceções e feriados (proposta inicial)
**Estado:** em andamento. Critérios DEV-005 v1.0 aprovam escopo, não homologação operacional ou clínica.

## Evidência e fronteira
- **Documentado no Piloto:** DEV-021 fornece grade e DEV-022 configura janelas semanais por profissional/sala, com início inclusivo e fim exclusivo. A disponibilidade regular não equivale a exceção.
- **Backlog/cronograma original:** DEV-023 prevê datas substitutas e bloqueios com precedência clara; ainda marca 'Planejado' e não é fonte do progresso real.
- **Proposta não confirmada no WebUltra:** feriado ativo da unidade fecha todas as janelas no dia, inclusive substituições. Uma substituição específica do profissional remove as janelas regulares do dia e as substitui; bloqueios da unidade ou do profissional são subtraídos depois. Não existe liberação implícita de feriado.
- **Teste implementado:** `scripts/dev023_excecoes.cjs` resolve janelas em memória sem pacientes, persistência, API ou acesso ao WebUltra. `scripts/dev023_excecoes.test.cjs` exercita isolamento, datas, feriados, precedência e sobreposições.
- **Não implementado:** gravação de exceções/feriados, permissões/MFA e auditoria, RLS, integração com a grade, concorrência, UI e teste de navegador. Não usar a função pura como fonte de disponibilidade em produção.

## Critérios a validar
1. Quem pode criar e liberar feriados; exigir MFA e vínculo ativo de gestão/administração, com auditoria transacional.
2. Se o feriado é sempre bloqueante ou admite liberação excepcional aprovada, e quem autoriza.
3. Se exceções são por profissional, sala e/ou unidade; como resolver duas substituições no mesmo dia.
4. O que acontece com compromissos já reservados ao inserir bloqueio: não cancelar ou alterar silenciosamente.
5. Datas civis e fuso São Paulo; mudanças de horário e exceções em intervalos atravessando a meia-noite.

**Próximo passo:** projetar esquema e handlers transacionais com bloqueio e isolamento por unidade, integrar à grade DEV-021/022, validar em PostgreSQL descartável e navegador, obter revisão operacional. Não concluir DEV-023 sem esses itens.

## Leitura SQL incremental — 06/11/2026

- A migração `database/dev023_excecoes_feriados.sql` agora expõe `public.piloto_ler_excecoes_agenda(unidade, profissional, de, ate, correlacao)`, limitada a 31 dias, com autenticação e trilha de leitura reaproveitadas de DEV-021.
- O retorno JSON contém apenas feriados e intervalos de exceção; não contém nomes ou documentos de pacientes.
- A política RLS foi ampliada para permitir que médicos vinculados vejam bloqueios gerais da própria unidade, sem permissão de escrita. Médicos continuam limitados às exceções de seus profissionais e bloqueios gerais; recepção e gestão podem consultar a unidade conforme autorização.
- A função **não altera a disponibilidade da grade** e **não salva exceções**: integração ao cálculo da grade, testes reais de RLS e serviço transacional de escrita permanecem pendentes.
- Quatro verificações estáticas adicionais foram escritas, mas não foram executadas nesta sessão. A precedência de feriados permanece proposta não homologada.

## Revisão de 07/11/2026 — isolamento da projeção
- Adicionado `strictBookingScope: true` ao adaptador sintético `projectDay`: reservas sem unidade, profissional e data válidos agora são rejeitadas explicitamente nesse modo. O comportamento legado sem escopo permanece para testes anteriores e **não deve ser usado como integração operacional**.
- Quatro testes de regressão adicionados (ausência de escopo, escopo parcial, reserva correspondente e reserva de outra unidade). Commits `03a0e13` e `60a3dc6`.
- Consulta de GitHub Actions: os dois workflows do commit anterior `63d7813` estavam concluídos com sucesso; os workflows do novo commit ainda não tinham conclusão verificada no momento da consulta. Os testes novos não foram executados localmente nesta sessão.
- **Pendente:** ativar modo estrito em integração real, conectar a grade ao PostgreSQL, validar RLS/transações/concorrência e obter decisão operacional sobre feriados. Nenhuma homologação clínica inferida.
