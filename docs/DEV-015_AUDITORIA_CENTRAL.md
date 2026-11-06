# DEV-015 — Auditoria central

A trilha `piloto_privado.auditoria` reúne alterações e consultas protegidas. Cada evento novo registra horário, operação, entidade, resultado, ator da sessão e identificador de correlação. Quando há um alvo autorizado, o evento pode incluir os identificadores da unidade e do registro.

| Operação | O que fica registrado |
|---|---|
| Alteração no modelo | Inclusão, alteração ou exclusão registrada pelo gatilho na mesma transação da operação |
| Consulta de perfis de uma unidade | Resultado da consulta à unidade, com o mesmo identificador enviado em `X-Correlation-Id` |
| Carregamento do painel | Resultado da listagem de unidades da conta, sem duplicar nomes, unidades ou perfis na trilha |
| Consulta clínica no banco | Resultado da leitura de itens ou da versão atual de um documento, com controle por médico responsável |
| Bloqueio na camada de dados | Ator autenticado e tipo de consulta. O identificador do alvo fica vazio para evitar exposição de objetos fora do escopo |

## Proteções

A auditoria recebe campos estruturados. Ela não recebe prontuário, texto do laudo, valores, tokens, cookies, senhas ou dados enviados em formulários. As funções privadas verificam a identidade, o MFA e o vínculo aplicável antes de retornar dados. A gravação do evento faz parte da mesma instrução ou transação. Se a gravação falhar, a operação protegida falha junto.

Os papéis da aplicação ficam sem acesso direto à tabela de auditoria. Os gatilhos bloqueiam alteração, exclusão e truncamento da trilha. A correlação é uma referência para investigação, enquanto a autoria vem da sessão verificada pelo banco. Os eventos históricos preservam os campos existentes e podem ter correlação vazia.

## Escopo de homologação

Aplique [o SQL DEV-015](../database/dev015_auditoria.sql) após os SQLs DEV-009, DEV-013 e DEV-014 em um banco isolado. Os RPCs de perfis e unidades aceitam correlação opcional e devem ser chamados por POST na Data API, pois registram auditoria. Os schemas `piloto` e `piloto_privado` ficam fora da lista de exposição.

As consultas de perfis e unidades estão ligadas à aplicação. A leitura do documento e a projeção clínica foram testadas no banco e ficam disponíveis para os handlers futuros. Rejeições HTTP anteriores à consulta, como sessão ausente e MFA pendente, ficam fora desta trilha de dados. A tabela não tem tela de consulta no piloto.

A verificação usa dados fictícios, PostgreSQL descartável e provedor de identidade simulado. Ela cobre leitura permitida e negada, atribuição médica, ausência de conteúdo clínico na trilha, correlação HTTP, falha de gravação e reversão transacional. A homologação em Supabase hospedado, a definição da base legal aplicável, do prazo de retenção e dos responsáveis pela consulta da trilha ficam pendentes de validação institucional antes de uso real.

Referência legal. [Lei nº 13.709/2018, especialmente arts. 6º, 37 e 46](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm)
