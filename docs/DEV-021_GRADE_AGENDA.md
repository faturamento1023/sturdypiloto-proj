# DEV-021 — Grade de agenda (início incremental)

**Situação:** em andamento. A `main` registra DEV-020 concluída. Esta entrega é um módulo de projeção de intervalos e testes sintéticos, **não** uma grade navegável ou homologada.

## Fonte e limite de evidência

- **Observado/documentado no WebUltra:** inventário DEV-004 registra grade por dia/agenda e telas ADM-01 a ADM-06; a persistência e as regras de bloqueio não foram testadas na fonte.
- **Proposta do Piloto:** projetar compromissos da unidade em janela [início, fim), ordenar por horário, filtrar por profissional e não expor identidade do paciente na projeção pública do módulo.
- **Testado:** oito cenários unitários foram escritos, mas a execução local e o CI ainda não estão confirmados. Nenhuma sessão clínica foi utilizada.

## Entrega atual

- `scripts/dev021_grade.cjs`: validação de horários ISO com deslocamento, janela máxima de 31 dias, filtragem por unidade e profissional, interseção temporal, ordenação determinística e projeção mínima.
- `scripts/dev021_grade.test.cjs`: limites inclusivo/exclusivo, adjacência, fuso obrigatório, escopo, ordenação, privacidade e cancelamento.
- `.github/workflows/dev021-grade.yml`: teste Node 22 para PR.

## Pendências para conclusão

1. Implementar consulta HTTP autenticada com autorização no servidor, vínculo ativo e MFA, conforme DEV-013.
2. Grade responsiva em desktop/celular, com estados vazio, erro, carregando, seleção de agenda e filtros; não expor paciente a perfil não autorizado.
3. Aplicar regras de reserva, conflito, feriados, exceções, cotas e situação de agenda somente após especificação e testes próprios; não inferir comportamento original.
4. Executar testes em PostgreSQL descartável, HTTP e navegador; verificar CI e critérios DEV-005.
5. Registrar decisão operacional de validação sem declarar homologação clínica ou publicação.

**Próxima tarefa:** integração segura da leitura da grade com dados fictícios em ambiente descartável.

## Leitura autorizada incremental — 06/11/2026

- Adicionado `scripts/dev021_leitura.cjs`: contrato de leitura com validação da janela, MFA, perfil ativo, unidade vinculada e revalidação do vínculo via repositório antes de consultar dados. Médico só consulta seu próprio `professionalId`; recepção/gestão podem consultar agenda da unidade vinculada.
- A projeção exclui `patientId` e outros campos não permitidos. A consulta real ao PostgreSQL ainda deverá aplicar RLS e escopo de profissional no próprio SQL, não apenas na aplicação.
- Adicionados oito testes sintéticos em `scripts/dev021_leitura.test.cjs`, incluídos no workflow. **Execução dos novos testes e CI ainda não confirmadas.**
- Trata-se de serviço agnóstico de banco, não endpoint HTTP nem autorização clínica homologada. Não usa dados reais.
- Próxima tarefa: implementar repositório PostgreSQL seguro e testes de isolamento no banco descartável, depois endpoint HTTP e interface responsiva.
