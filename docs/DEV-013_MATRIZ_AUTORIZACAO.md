# DEV-013 — Matriz de autorização por unidade (proposta de implementação)

**Estado:** desenho inicial, não implementado nem homologado. **Base:** DEV-005 v1.0, DEV-006 (V01–V12), DEV-009 (RLS) e DEV-010 (OpenAPI). **Dependência:** DEV-012 (sessão e AAL2). Somente dados sintéticos.

## Invariantes obrigatórias

1. **Negar por padrão.** Toda rota valida sessão no servidor, AAL2, vínculo ativo e unidade solicitada. Nenhuma permissão decorre do menu, do corpo JSON, de cabeçalhos enviados pelo cliente ou apenas do JWT sem reconsultar vínculos ativos.
2. **Escopo de objeto.** Validar que paciente, agendamento, atendimento, item, documento e movimento pertencem à unidade. Para médico, exigir vínculo assistencial comprovado com o atendimento e profissional associado à conta autenticada.
3. **Acúmulo de perfis.** A conta pode ter vários vínculos ativos na mesma unidade; permissões acumulam por união, mas **nunca** atravessam unidades. Revogação/inativação tem efeito na próxima requisição, não apenas após expiração do token.
4. **Separação clínica.** Gestão, administração, recepção e financeiro não ganham acesso ao conteúdo clínico por terem acesso a metadados operacionais. Não registrar prontuário, senha, token ou TOTP na auditoria.
5. **Escrita protegida.** A API usa transação e auditoria atômica. RLS é defesa adicional, não substituto de autorização por objeto. Rotas financeiras marcadas `x-requer-habilitacao` continuam desabilitadas.
6. **Sem autorização por ocultação.** Ocultar ação na UI é conveniência; acesso direto à URL deve retornar 403 ou 404 sem vazamento de existência de objeto fora do escopo.

## Matriz inicial (L = ler, C = criar, A = alterar, — = negar)

| Recurso/ação | Recepção | Médico | Financeiro | Gestão | Administrador |
|---|---|---|---|---|---|
| Agenda da unidade | L/C/A | L própria | — | L/C/A | L |
| Cadastro mínimo de pacientes | L/C | L vinculados | — | L | — |
| Atendimento operacional | L/C | L próprios | L financeiro | L/C | L |
| Itens de atendimento | L/C | L clínicos próprios, sem preço | L financeiro | L/C | L |
| Catálogo e procedimentos | L | L | L | L | L |
| Preços e convênios | L | — | L | L | L |
| Conteúdo de evolução/laudo | — | L/C/A próprios em rascunho | — | — | — |
| Saldos e movimentos | — | — | L | L | L |
| Receber/estornar | — | — | **bloqueado** | **bloqueado** | **bloqueado** |
| Vínculos/perfis | — | — | — | — | **a definir em V01** |
| Auditoria técnica | — | — | — | — | **acesso interno separado** |

**Ressalvas:** matriz de trabalho; V01, V05, V07 e V09 precisam de validação operacional. As permissões exatas devem ser reconciliadas com as 24 operações do OpenAPI antes de habilitar handlers. Nenhuma célula autoriza assinatura, liberação de laudo ou integração fiscal.

## Sequência de avaliação no servidor

1. Validar cookie/sessão por `getUser()`, verificar nível `aal2` no servidor; falha → 401 ou fluxo de MFA.
2. Resolver `unidadeId` e consultar `vinculos` ativos da identidade autenticada, com unidade ativa; ausência → 403.
3. Conferir operação na matriz de permissões versionada, independente da interface; ausência → 403.
4. Buscar o objeto **já filtrado pela unidade**. Se não existe ou não pertence à unidade, responder 404 indistinguível.
5. Para recursos clínicos, conferir vínculo de profissional ativo e propriedade/atribuição do atendimento. Para escrita, verificar estado e versão esperada.
6. Aplicar mutação transacional, restrições RLS, idempotência e auditoria; responder sem dados excessivos e com `Cache-Control: no-store`.

## Cenários de QA obrigatórios (dados fictícios)

