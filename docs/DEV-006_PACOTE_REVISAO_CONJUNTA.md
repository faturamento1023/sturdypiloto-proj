# DEV-006 — Pacote de revisão conjunta (administrativo e médico)

**Data:** 05/11/2026. **Estado:** material preparado para revisão; não é aprovação nem ata de reunião realizada. **Escopo:** jornadas UX-01 a UX-07, 53 passos, baseadas nos manuais administrativo e médico. Referências: [checklist V01–V12](DEV-006_CHECKLIST_VALIDACAO.md), [contratos CF-01–CF-04](DEV-006_CONTRATOS_FUNCIONAIS_QA.md), [revisão de fontes](DEV-006_REVISAO_FONTES.md).

## Decisões a registrar antes do aceite do mapa

| ID | Perfil que deve validar | Proposta conservadora para o Piloto | Pendência concreta e decisão requerida |
|---|---|---|---|
| V01 | Administrativo | Cadastros restritos a gestão/administrador; demais perfis somente leitura quando aplicável | Definir quem cria, edita e inativa médicos, procedimentos, convênios e usuários |
| V02 | Administrativo | Exibir fonte e vigência do preço; bloquear cálculo automático sem tabela vigente | Confirmar regras de convênio, exceções e preços ausentes |
| V03 | Recepção | Rejeitar sobreposição; preservar formulário em conflito; encaixes e feriados sem automatismo não validado | Autorizar ou negar encaixe, feriados e excedente de cota, com papéis responsáveis |
| V04 | Recepção | Reserva não abre atendimento; cancelamento não exclui histórico | Definir remarcação e cancelamento depois de atendimento aberto |
| V05 | Administrativo/financeiro | Separar cobrado, recebido, estornado e pendente; desconto apenas com autorização | Aprovação de desconto, conciliação e estorno após fechamento |
| V06 | Médico | Rascunho editável pelo autor, com versão; finalização sem alteração silenciosa | Definir retificação, finalização e impressão do rascunho |
| V07 | Médico/gestão | Negar acesso a prontuários fora do escopo autorizado | Definir vínculo com unidade, equipe e substituição do médico |
| V08 | Médico | Desabilitar fórmulas e interpretação clínica não revisadas | Confirmar unidades, limites, fórmulas e responsabilidade técnica |
| V09 | Médico/gestão | Laudo precisa revisão, aprovação e assinatura antes de liberar; sem assinatura real no sandbox | Definir quem revisa, quem assina, como justificar devolução e quem libera |
| V10 | Administrativo/financeiro | Relatórios demonstrativos; NFSe e caixa real desabilitados | Definir origem de lançamentos, fechamento, conciliação e integração fiscal |
| V11 | Ambos | Erros recuperáveis preservam dados não sensíveis do formulário; acesso negado por padrão | Validar mensagens e ações de recuperação por perfil |
| V12 | Ambos | Navegação própria desktop/mobile; módulos e campos preservados, sem copiar visual proprietário | Confirmar ordem de menus, campos e atalhos por perfil |

## Protocolo de aceite

Para cada linha V01–V12, registrar: **papel**, **decisão** (aprovado / aprovado com ressalva / rejeitado / adiado com bloqueio explícito), **ajuste necessário**, **data** e **identificação do responsável**. Não inserir pacientes, laudos, imagens proprietárias, CPF ou credenciais. Itens adiados só permitem concluir DEV-006 se o fluxo permanecer seguro e o bloqueio da funcionalidade estiver explícito no escopo posterior.

**Não foi obtido aceite nesta execução.** Os quatro requisitos de produto já confirmados pelo responsável são conceituais e não substituem as 12 decisões operacionais. A revisão clínica exige responsável competente; este documento não constitui homologação clínica.

## Verificações e bloqueios atuais

- Revisão documental dos manuais e rastreabilidade por passo: **concluídas anteriormente**, sem execução de ações no WebUltra.
- GitHub PR #5: **nenhuma revisão formal ou comentário de revisão registrado** na consulta desta execução; não inferir aprovação do silêncio.
- CI do commit mais recente: **sem resultado confirmado** por consulta ao workflow associado; os 20 testes locais registrados anteriormente não equivalem a CI verde do PR atualizado.
- Evidências visuais ainda ausentes para ADM-23, ADM-38 e MED-07; comparações dessas telas continuam limitadas ao texto do manual.
- Planilha oficial no Drive é **arquivo XLSX**, apesar do URL de editor Sheets; não presumir atualização automática nem sobrescrever o cronograma original.

## Saída da DEV-006

1. Revisões administrativa e médica registradas, com ressalvas e bloqueios rastreáveis.
2. Validador de jornadas e testes pertinentes verdes no commit final do PR.
3. Decisão explícita de aceite final do mapa; só então mesclar PR #5, encerrar Issue #4 e iniciar DEV-007.

**Próxima ação:** coletar e registrar as decisões V01–V12 com os responsáveis autorizados; verificar CI do commit atualizado e corrigir falhas. Não iniciar Figma enquanto a DEV-006 permanecer pendente.
