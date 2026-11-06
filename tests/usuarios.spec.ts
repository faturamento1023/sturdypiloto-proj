import { expect, test, type Page } from '@playwright/test';

async function entrar(page: Page, email: string) {
  await page.goto('/entrar');
  await page.getByLabel('E-mail', { exact: true }).fill(email);
  await page.getByLabel('Senha', { exact: true }).fill('Piloto-ficticio-123');
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await page.getByLabel('Código do autenticador', { exact: true }).fill('123456');
  await page.getByRole('button', { name: 'Verificar acesso', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Minha conta' })).toBeVisible();
}

test('administrador emite convite, conta aceita e bloqueio encerra o acesso da unidade', async ({ page, browser }, info) => {
  const convidado = 'convidado-' + info.project.name + '@example.com';
  await entrar(page, 'usuarios-' + info.project.name + '@example.com');
  await page.getByRole('link', { name: 'Abrir painel' }).click();
  await page.getByRole('main').getByRole('link', { name: /Usuários e perfis/ }).click();

  const gerencia = page.getByRole('region', { name: 'Gerenciar usuários' });
  await gerencia.getByText('Convidar usuário', { exact: true }).click();
  await gerencia.getByLabel('E-mail do convidado').fill(convidado);
  await gerencia.getByLabel('Perfil do convite').selectOption('recepcao');
  await gerencia.getByRole('button', { name: 'Gerar convite' }).click();
  const codigo = gerencia.getByLabel('Código gerado');
  await expect(codigo).toHaveValue(/^[0-9a-f]{64}$/);
  const token = await codigo.inputValue();

  const outraSessao = await browser.newContext({ baseURL: info.project.use.baseURL });
  try {
    const outraPagina = await outraSessao.newPage();
    await entrar(outraPagina, convidado);
    await outraPagina.getByRole('link', { name: 'Validar convite' }).click();
    await outraPagina.getByLabel('Código do convite').fill(token);
    await outraPagina.getByRole('button', { name: 'Aceitar convite' }).click();
    await expect(outraPagina.getByRole('status')).toContainText('Convite aceito');
    await outraPagina.getByRole('link', { name: 'Abrir painel' }).click();
    await expect(outraPagina.getByRole('region', { name: 'Perfis nesta unidade' })).toContainText('Recepção');
    const negado = await outraSessao.request.get('/painel?modulo=usuarios');
    expect(negado.status()).toBe(404);

    await page.reload();
    const ficha = gerencia.getByRole('listitem').filter({ hasText: convidado });
    await ficha.getByRole('button', { name: 'Bloquear na unidade' }).click();
    await expect(gerencia.getByRole('status')).toHaveText('Alteração registrada.');
    await outraPagina.reload();
    await expect(outraPagina.getByRole('heading', { name: 'Sem unidade vinculada' })).toBeVisible();
  } finally {
    await outraSessao.close();
  }
});
