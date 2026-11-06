# DEV-012 — Autenticação do Projeto Piloto

A aplicação usa Supabase Auth para login por e-mail e senha. A sessão usa cookies de primeira parte com `HttpOnly` e `SameSite=Lax`. Em HTTPS, também usa `Secure`. A página da conta valida o usuário no servidor e a resposta tem `Cache-Control: private, no-store`. O proxy renova o token quando necessário e grava os cookies novos na resposta. O botão Sair encerra a sessão atual.

| Tela | Fluxo |
|---|---|
| `/entrar` | Login de contas previamente autorizadas para o piloto |
| `/recuperar-acesso` | Solicitação de código com a mesma resposta para endereços cadastrados e desconhecidos |
| `/redefinir-senha` | Validação do código de uso único e troca da senha sem iniciar sessão no navegador |
| `/verificar-acesso` | Cadastro ou verificação do aplicativo autenticador por TOTP |
| `/conta` | Identidade da sessão verificada no servidor e saída |

Nesta etapa, o piloto exige MFA para todas as contas. A página da conta requer um fator TOTP verificado e um token com nível `aal2` validado pelo servidor. A recuperação exige o código do autenticador quando já existe um fator verificado. Perda do autenticador requer verificação de identidade e atendimento pelo administrador.

A recuperação tenta revogar todas as sessões após trocar a senha. Se a revogação falhar, a interface informa que a senha mudou e que o encerramento das sessões anteriores ficou sem confirmação. Tokens de acesso emitidos antes da revogação podem valer até a expiração. A DEV-013 fará a verificação de perfis e vínculos por unidade antes de conceder acesso aos módulos.

## Configurar um ambiente Supabase isolado

1. Defina `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` e `PILOTO_ORIGEM` no servidor. Use [.env.example](../.env.example) como referência. O aplicativo aceita HTTP somente em loopback. O build autônomo recebe as variáveis na execução.
2. No Supabase Auth do ambiente isolado, habilite login por e-mail e MFA TOTP, desabilite cadastro público e contas anônimas e crie uma conta de teste autorizada. Configure os limites do provedor para login, recuperação e verificação de códigos.
3. Ajuste a origem permitida e inclua a URL exata `PILOTO_ORIGEM/redefinir-senha` na lista de redirecionamentos. Configure a entrega de e-mail para os destinatários de teste.
4. No modelo **Reset password**, use o código de uso único, com o link para o formulário do piloto.

```html
<p>Use o código <strong>{{ .Token }}</strong> para redefinir sua senha.</p>
<p><a href="{{ .RedirectTo }}">Abrir o formulário de redefinição</a></p>
```

## Verificação

O Playwright executa os fluxos em desktop e celular. O teste sobe um substituto HTTP para o Supabase Auth em loopback e exercita as requisições do SDK, as transições de página e os cookies. A configuração usa identidades fictícias e cobre credencial inválida, renovação, saída, cadastro e desafio do autenticador, acesso negado sem MFA, recuperação, código inválido e reutilização do código. O e-mail real e a configuração de um projeto Supabase isolado ficam pendentes de homologação operacional.

```bash
npm ci
npx playwright install chromium
npm run build
npm run prepare:homologacao
npm run test:e2e
```

Referências técnicas. [Supabase Auth no servidor](https://supabase.com/docs/guides/auth/server-side/nextjs) · [Modelos de e-mail](https://supabase.com/docs/guides/auth/auth-email-templates)
