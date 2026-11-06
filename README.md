# Projeto Piloto

Sistema web próprio para gestão ambulatorial da Clínica DM, desenvolvido com base nas **funcionalidades documentadas** do UltraSystem WEB (WebUltra). O objetivo é oferecer jornadas semelhantes (recepção, agendamento, atendimentos, prontuário, laudos, relatórios e financeiro), com código, identidade visual e arquitetura próprios.

> **Estado atual — 06/11/2026:** Fase 03 — Infraestrutura e permissões. [Base e ambientes DEV-011](docs/DEV-011_INFRAESTRUTURA.md), [autenticação DEV-012](docs/DEV-012_AUTENTICACAO.md), [autorização DEV-013](docs/DEV-013_MATRIZ_AUTORIZACAO.md), [shell DEV-014](docs/DEV-014_SHELL_SISTEMA.md) e [auditoria DEV-015](docs/DEV-015_AUDITORIA_CENTRAL.md). A próxima tarefa é o cadastro de médicos (DEV-016). O desenvolvimento usa dados fictícios.

## Fontes oficiais

- [Cronograma e backlog (Excel)](https://docs.google.com/spreadsheets/d/1URCRm870bdDhFTwooJPgCiczzuCtqaYC/edit)
- [Pasta Web Ultra no Drive](https://drive.google.com/drive/folders/197rL9plJRd9hQYHAzOEOHR8xY-Q-XXE8)
- [Inventário técnico das telas](https://drive.google.com/file/d/1m9Ph8nWxSbfEegFhZJzNxOPwtarbOt9u/view)
- [Manual visual administrativo](https://drive.google.com/file/d/1BxsC35dauQ7ByHGgG7NtBaBj6GDxIgJG/view)
- [Manual visual médico](https://drive.google.com/file/d/1Kco9DwEOoLhtS5I9vzuonn_GSGcAgrO6/view)

## Visão do escopo documentado

- **39** telas/tópicos administrativos (37 JPEGs avulsos identificados).
- **26** tópicos do perfil médico (23 JPEGs dentro do `Manual_Visual_Perfil_Medico.zip`).
- Captura adicional da lista de laudos pendentes dentro do `Webultra_Perfil_Medico_Diego.zip`.
- Integrações, permissões, fórmulas médicas e regras de negócio ainda dependem de validação.

Veja [docs/INVENTARIO_EVIDENCIAS.md](docs/INVENTARIO_EVIDENCIAS.md) e [docs/CONTROLE_EXECUCOES.md](docs/CONTROLE_EXECUCOES.md).

## Sequência proposta

1. Conciliar documentos, prints e fluxos; separar o que foi **observado**, **não testado** e **indisponível**.
2. Validar protótipos de desktop e celular para recepção, médico e gestão.
3. Preparar Next.js + TypeScript + Tailwind; APIs e banco PostgreSQL/Supabase.
4. Implementar cadastros, agendamento, atendimentos, prontuário, laudos, cobrança e relatórios em etapas.
5. Realizar testes de autorização, auditoria, impressão, responsividade, LGPD e homologação clínica antes de qualquer utilização real.

## Segurança e propriedade intelectual

Este repositório é **público** no GitHub. Não publicar dados reais, capturas identificáveis, certificados, senhas, chaves, tokens, arquivos de produção ou documentos privados da clínica. Somente código original, especificações próprias e dados fictícios. Não copiar código-fonte, logotipo ou arquivos proprietários do WebUltra.

## Método de execução

Cada sessão consulta o backlog, escolhe a próxima tarefa pendente, executa uma entrega verificável, documenta testes e bloqueios, e indica a próxima tarefa. Tarefas não são marcadas como concluídas apenas porque foram descritas.
