# DEV-013 — Autorização por perfil e unidade

A autorização combina sessão verificada com MFA, vínculo ativo, unidade ativa e política por recurso. O banco consulta os vínculos atuais em cada operação. Uma revogação confirmada produz efeito na consulta seguinte, mesmo se o token da sessão continuar válido. Os perfis acumulam permissões somente na unidade em que cada vínculo existe.

| Recurso | Recepção | Médico | Financeiro | Gestão | Administrador |
|---|---|---|---|---|---|
| Agenda | Lê e opera | Lê a própria | — | Lê e opera | Lê |
| Cadastro mínimo de pacientes | Lê e cadastra | Lê os vinculados ao próprio atendimento ou agendamento | — | — | — |
| Atendimento operacional | Lê e abre | Lê os próprios | Lê | Lê e abre | Lê |
| Itens operacionais | Lê e inclui | — | Lê | Lê e inclui | Lê |
| Projeção clínica de itens | — | Lê itens do próprio atendimento, sem valores | — | — | — |
| Procedimentos | Lê | Lê | Lê | Lê | Lê |
| Convênios e preços | Lê | — | Lê | Lê | Lê |
| Conteúdo de evolução e laudo | — | Próprios, no escopo de rascunho previsto | — | — | — |
| Saldos | — | — | Lê | Lê | Lê |

A matriz é usada pelas guardas e pelo [contrato das operações](../openapi/dev010.yaml). As permissões de escrita indicam o escopo dos handlers futuros. Recebimentos, estornos, gestão de vínculos, auditoria e publicação de laudos seguem nas etapas correspondentes. Regras operacionais V01, V05, V07 e V09 continuam registradas no backlog.

## Implementação

- `GET /api/v1/unidades/{unidadeId}/acesso` entrega a própria lista de perfis ativos para o shell. A rota valida o usuário e o segundo fator no servidor e chama o RPC com o JWT da sessão. Entradas do navegador nunca definem a identidade ou o perfil. A resposta tem `Cache-Control: private, no-store` e um identificador de correlação.
- `public.piloto_meus_perfis(uuid)` é uma função invocadora que delega a consulta dos vínculos a um auxiliar privado. A função privada restringe a consulta a `auth.uid()`, AAL2, conta não anônima, unidade ativa e vínculo ativo.
- As políticas RLS da DEV-009 usam o mesmo auxiliar de perfis. A leitura clínica continua sujeita à atribuição médica. A função privada `itens_clinicos` aplica atribuição e projeção na mesma consulta e retorna ID, procedimento e quantidade. A API clínica ainda precisa de um handler próprio com paginação.
- A política TypeScript nega operações desconhecidas ou bloqueadas e valida os perfis antes de buscar o objeto. Os handlers devem consultar o objeto na unidade e executar escritas junto com a autorização e a auditoria da operação na mesma transação.

## Homologação

Em um Supabase isolado, aplique [o modelo DEV-009](../database/dev009_modelo.sql) antes do [SQL DEV-013](../database/dev013_autorizacao.sql). Mantenha os schemas `piloto` e `piloto_privado` fora da lista da Data API. A aplicação chama somente o RPC restrito do schema `public`, sem chave de serviço. Use os parâmetros de ambiente da [DEV-012](DEV-012_AUTENTICACAO.md).

O CI combina testes da política e guardas, PostgreSQL descartável com papéis e RLS e Playwright em desktop e celular. O fluxo HTTP usa identidade simulada e executa a consulta de perfis no PostgreSQL descartável. Os cenários cobrem falta de sessão, AAL1, vínculo inativo, unidade inativa, revogação, tentativa de troca de perfil pelo navegador, ausência de atribuição médica e exclusão de valores na projeção clínica. O modelo registra auditoria de mutações de teste. A [DEV-015](DEV-015_AUDITORIA_CENTRAL.md) cobre os bloqueios e consultas protegidas na camada de dados. A validação operacional em projeto Supabase hospedado segue pendente.

Referências técnicas. [RLS no Supabase](https://supabase.com/docs/guides/database/postgres/row-level-security) · [Segurança das funções SQL](https://supabase.com/docs/guides/database/functions)
