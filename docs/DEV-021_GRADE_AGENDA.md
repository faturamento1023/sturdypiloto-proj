# DEV-021 — Grade de agenda

## Consulta no painel

Acesse **Agenda → Grade de horários**. Escolha o dia e o profissional ou pesquise pelo nome. A grade lista os horários no fuso de São Paulo. As cores complementam os rótulos textuais de disponibilidade e situação. Recepção, gestão e administração consultam a unidade vinculada. Um perfil exclusivamente médico só consulta a própria agenda ativa.

A leitura apresenta intervalos livres dentro de janelas explícitas. Compromissos são recortados às fronteiras do período consultado. Cancelamentos aparecem na lista e não ocupam a janela. Cadastros inativos preservam compromissos existentes para perfis operacionais e deixam de indicar disponibilidade. Sem janelas cadastradas, não são inferidas vagas a partir dos espaços entre compromissos.

## Banco e API

- Aplicar `database/dev021_grade_agenda.sql` após DEV-020 no ambiente de teste. A tabela `piloto.janelas_agenda` recebe intervalos datados e não sobrepostos por unidade e profissional. O fixture de testes fornece janelas sintéticas.
- A interface e o [GET da grade](../openapi/dev010.yaml) compartilham a leitura SQL. A função de consulta executa sob RLS, usa o JWT da sessão com MFA e registra a decisão na auditoria. Nomes e IDs de pacientes ficam fora da projeção.
- A consulta usa uma janela de até 31 dias, com início inclusivo e fim exclusivo. Em vez da página de reservas prevista no contrato inicial, retorna a grade coerente com os intervalos livres. Se houver mais de 500 compromissos, janelas ou profissionais em uma consulta ampla, orienta a reduzir o intervalo ou filtrar por profissional, sem devolver horários livres parciais.
- Testes usam PostgreSQL descartável, chamadas HTTP autenticadas e navegador em desktop e celular. O inventário DEV-004 orientou o recorte funcional. As regras internas do WebUltra continuam sem homologação.

## Próxima tarefa

DEV-022 — Configurar disponibilidade regular por profissional e local. Exceções, feriados, cotas e fluxos operacionais de gravação seguem o backlog. A implantação e homologação no Supabase hospedado ficam pendentes.
