# DEV-018 — Procedimentos e grupos

No painel, **Catálogo** permite consultar os procedimentos da unidade e pesquisar por descrição, código interno ou TUSS. Gestão e administração com MFA e vínculo ativo podem cadastrar, editar e inativar procedimentos e grupos. Os demais perfis autorizados consultam o catálogo ativo.

## Campos e regras

- Cada procedimento tem código interno único por unidade, descrição, tipo, grupo opcional, código TUSS opcional, preparo e indicação de exigência de consentimento.
- A validação do TUSS confere o formato de oito dígitos. A conferência de existência e vigência na tabela oficial fica para a homologação operacional. O campo de consentimento registra a exigência no catálogo. A coleta e a guarda do termo pertencem ao fluxo assistencial.
- Os grupos têm nome único por unidade, sem distinção entre maiúsculas e minúsculas. Um grupo com procedimentos ativos precisa ser esvaziado ou ter seus procedimentos inativados antes de ser inativado.
- A edição usa revisão para evitar sobrescrever alterações concorrentes. A inativação preserva referências de preços e atendimentos. A migração mantém os procedimentos anteriores, com grupo e TUSS vazios e tipo inicial **Procedimento**.
- A autorização é revalidada no PostgreSQL. Leitura e alterações do catálogo entram na trilha da DEV-015, sem copiar o texto de preparo. As alterações e seus eventos confirmam na mesma transação.

## Homologação

Aplique [o SQL DEV-018](../database/dev018_catalogo.sql) após a [DEV-017](DEV-017_USUARIOS_PERFIS.md) em ambiente isolado. Os testes usam identidade simulada, PostgreSQL descartável e códigos fictícios. Cobrem isolamento por unidade, bloqueio de escrita por perfil e MFA, grupos em uso, duplicidade, revisão, inativação e acesso por desktop e celular. O Supabase hospedado permanece para homologação operacional.

Referência. [Códigos da TUSS na ANS](https://www.gov.br/ans/pt-br/assuntos/prestadores/padrao-para-troca-de-informacao-de-saude-suplementar-2013-tiss/codigos-da-tuss)
