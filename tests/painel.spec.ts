import { expect, test } from '@playwright/test';

const unidadeA = '00000000-0000-4000-8000-000000000001';
const unidadeB = '00000000-0000-4000-8000-000000000002';
const unidadeSemAcesso = '00000000-0000-4000-8000-000000000003';

test('shell valida sessão, menus, busca e troca de unidade', async ({ page, context }, info) => {
  await page.goto('/painel');
  await expect(page).toHaveURL(/\/entrar$/);
  await page.getByLabel('E-mail', { exact: true }).fill(`painel-${info.project.name}@example.com`);
  await page.getByLabel('Senha', { exact: true }).fill('Piloto-ficticio-123');
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page).toHaveURL(/\/verificar-acesso$/);
  await page.goto('/painel');
  await expect(page).toHaveURL(/\/verificar-acesso$/);

  await page.getByLabel('Código do autenticador', { exact: true }).fill('123456');
  await page.getByRole('button', { name: 'Verificar acesso', exact: true }).click();
  await page.getByRole('link', { name: 'Abrir painel' }).click();
  await expect(page.getByRole('heading', { name: 'Painel da unidade' })).toBeVisible();

  const menu = page.getByRole('navigation', { name: 'Menu principal' });
  const abrirMenu = page.getByLabel('Menu de navegação');
  if (info.project.name === 'celular') {
    await expect(menu).toBeHidden();
    await abrirMenu.click();
  }
  await expect(menu.getByRole('link', { name: 'Agenda' })).toBeVisible();
  await expect(menu.getByRole('link', { name: 'Financeiro' })).toHaveCount(0);
  await menu.getByRole('link', { name: 'Agenda' }).click();
  await expect(page.getByRole('heading', { name: 'Agenda', exact: true })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Você está em' })).toContainText('Agenda');
  await expect(page.getByText('Em preparação')).toBeVisible();

  const busca = page.getByRole('searchbox', { name: 'Buscar módulo' });
  const pesquisar = page.getByRole('button', { name: 'Pesquisar módulos' });
  await busca.fill('calendario');
  await pesquisar.click();
  await expect(page.getByRole('heading', { name: 'Resultados da busca' })).toBeVisible();
  const encontrados = page.getByRole('region', { name: 'Módulos encontrados' });
  await expect(encontrados.getByRole('link', { name: /Agenda/ })).toBeVisible();

  await busca.fill('financeiro');
  await pesquisar.click();
  await expect(encontrados.getByText(/Nenhum módulo encontrado/)).toBeVisible();
  const proibido = await context.request.get(`/painel?unidade=${unidadeA}&modulo=financeiro&perfil=administrador`);
  expect(proibido.status()).toBe(404);

  await page.getByText('Unidade fictícia A', { exact: true }).click();
  await page.getByRole('link', { name: 'Unidade fictícia B' }).click();
  await expect(page).toHaveURL(new RegExp(unidadeB));
  await expect(page.getByRole('heading', { name: 'Painel da unidade' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Perfis nesta unidade' })).toContainText('Financeiro');
  if (info.project.name === 'celular') await abrirMenu.click();
  await expect(menu.getByRole('link', { name: 'Financeiro' })).toBeVisible();
  await expect(menu.getByRole('link', { name: 'Agenda' })).toHaveCount(0);

  const rejeitado = await context.request.get(`/painel?unidade=${unidadeSemAcesso}`);
  expect(rejeitado.status()).toBe(404);
  const painel = await page.reload();
  expect(painel?.headers()['cache-control']).toContain('no-store');
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
    await page.evaluate(() => window.innerWidth),
  );
});
