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
