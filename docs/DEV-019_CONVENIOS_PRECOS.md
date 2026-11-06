# DEV-019 — Convênios e preços

No painel, **Convênios e preços** reúne cadastro de convênios, tabela por procedimento e consulta por data. Gestão e administração com MFA e vínculo ativo podem gerenciar a tabela na própria unidade. Recepção e financeiro consultam os registros disponíveis.

## Cadastro e vigência

- Convênios têm nome único por unidade, considerando diferenças de caixa e espaços nas extremidades. A inativação do convênio preserva suas tabelas e as retira da consulta operacional.
- Cada preço vincula um convênio e um procedimento ativos da mesma unidade. O valor e a coparticipação são registrados em centavos inteiros. Nesta etapa, a coparticipação é um valor fixo por preço, informado em reais e limitado ao valor do procedimento.
- O início da vigência é inclusivo. O fim é exclusivo e pode ficar em branco. O banco impede a sobreposição de preços ativos para o mesmo par de convênio e procedimento. Na consulta por data, ausência de preço retorna uma lista vazia.
- Após o cadastro, o valor, a coparticipação e o início ficam preservados. Para mudar o valor, encerre a vigência anterior e cadastre uma nova. Se precisar substituir um registro na mesma vigência, inative o anterior e cadastre o substituto. A revisão impede sobrescrever alterações concorrentes.
- A tabela preserva os registros inativos e os valores já lançados em atendimentos. A auditoria registra consultas e mudanças sem copiar os valores. Alteração e evento confirmam na mesma transação.

## Homologação

Aplique [o SQL DEV-019](../database/dev019_convenios_precos.sql) após a [DEV-018](DEV-018_PROCEDIMENTOS_GRUPOS.md) em ambiente isolado. A migração mantém os convênios e preços existentes. Convênios antigos com nomes equivalentes precisam ser reconciliados antes da criação do índice normalizado.

Os testes usam PostgreSQL descartável, identidade simulada e valores fictícios. Cobrem separação por unidade e perfil, MFA, vigências consecutivas e sobrepostas, coparticipação, inativação, concorrência e navegação em desktop e celular. O Supabase hospedado, as tabelas contratuais e a aplicação da coparticipação no faturamento seguem para homologação operacional.
