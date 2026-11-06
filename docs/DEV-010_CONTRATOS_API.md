# DEV-010 — Contratos de API e limites (rascunho técnico v0.1)

**Estado:** proposta para revisão, não implementação ou homologação. **Base:** DEV-005 v1.0, DEV-006 (7 jornadas), DEV-009 (14 tabelas PostgreSQL). **Ambiente:** apenas homologação sintética. Este documento não autoriza exposição dos schemas `piloto` ou `piloto_privado` na Data API do Supabase.

## Convenções obrigatórias

- Prefixo `/api/v1`; JSON UTF-8; autenticação por sessão válida no servidor. Nunca confiar em `perfil`, `usuarioId` ou `profissionalId` enviados pelo cliente como prova de autorização.
- Todas as rotas de unidade usam `/unidades/{unidadeId}`; o backend verifica vínculo ativo e permissões a cada operação, inclusive leitura. Consultas clínicas exigem escopo médico, não acesso irrestrito de gestão.
- Datas de eventos em ISO 8601 com offset, persistidas como `timestamptz`. Filtros por dia local precisam de fuso explícito (ex.: `America/Sao_Paulo`). Intervalos `[inicio,fim)`.
- IDs UUID; dinheiro em centavos inteiros; quantidades inteiras positivas. O cliente nunca determina o preço vigente sem revalidação no servidor.
- Paginação por cursor opaco com `limit` padrão 25, máximo 100; ordenação estável por data e UUID; cursor vinculado a unidade, filtros, ordenação e escopo de acesso. Cursor adulterado/expirado retorna `400 CURSOR_INVALIDO`.
- Pesquisa de pacientes: mínimo 2 caracteres, limite 80, normalização no servidor; retorno mínimo necessário e sem busca entre unidades. Paginação não permite enumeração global.
- Mutação requer `Content-Type: application/json`, limite de corpo 64 KiB (documentos clínicos: limite específico posterior), validação estrita, trilha de auditoria sem conteúdo clínico e proteção contra CSRF quando houver cookies.
- `Idempotency-Key` UUID obrigatório para abertura de atendimento e lançamentos financeiros; repetir mesma chave e mesmo corpo devolve a mesma resposta; chave repetida com corpo diferente retorna `409 IDEMPOTENCIA_CONFLITO`. Armazenamento de idempotência transacional **a implementar** na DEV de infraestrutura.
- `If-Match` com versão/ETag obrigatório para editar rascunhos; versão antiga retorna `409 VERSAO_DESATUALIZADA`. Finalizados são imutáveis e retificações exigem fluxo aprovado.
- Erros não retornam SQL, stack traces, nomes de outros pacientes, tokens ou credenciais. Resposta padrão: `{ "erro": { "codigo": "ACESSO_NEGADO", "mensagem": "Operação não permitida.", "correlacaoId": "uuid" } }`.
- Status: `400` entrada inválida; `401` não autenticado; `403` proibido; `404` ausente **ou fora de escopo** (sem enumeração); `409` conflito; `412` precondição ausente/incompatível quando aplicável; `422` regra de negócio; `429` limite; `500` erro genérico. Cabeçalho `X-Correlation-Id` para suporte, sem PII.

## Rotas propostas e autorização

