# DEV-020 — Impacto dos cadastros

Em **Atendimentos → Histórico de itens**, os perfis de recepção, financeiro, gestão e administração com MFA consultam os itens da própria unidade. A tela mostra o valor unitário e o total gravados, além do nome e da situação atuais do procedimento e do profissional. A data usa o fuso de São Paulo. A consulta tem paginação, pesquisa e registro de auditoria. O conteúdo do prontuário e a identidade do paciente ficam fora da projeção.

## Efeitos verificados

| Alteração | Comportamento |
|---|---|
| Procedimento inativado | Sai do catálogo operacional. O banco bloqueia inclusão de novos itens com esse procedimento. O item existente mantém seu valor e aparece como vinculado a um cadastro inativo. |
| Profissional inativado | O banco bloqueia novas reservas, remarcações e novos atendimentos com o profissional. Cancelamentos de reservas existentes continuam disponíveis. Atendimentos e documentos anteriores permanecem registrados e sujeitos às permissões vigentes. |
| Convênio inativado ou preço alterado | A consulta de preços respeita vigência e situação cadastral. Os valores lançados e o saldo já registrado no atendimento são preservados. |
| Duplicidade e permissões | O banco mantém as restrições por unidade. A consulta de histórico verifica perfil, vínculo ativo e MFA, inclusive em chamadas diretas ao RPC. |
| Auditoria | O teste confere autoria e correlação das alterações e o registro das consultas permitidas e negadas. |

O histórico vem de uma visão privada com junções por unidade e sem consulta à tabela de preços atuais. O total em centavos sai do banco como texto para evitar perda de precisão. O bloqueio das novas referências usa travas de linha para disputar a atualização do cadastro com a operação que o utiliza.

## Homologação

Aplique [o SQL DEV-020](../database/dev020_impacto_cadastros.sql) depois da [DEV-019](DEV-019_CONVENIOS_PRECOS.md) em ambiente isolado. O PostgreSQL descartável verifica os efeitos sobre agenda, prontuário, itens, saldo e auditoria. No navegador, o teste inativa o procedimento no catálogo e confere o total preservado no histórico em desktop e celular.

A grade de agenda, a interface completa de prontuário e o caixa ainda pertencem às etapas dos próprios módulos. A homologação operacional no Supabase hospedado permanece pendente.
