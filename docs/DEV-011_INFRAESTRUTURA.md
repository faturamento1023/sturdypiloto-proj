# DEV-011 — Infraestrutura do Projeto Piloto

A base Next.js usa o design system da Clínica DM e exibe o ambiente em execução. A rota `/api/saude` confirma a execução do servidor e indica o ambiente. Os fluxos de negócio continuam especificados no [contrato da DEV-010](DEV-010_CONTRATOS_API.md).

| Ambiente | Entrada | Finalidade |
|---|---|---|
| Desenvolvimento | `npm run dev` em `127.0.0.1:3000` | Iterar no código e consultar a página inicial e a rota de saúde |
| Homologação local | Build autônomo em `127.0.0.1:3100` | Reproduzir a versão compilada e executar o Playwright |
| Homologação no GitHub | Job **Executar artefato de homologacao** em `main` | Verificar a integridade do pacote e executar as duas rotas em um runner separado |
| Homologação no Vercel | Preview isolado do projeto `clinica-dm-piloto-homologacao` | Conferência pelo navegador com a proteção de acesso do projeto e dados fictícios |

A publicação do preview é independente do Git. O PR registra a versão e o link verificado. O GitHub Actions entrega o pacote automaticamente em `main`. A prévia usa apenas o código da base e o design system.

## Desenvolvimento e homologação local

Use a versão de Node.js em `.node-version`. As dependências são fixadas pelo `package-lock.json`.

```bash
npm ci
npm run dev
```

Em outro momento, execute o fluxo de homologação:

```bash
npm run build
npm run prepare:homologacao
npm run start:homologacao
```

O comando de preparação copia os estilos e arquivos estáticos para o build autônomo. A rota `http://127.0.0.1:3100/api/saude` responde com `{"status":"ok","ambiente":"homologacao"}`. Na prévia Vercel, o ambiente vem de `VERCEL_ENV=preview`. Na execução local, o modo padrão é desenvolvimento e o comando de homologação fixa `PILOTO_AMBIENTE=homologacao`.

## Checks e entrega

O workflow [Piloto CI e homologacao](../.github/workflows/piloto-ci.yml) roda em pull requests e em `main`. Instala dependências a partir do lockfile, executa o modelo PostgreSQL descartável, compila a aplicação e verifica a página e a rota de saúde em desktop e celular com Playwright. Os workflows anteriores continuam cobrindo contratos OpenAPI, jornadas e domínio.

Em `main`, o pacote `piloto-homologacao-<commit>` contém o build autônomo e seu checksum SHA-256, com retenção de sete dias. O job de homologação baixa o próprio artefato, valida o checksum e executa a versão extraída. A homologação roda em loopback e usa dados fictícios. O controle de revisão desta etapa usa pull request e checks. A configuração de regras obrigatórias de branch pertence à administração do repositório.

Para conferir localmente o banco descartável e o navegador:

```bash
npm run test:database
npx playwright install chromium
npm run build
npm run prepare:homologacao
npm run test:e2e
```

A DEV-012 tratará login, redefinição de acesso e sessão. O banco desta etapa roda somente nos testes descartáveis. A rota de saúde indica a execução da aplicação.

Referências técnicas. [Build autônomo Next.js](https://nextjs.org/docs/app/api-reference/config/next-config-js/output) · [Playwright no CI](https://playwright.dev/docs/ci-intro) · [Artefatos GitHub Actions](https://docs.github.com/en/actions/tutorials/store-and-share-data) · [Ambientes Vercel](https://vercel.com/docs/deployments/environments)
