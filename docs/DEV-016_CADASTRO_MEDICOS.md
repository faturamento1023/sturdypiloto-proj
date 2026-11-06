# DEV-016 — Cadastro de médicos (implementação incremental)

**Estado:** em andamento. Este pacote entrega uma primeira validação independente de formulário e testes unitários, **não** um CRUD operacional ou cadastro homologado.

## Evidência da fonte e decisões

O manual administrativo WebUltra de 05/11/2026 descreve a **lista de médicos** (tela 17) com busca, CRM/UF, status ativo, indicação de certificado e receituário. A **tela 18** reúne nome/dados do profissional, conselho, especialidade, título, estado ativo, PFX A1, imagem de assinatura e margens de impressão. A inspeção original **não testou** gravação, upload de certificado ou assinatura. Essas observações não demonstram as regras internas do fornecedor.

**Proposta do Piloto:** cadastro médico básico por unidade com nome, CRM/UF, especialidade, título e ativo; desativação lógica sem exclusão de histórico; vinculação de conta separada do cadastro profissional. O escopo da unidade deve vir da sessão/autorização no servidor, nunca de campos controlados pelo navegador. Não receber PFX, senhas, chaves privadas ou imagens de assinatura no formulário básico. Não afirmar que formato sintático do CRM valida registro profissional; a verificação em fonte oficial e eventuais duplicidades de CRM/UF ainda precisam de regra institucional.

## Entrega técnica

- `src/cadastros/validar-cadastro-medico.mjs`: validador puro, preserva zeros iniciais do CRM, valida UF e estado booleano, rejeita dados de credenciais, certificados e escopo do cliente.
- `src/cadastros/validar-cadastro-medico.test.mjs`: cinco grupos de testes com entradas sintéticas.
- Execução local prevista: `node --test src/cadastros/validar-cadastro-medico.test.mjs`.

## Próximos passos e bloqueios

1. Construir migração incremental para `piloto.profissionais`, que hoje tem somente `nome`, `ativo` e vínculo opcional a usuário. Definir unicidade por unidade e CRM/UF sem quebrar o esquema já existente.
2. Implementar RPC/handler com autorização **gestão/administrador**, AAL2, unidade ativa, RLS, transação e auditoria, incluindo negativa para perfis não autorizados.
3. Criar listagem e formulário responsivos com busca, validações, mensagens de erro e estados de carregamento; testar Playwright e banco descartável.
4. Conferir critérios DEV-005 para telas ADM-17/18, executar CI e documentar homologação. Certificados e assinaturas digitais ficam fora do escopo até decisão técnica e jurídica.

**Segurança:** nenhum dado de paciente, credencial ou captura proprietária integra esta entrega. Nenhum acesso ou modificação foi realizado no WebUltra original.