| Método e rota (após /api/v1) | Perfil mínimo e escopo | Contrato e observações |
|---|---|---|
| GET /unidades/{u}/agenda?inicio=&fim=&profissionalId=&cursor=&limit= | Recepção/gestão: unidade; médico: agenda própria | Janela máxima 31 dias; itens com ID, intervalo, estado e resumo autorizado. |
| POST /unidades/{u}/agendamentos | Recepção/gestão | `pacienteId, profissionalId, inicio, fim`; conflito de slot `409 AGENDA_CONFLITO`; encaixes bloqueados até V03. |
| PATCH /unidades/{u}/agendamentos/{id} | Recepção/gestão | Estado ou remarcação com `If-Match`; preserva histórico; cancelamento com atendimento aberto bloqueado até V04. |
| GET /unidades/{u}/pacientes?q=&cursor=&limit= | Recepção e médico vinculado | Médico recebe apenas pacientes autorizados pelo atendimento; sem pesquisa ampla. |
| POST /unidades/{u}/pacientes | Recepção/gestão | Campos mínimos, validação e deduplicação revisadas; não usar CPF real nos testes. |
| GET /unidades/{u}/atendimentos?inicio=&fim=&cursor=&limit= | Recepção/financeiro/gestão por unidade; médico próprios | Filtrar estado, profissional e período; retorno com campos mínimos por papel. |
| POST /unidades/{u}/atendimentos | Recepção/gestão | `pacienteId, profissionalId, agendamentoId?`; reserva não cria atendimento automaticamente; idempotência. |
| GET /unidades/{u}/procedimentos?q=&cursor=&limit= | Recepção/gestão/médico | Código, descrição e estado; preços em rota separada. |
| GET /unidades/{u}/precos?procedimentoId=&convenioId=&data= | Recepção/financeiro/gestão | Preço por vigência; sem preço retorna `404 PRECO_NAO_ENCONTRADO`, sem valor presumido. |
| POST /unidades/{u}/atendimentos/{id}/itens | Recepção/gestão | `procedimentoId, quantidade, convenioId`; valida preço/vigência na transação e retorna cobrado em centavos. |
| GET /unidades/{u}/atendimentos/{id}/documentos | Médico responsável | Apenas documentos clínicos do atendimento autorizado. |
| POST /unidades/{u}/atendimentos/{id}/documentos | Médico responsável | `tipo` e `itemId` obrigatório somente para laudo; versão inicial rascunho. |
| POST /unidades/{u}/documentos/{id}/versoes | Médico responsável, conforme transição | `estado, conteudo, versaoEsperada`; revisão, assinatura e liberação **não habilitadas** até V06–V09 e validação de identidade/assinatura. |
| GET /unidades/{u}/atendimentos/{id}/saldo | Financeiro/gestão; recepção apenas resumo permitido | `cobradoCentavos, recebidoLiquidoCentavos, pendenteCentavos`; sem detalhes clínicos. |
| POST /unidades/{u}/atendimentos/{id}/recebimentos | Financeiro autorizado | `valorCentavos` e chave de idempotência; transação e auditoria; integração real bloqueada. |
| POST /unidades/{u}/atendimentos/{id}/estornos | Financeiro com aprovação definida | `movimentoOrigemId` e valor integral; bloqueada até V05 e política de autorização. |

## Exemplos sintéticos

`POST /api/v1/unidades/00000000-0000-4000-8000-000000000001/atendimentos`

```json
{"pacienteId":"00000000-0000-4000-8000-000000000011","profissionalId":"00000000-0000-4000-8000-000000000021","agendamentoId":"00000000-0000-4000-8000-000000000031"}
```

`201 Created` com `Location` e `{ "id": "00000000-0000-4000-8000-000000000041", "estado": "aberto", "agendamentoId": "00000000-0000-4000-8000-000000000031" }`. Os IDs acima são artificiais; a chamada não foi executada.

Resposta de lista: `{"dados":[...],"paginacao":{"proximoCursor":null,"limite":25}}`. Sem cursor significa fim dos resultados. Campos permitidos por perfil serão tipados no OpenAPI antes da implementação.

## Riscos e critérios de aceite

1. **RLS não basta:** o DEV-009 só demonstrou políticas de leitura em banco descartável; comandos de escrita, autenticação real, segregação de papéis e auditoria de leitura precisam ser testados em API. Não expor tabelas via Data API.
2. **Preço:** o DEV-009 não possui convênio vinculado diretamente ao atendimento nem tabela de descontos. A escolha de convênio, vigência, política de desconto e histórico do preço cobrado precisam de decisão V02/V05 antes da rota de itens funcionar.
3. **Documentos:** o banco suporta versões, mas não valida por si só autorização do revisor, assinatura real ou escopo de retificação. Essas ações permanecem bloqueadas.
4. **Concorrência:** testar duas aberturas do mesmo agendamento e dois agendamentos no mesmo slot; esperar um sucesso e um conflito, sem registros duplicados.
5. **Segurança:** testes de acesso cruzado entre unidades, perfis sem vínculo, paciente de outro médico, paginação com cursor forjado, idempotência repetida, entradas inválidas e `429`.
6. **Aceite:** especificação OpenAPI validada por parser, exemplos contratuais testados com dados sintéticos, decisões V01–V12 registradas conforme pertinência. Nenhum endpoint está implementado neste documento.

**Próxima ação:** produzir `openapi/dev010.yaml` com schemas estritos, testar parser e cenários negativos, registrar PR e CI. DEV-010 segue em andamento.