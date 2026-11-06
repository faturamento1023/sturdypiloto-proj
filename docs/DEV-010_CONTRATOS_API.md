# DEV-010 — Contratos de API e limites

O [contrato OpenAPI 3.1](../openapi/dev010.yaml) registra 24 operações da DEV-010 em 19 rotas e a consulta de acesso adicionada pela DEV-013, com exemplos sintéticos, formatos de entrada e saída e perfis permitidos. A especificação parte das jornadas da DEV-006 e do [modelo de dados da DEV-009](DEV-009_MODELO_DADOS.md). A DEV-010 encerra o desenho da API. A implementação dos handlers, da sessão e das regras transacionais fica para as etapas correspondentes.

## Operações por área

| Área | Operações | Escopo de leitura e escrita |
|---|---|---|
| Agenda | Listar agenda e profissionais, reservar, consultar, remarcar, confirmar e cancelar | Recepção e gestão operam a agenda. Administrador lê na unidade. Médico lê apenas a própria agenda e identificação profissional. |
| Pacientes | Buscar, cadastrar e consultar cadastro mínimo | Recepção cadastra. Busca e detalhe são limitados à unidade para recepção e aos vínculos assistenciais do próprio médico. |
| Atendimentos | Listar, consultar e abrir atendimento. Listar ou adicionar itens | Recepção e gestão escrevem. Leitura operacional usa perfis conforme o OpenAPI. Médico recebe apenas os próprios atendimentos e itens clínicos projetados. |
| Catálogo | Listar convênios e procedimentos e consultar preço por vigência | Perfis operacionais consultam conforme escopo. Médico consulta procedimentos. Convênio e preço usam permissões operacionais distintas da leitura clínica. |
| Prontuário e laudos | Listar documentos, abrir versão atual, criar rascunho e salvar nova versão | Somente médico responsável. O laudo exige um item do próprio atendimento. Listas retornam metadados. O conteúdo aparece na operação de detalhe. |
| Financeiro | Consultar saldo e contratar lançamentos de recebimento ou estorno integral | Saldo para financeiro, gestão e administração. Lançamentos exigem papel financeiro, regras transacionais e habilitação explícita. |

## Convenções da interface

- Todas as rotas usam `/api/v1/unidades/{unidadeId}`. O servidor valida o token da sessão e reavalia o vínculo ativo, o perfil e o objeto em cada requisição. IDs do cliente servem como referências. O ator vem da sessão verificada. Os schemas `piloto` e `piloto_privado` ficam fora da lista de exposição da Data API.
- Datas civis usam `AAAA-MM-DD`. Horários exigem ISO 8601 com deslocamento ou `Z`. Agenda e atendimentos usam janela positiva de até 31 dias, com início inclusivo e fim exclusivo. A agenda seleciona sobreposições com a janela. Atendimentos filtram pela abertura.
- A paginação usa `limit` de 1 a 100, com padrão 25, e `cursor` opaco, protegido e com validade. O cursor vincula unidade, identidade, filtros e ordenação. Datas ou nomes recebem o ID como desempate. Listagens ordenadas apenas por ID também estão explícitas. `proximoCursor: null` encerra a lista. Alterações ocorridas durante a paginação seguem a ordem atual da base.
- A busca de pacientes exige 2 a 80 caracteres após a normalização. As listas retornam apenas ID e nome. Data de nascimento fica no detalhe autorizado. Corpo JSON limitado a 64 KiB, com limites adicionais de campos, itens e textos no OpenAPI.
- Limites de projeto para homologação: 120 leituras e 30 gravações por minuto por identidade e unidade. Busca de pacientes tem limite de 30 por minuto dentro do limite de leitura. A infraestrutura definirá um limite por origem para requisições sem sessão. Respostas com dados do sistema devem usar `Cache-Control: no-store`.

## Gravação, concorrência e erros

- Cada `POST` exige `Idempotency-Key` UUID. Uma repetição com a mesma intenção, alvo e corpo retorna o resultado já confirmado, após revalidar autorização. Mudança do corpo ou do alvo com a mesma chave retorna `409 IDEMPOTENCIA_CONFLITO`. O registro de idempotência e a operação precisam confirmar na mesma transação. O contrato propõe retenção de replay de 24 horas para comandos gerais. Para lançamentos, a unicidade da chave por unidade no banco continua impedindo duplicidade após essa janela.
- Alteração de agendamento e gravação de nova versão usam `If-Match` com o ETag forte recebido no detalhe. Ausência da precondição retorna `428`. Revisão divergente retorna `412`. Conflitos de negócio, como horário sobreposto ou agendamento já convertido, retornam `409`. O backend deve introduzir um identificador de revisão durável para o agendamento e testar a comparação na transação.
- Valores monetários são inteiros em centavos. O servidor calcula o preço do item pelo convênio e pela data local de abertura na unidade. Deve conferir vigência e persistir a trilha do convênio e do preço escolhido antes de habilitar o lançamento de itens. O saldo assinado distingue dívida e crédito. O pendente é o maior entre zero e saldo.
- Recebimento parcial usa lançamentos separados. O estorno deriva o valor integral do recebimento original. A implementação deve verificar saldo e serializar gravações financeiras por atendimento, sem aceitar valor de estorno do cliente.
- Erros seguem `application/problem+json`. `X-Correlation-Id` acompanha todas as respostas e coincide com `correlacaoId` no erro. A API retorna `401` para sessão inválida, `403` para operação proibida e `404` para objeto ausente ou fora do escopo. `429` inclui `Retry-After`. Os detalhes de erro devem usar mensagens próprias sem incluir dados clínicos, valores enviados, tokens ou mensagens internas do banco.

## Dependências operacionais registradas

| Referência | Limite adotado no contrato |
|---|---|
| V01–V02 | Catálogo de consulta nesta versão. Escritas de cadastro mestre, descontos e vinculação de convênio seguem nos módulos próprios. |
| V03–V04 | Abertura é explícita. Encaixes e cancelamento ou remarcação com atendimento aberto dependem de regras operacionais. |
| V05 e V10 | Recebimentos e estornos aparecem como operações planejadas, marcadas com `x-requer-habilitacao`. Integrações e fechamento de caixa ficam para a implementação financeira. |
| V06–V09 | Evolução e laudo são gravados como rascunho. A projeção de itens para o médico depende da DEV-013 e exclui valores. Revisão formal, assinatura, liberação e cálculos clínicos seguem com escopo próprio. |
| V11–V12 | Estado vazio, precondições, conflitos e limites de página estão definidos para consumo pelos fluxos desktop e celular. |

## Conferência

O [check de contrato](../scripts/validate-dev010.py) verificou 45 exemplos sintéticos e 15 entradas indevidas. Ele também confere parâmetros de caminho, autenticação, limites de acesso declarados, pré-condições e cabeçalhos. O workflow **Validate API contract** executa esse check e o lint do OpenAPI no PR. O teste atua sobre a especificação. Testes de HTTP, concorrência real, autorização por objeto e proteção do cursor serão executados ao implementar a API.

A próxima tarefa é a DEV-011, infraestrutura, checks e ambientes do projeto.

Referências técnicas. [OpenAPI 3.1](https://spec.openapis.org/oas/v3.1.1.html) · [Erros HTTP](https://www.rfc-editor.org/rfc/rfc9457.html) · [Precondições HTTP](https://www.rfc-editor.org/rfc/rfc9110.html#name-if-match) · [HTTP 428](https://www.rfc-editor.org/rfc/rfc6585.html#section-3) · [Segurança da Data API](https://supabase.com/docs/guides/api/securing-your-api)
