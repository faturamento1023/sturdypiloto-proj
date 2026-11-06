# DEV-017 — Usuários e perfis

Em **Painel → Usuários e perfis**, administradores com MFA gerenciam convites e vínculos da própria unidade. Cada convite concede um perfil de recepção, médico, financeiro ou gestão. A manutenção do papel de administrador permanece no provisionamento institucional.

## Convite e aceite

1. No Supabase Auth isolado, provisione a conta pelo fluxo institucional e confirme o e-mail. A conta deve usar o MFA do piloto.
2. No painel, o administrador escolhe a unidade, o e-mail e o perfil. Para médico, seleciona um profissional ativo da unidade com CRM preenchido. A aplicação gera um código válido por 48 horas.
3. O administrador copia o código e o entrega ao destinatário pelo canal institucional. A conta acessa **Minha conta → Validar convite** e informa o código depois de concluir o MFA.
4. O PostgreSQL verifica o e-mail confirmado da conta, a validade do convite e a unidade ativa. O aceite consome o código e cria ou reativa o vínculo na mesma transação. Quando o perfil é médico, a mesma transação vincula a conta ao profissional indicado.

O banco guarda somente o hash do código. Reemitir um convite do mesmo perfil para o mesmo e-mail e unidade cancela o anterior. A listagem exibe destinatário, perfil e situação aos administradores da unidade.

## Permissões e bloqueio

O administrador pode cancelar convites, inativar ou reativar perfis operacionais e bloquear uma conta na unidade. O bloqueio inativa os vínculos ativos da conta naquela unidade e cancela os convites pendentes para o e-mail atual. Vínculos de outras unidades e o histórico são preservados. O acesso volta apenas quando o administrador reativa um perfil específico ou emite outro convite que seja aceito.

O PostgreSQL revalida MFA e autorização nas chamadas diretas. Emissão, aceite, cancelamento, vínculos e bloqueios usam a trilha privada da DEV-015. A trilha guarda metadados da operação sem registrar o código ou o e-mail.

## Homologação

Aplique [o SQL DEV-017](../database/dev017_usuarios.sql) após a [DEV-016](DEV-016_CADASTRO_MEDICOS.md) em ambiente isolado. Os testes usam PostgreSQL descartável e um provedor de identidade simulado, com e-mails fictícios. O fluxo de homologação usa contas provisionadas e entrega manual do código. A validação no Supabase hospedado e o envio automatizado de e-mail seguem pendentes.
