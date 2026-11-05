# Guia de trabalho recorrente — Projeto Piloto

## Fontes e prioridade

1. Cronograma: [planilha no Drive](https://docs.google.com/spreadsheets/d/1URCRm870bdDhFTwooJPgCiczzuCtqaYC/edit).
2. Estado de execução: `docs/CONTROLE_EXECUCOES.md` e Issues abertas neste GitHub.
3. Especificação: `docs/INVENTARIO_EVIDENCIAS.md` e fontes originais apontadas por links.

## Para cada execução

1. Ler o status anterior e a próxima tarefa ainda não entregue.
2. Conferir fontes necessárias e selecionar um incremento realizável.
3. Produzir alteração concreta: documentação, protótipo, código, migração ou teste.
4. Validar com testes objetivos e distinguir as verificações feitas das não feitas.
5. Registrar entrega, limitações, arquivos alterados e próximo passo.
6. Se faltar credencial, permissão, ambiente ou decisão clínica: registrar bloqueio e preparar o que for seguro; não inventar conclusão.

## Critérios de segurança

- Repositório atualmente **público**: nada de CPF, imagens com nomes de pacientes, atestados reais, laudos, certificados PFX, senhas, tokens ou dumps.
- Não alterar prontuários, pacientes, atendimentos ou configurações reais do WebUltra.
- Apenas homologação com dados fictícios e chaves de ambiente fora do versionamento.
- Aprovação humana antes de migração com dados reais, deploy de produção e cálculos clínicos usados assistencialmente.

## Tecnologias previstas (não implementadas ainda)

Next.js, React, TypeScript, Tailwind CSS, PostgreSQL/Supabase, Supabase Auth, validação Zod, testes Vitest/Playwright e CI GitHub Actions. Implantação condicionada à revisão e homologação.

## Entregável mínimo por tarefa

Um commit ou artefato verificável, um registro de testes e uma atualização de status. Não prometer execução contínua dentro do mesmo chat; a automação agenda novas sessões de trabalho.
