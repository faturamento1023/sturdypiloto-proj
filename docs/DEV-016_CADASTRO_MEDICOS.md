# DEV-016 — Cadastro de médicos

No painel, **Cadastro de médicos** permite listar, pesquisar, cadastrar e editar profissionais. O formulário inclui nome, CRM e UF, especialidade, título e situação. A inativação preserva o registro, os vínculos e o histórico de atendimentos.

As telas administrativas 17 e 18 do WebUltra orientaram a identificação dos campos. O piloto separa o cadastro profissional da vinculação da conta e da assinatura digital.

## Regras do piloto

- Gestão e administração podem consultar e alterar o cadastro da própria unidade com MFA e vínculo ativo. O banco verifica as permissões inclusive quando a operação é chamada diretamente.
- CRM e UF são obrigatórios para novos cadastros. A validação é de formato. O cadastro preserva zeros à esquerda na exibição e os desconsidera para impedir duplicidades na mesma unidade e UF. Cadastros antigos podem manter o CRM pendente.
- A edição compara a revisão exibida com a revisão atual. Conflitos e duplicidades recebem mensagens próprias, sem sobrescrever alterações concorrentes.
- Listagem e alterações geram eventos na trilha da DEV-015. Alterações e eventos confirmam na mesma transação.

## Homologação

Aplique [o SQL DEV-016](../database/dev016_medicos.sql) depois da [DEV-015](DEV-015_AUDITORIA_CENTRAL.md) em Supabase isolado. Os testes usam PostgreSQL descartável e identidade simulada, incluindo cadastro, busca, inativação, CRM duplicado, revisão desatualizada e bloqueio de outra unidade. A validação no Supabase hospedado e a eventual conferência do registro em fonte oficial ficam para a homologação operacional. A assinatura digital é tratada no módulo seguro próprio.
