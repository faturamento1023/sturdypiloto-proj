import { expect, test, type Page } from '@playwright/test';

const senhaInicial = 'Piloto-ficticio-123';
const senhaNova = 'Piloto-senha-alterada-456';
const unidadeA = '00000000-0000-4000-8000-000000000001';
const unidadeB = '00000000-0000-4000-8000-000000000002';
const acesso = (unidade: string) => '/api/v1/unidades/' + unidade + '/acesso';

async function preencherLogin(page: Page, email: string, senha = senhaInicial) {
  await page.getByLabel('E-mail', { exact: true }).fill(email);
  await page.getByLabel('Senha', { exact: true }).fill(senha);
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
}

async function confirmarMfa(page: Page, codigo = '123456') {
  await page.getByLabel('Código do autenticador', { exact: true }).fill(codigo);
  await page.getByRole('button', { name: 'Verificar acesso', exact: true }).click();
}

test('protege a conta, valida credenciais e encerra a sessão', async ({ page, context }, info) => {
  const email = `login-${info.project.name}@example.com`;
  expect((await context.request.get(acesso(unidadeA))).status()).toBe(401);
  await page.goto('/conta');
  await expect(page).toHaveURL(/\/entrar$/);

  await preencherLogin(page, email, 'credencial-invalida');
  await expect(page.getByRole('status')).toHaveText(/Confira seu e-mail e sua senha/);

  await preencherLogin(page, email);
  await expect(page).toHaveURL(/\/verificar-acesso$/);
  expect((await context.request.get(acesso(unidadeA))).status()).toBe(403);
  await page.goto('/conta');
  await expect(page).toHaveURL(/\/verificar-acesso$/);
  await page.getByRole('button', { name: 'Configurar autenticador' }).click();
  await expect(page.getByText('CHAVEFICTICIATESTE')).toBeVisible();
  await expect(page.getByRole('img', { name: /QR code/ })).toBeVisible();
  await confirmarMfa(page, '999999');
  await expect(page.getByRole('status')).toHaveText(/incorreto ou expirou/);
  await confirmarMfa(page);
  await expect(page.getByRole('heading', { name: 'Minha conta' })).toBeVisible();
  await expect(page.getByText(email, { exact: true })).toBeVisible();
  const permitido = await context.request.get(acesso(unidadeA));
  expect(permitido.status()).toBe(200);
  expect(permitido.headers()['cache-control']).toContain('no-store');
  expect(await permitido.json()).toEqual({ unidadeId: unidadeA, perfis: ['recepcao'] });
  expect((await context.request.get(acesso('invalida'))).status()).toBe(400);
  const proibido = await context.request.get(acesso(unidadeB) + '?perfil=administrador', {
    headers: { 'X-Perfil': 'administrador', 'X-Unidade-Id': unidadeA },
  });
  expect(proibido.status()).toBe(403);
  expect(await proibido.json()).toMatchObject({
    codigo: 'ACESSO_NEGADO', correlacaoId: proibido.headers()['x-correlation-id'],
  });
  const cookies = (await context.cookies()).filter(cookie => cookie.name.startsWith('dm-piloto-sessao'));
  expect(cookies.length).toBeGreaterThan(0);
  for (const cookie of cookies) {
    expect(cookie).toMatchObject({ httpOnly: true, sameSite: 'Lax', path: '/' });
  }
  expect(await page.evaluate(() => document.cookie)).not.toContain('dm-piloto-sessao');
  const conta = await page.reload();
  expect(conta?.headers()['cache-control']).toContain('no-store');
  await expect(page.getByRole('heading', { name: 'Minha conta' })).toBeVisible();

  await page.getByRole('button', { name: 'Sair' }).click();
  await expect(page).toHaveURL(/\/entrar$/);
  expect((await context.cookies()).some(cookie => cookie.name.startsWith('dm-piloto-sessao'))).toBe(false);
  await page.goto('/conta');
  await expect(page).toHaveURL(/\/entrar$/);
});

test('renova a sessão vencida e persiste os cookies renovados', async ({ page }, info) => {
  const email = `renovar-${info.project.name}@example.com`;
  await page.goto('/entrar');
  await preencherLogin(page, email);
  await expect(page).toHaveURL(/\/verificar-acesso$/);
  await confirmarMfa(page);
  await expect(page.getByRole('heading', { name: 'Minha conta' })).toBeVisible();
  await page.reload();
  await expect(page.getByText(email, { exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Abrir painel' }).click();
  await expect(page.getByRole('heading', { name: 'Sem unidade vinculada' })).toBeVisible();
});

test('redefine a senha sem abrir sessão e rejeita reutilização do código', async ({ page, context }, info) => {
  const email = `recuperar-${info.project.name}@example.com`;
  await page.goto('/recuperar-acesso');
  await page.getByLabel('E-mail', { exact: true }).fill('inexistente@example.com');
  await page.getByRole('button', { name: 'Solicitar código' }).click();
  await expect(page).toHaveURL(/\/redefinir-senha$/);
  await expect(page.getByText(/Se o endereço estiver cadastrado/)).toBeVisible();

  await page.getByRole('link', { name: 'Solicitar outro código' }).click();
  await expect(page).toHaveURL(/\/recuperar-acesso$/);
  await page.getByLabel('E-mail', { exact: true }).fill(email);
  await page.getByRole('button', { name: 'Solicitar código' }).click();
  await expect(page).toHaveURL(/\/redefinir-senha$/);

  async function enviarSenha(codigo: string, confirmacao = senhaNova, mfa = '123456') {
    await page.getByLabel('E-mail', { exact: true }).fill(email);
    await page.getByLabel('Código do e-mail').fill(codigo);
    await page.getByLabel('Nova senha', { exact: true }).fill(senhaNova);
    await page.getByLabel('Confirmar nova senha').fill(confirmacao);
    await page.getByLabel('Código do autenticador (se já configurado)').fill(mfa);
    await page.getByRole('button', { name: 'Salvar nova senha' }).click();
  }

  await enviarSenha('999999');
  await expect(page.getByRole('status')).toHaveText(/incorreto ou expirou/);
  await enviarSenha('081426', 'senha-diferente-321');
  await expect(page.getByRole('status')).toHaveText(/Confira se as senhas coincidem/);
  await enviarSenha('081426', senhaNova, '');
  await expect(page.getByRole('status')).toHaveText(/confirme também o código/);
  await page.getByRole('link', { name: 'Solicitar outro código' }).click();
  await expect(page).toHaveURL(/\/recuperar-acesso$/);
  await page.getByLabel('E-mail', { exact: true }).fill(email);
  await page.getByRole('button', { name: 'Solicitar código' }).click();
  await expect(page).toHaveURL(/\/redefinir-senha$/);

  await enviarSenha('081426');
  await expect(page.getByRole('status')).toHaveText('Senha alterada. Entre com a nova senha.');
  expect((await context.cookies()).some(cookie => cookie.name.startsWith('dm-piloto-sessao'))).toBe(false);

  await page.goto('/redefinir-senha');
  await enviarSenha('081426');
  await expect(page.getByRole('status')).toHaveText(/incorreto ou expirou/);

  await page.goto('/entrar');
  await preencherLogin(page, email);
  await expect(page.getByRole('status')).toHaveText(/Confira seu e-mail e sua senha/);
  await preencherLogin(page, email, senhaNova);
  await expect(page).toHaveURL(/\/verificar-acesso$/);
  await confirmarMfa(page);
  await expect(page.getByRole('heading', { name: 'Minha conta' })).toBeVisible();
});