| ID | Situação | Esperado |
|---|---|---|
| AUTHZ-01 | Sem sessão | 401; nenhuma linha retornada |
| AUTHZ-02 | Sessão AAL1 sem TOTP | Bloqueio; nenhum recurso da unidade |
| AUTHZ-03 | Vínculo inativo | 403 imediato após revogação |
| AUTHZ-04 | Vínculo válido na unidade A tenta acessar B | 403/404 sem dados de B |
| AUTHZ-05 | Médico A lê evolução do médico B sem atribuição | 404 |
| AUTHZ-06 | Médico lê seu próprio atendimento | 200 com projeção clínica, sem preços |
| AUTHZ-07 | Recepção tenta ler documento clínico | 403 |
| AUTHZ-08 | Financeiro tenta acessar texto clínico | 403 |
| AUTHZ-09 | Gestão tenta ler conteúdo clínico | 403 |
| AUTHZ-10 | Médico tenta receber pagamento | 403 |
| AUTHZ-11 | Financeiro tenta recebimento ainda não habilitado | 403/501 de operação desabilitada, sem mutação |
| AUTHZ-12 | Conta com dois perfis na unidade A | União apenas de permissões da unidade A |
| AUTHZ-13 | Objeto de unidade B com ID conhecido | 404, sem revelar existência |
| AUTHZ-14 | Acesso pela URL direta, mesmo com botão oculto | Mesmo bloqueio no servidor |
| AUTHZ-15 | Vínculo do médico inativado durante sessão | Próxima requisição negada |
| AUTHZ-16 | Tentativa negada e escrita permitida | Trilha de auditoria sem segredos nem conteúdo clínico |

## Bloqueios e plano de implementação

- Reconciliar as políticas RLS e grants do SQL da DEV-009 com as rotas do OpenAPI. **Nunca** habilitar schemas internos na Data API.
- Implementar guardas reutilizáveis de sessão, AAL2, unidade, permissão e escopo de objeto; projetar respostas por papel.
- Cobrir AUTHZ-01–16 em testes de integração com PostgreSQL descartável e provedor de identidade simulado; testar concorrência e revogação.
- Integrar guardas aos handlers somente após revisão. O acesso à produção, autenticação real e autorização clínica seguem fora de escopo nesta entrega.

**Verificação desta entrega:** documento de desenho criado; nenhum teste de autorização executado nesta sessão. **Próximo passo:** implementação e testes de integração da DEV-013, após conferir o estado do PR DEV-012.


## Incremento de 06/11/2026 — avaliador puro de política

- Adicionado `src/autorizacao/politica.ts`: verificação determinística de AAL2, unidade ativa, vínculos ativos por identidade, permissões explícitas, isolamento entre unidades e atribuição clínica. Operações sem regra são negadas; recebimento, estorno, gestão de vínculos e auditoria permanecem bloqueados.
- Adicionado `src/autorizacao/politica.test.ts`: testes unitários para ausência de sessão, AAL1, vínculo revogado, outra unidade, médico sem atribuição, perfis não clínicos e operações bloqueadas.
- **Limitação importante:** o avaliador recebe um retrato dos vínculos, e **não** consulta PostgreSQL nem Supabase. Não deve ser usado diretamente com parâmetros enviados pelo cliente; os handlers deverão obter identidade e vínculos por consulta privilegiada e fresca, dentro de transações adequadas. Não substitui RLS nem auditoria. As projeções por papel ainda não foram implementadas; nenhuma rota clínica foi habilitada.
- **Verificação:** código e testes adicionados ao PR, sem execução local/CI confirmada nesta sessão. AUTHZ-16 (auditoria) e testes integrados com revogação/concorrência ainda pendentes. A matriz continua proposta, não homologada.

## Revisão de segurança de 06/11/2026 — chaves de política em runtime

- Identificado risco de acesso a propriedades herdadas do objeto de regras quando um recurso/ação é construído a partir de entrada HTTP não validada. Os tipos TypeScript não validam valores em runtime; a consulta anterior poderia resultar em exceção em vez de negação controlada.
- Corrigido `src/autorizacao/politica.ts` com verificação de propriedades próprias e confirmação de lista de perfis, mantendo negação por padrão.
- Acrescentados testes sintéticos de chaves `__proto__`, `constructor`, `toString`, ações desconhecidas, identidade divergente e dupla função com conteúdo clínico de terceiro.
- **Testes:** novos cenários escritos, mas sem execução local confirmada nesta sessão; a consulta de workflows do SHA anterior retornou lista vazia. Não confundir com CI aprovado.
- **Bloqueios mantidos:** integração ao banco, consulta fresca de vínculos, auditoria transacional, testes integrados AUTHZ-01–16, homologação das regras V01/V05/V07/V09 e reconciliação da dependência PR #13. Nenhuma rota real habilitada.

## Revisão defensiva de 06/11/2026 — dados malformados do adaptador

- Corrigido avaliador para negar acesso se a lista de vínculos recebida do adaptador não for um array, sem lançar exceção por `filter` inexistente.
- Entradas nulas, objetos incompletos e vínculos de outra unidade são descartados. Somente vínculos ativos e da identidade corrente podem conceder permissão.
- Adicionados testes unitários sintéticos para listas nulas, tipos inesperados e entradas inválidas misturadas com vínculos válidos.
- **Verificação desta sessão:** código e testes publicados, execução local e CI **não confirmadas**. Não há integração com sessão Supabase, PostgreSQL, handlers ou auditoria nesta alteração.
- **Próxima ação:** executar testes no runner, revisar tipagem e conectar consulta fresca de vínculos no servidor sem habilitar rotas clínicas.
