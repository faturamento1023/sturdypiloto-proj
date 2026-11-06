import { expect, test } from '@playwright/test';

test('gestão ou administração cadastra grupo e procedimento com preparo e consentimento', async ({ page }, info) => {
  await page.goto('/entrar');
  await page.getByLabel('E-mail', { exact: true }).fill(`cadastro-${info.project.name}@example.com`);
  await page.getByLabel('Senha', { exact: true }).fill('Piloto-ficticio-123');
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await page.getByLabel('Código do autenticador', { exact: true }).fill('123456');
  await page.getByRole('button', { name: 'Verificar acesso', exact: true }).click();
  await page.getByRole('link', { name: 'Abrir painel' }).click();
  await page.getByRole('main').getByRole('link', { name: /Catálogo/ }).click();

  const catalogo = page.getByRole('region', { name: 'Catálogo da unidade' });
  await catalogo.getByText('Novo grupo', { exact: true }).click();
  await catalogo.getByLabel('Nome do grupo').fill('Grupo de teste');
  await catalogo.getByRole('button', { name: 'Cadastrar grupo' }).click();
  await expect(catalogo.getByRole('status')).toHaveText('Cadastro salvo.');

  await catalogo.getByText('Novo procedimento', { exact: true }).click();
  const novo = catalogo.locator('details').filter({ hasText: 'Novo procedimento' });
  await novo.getByLabel('Descrição', { exact: true }).fill('Exame fictício');
  await novo.getByLabel('Código interno').fill('FICT-018');
  await novo.getByLabel('Código TUSS').fill('09990001');
  await novo.getByLabel('Tipo', { exact: true }).selectOption('exame');
  await novo.getByLabel('Grupo', { exact: true }).selectOption({ label: 'Grupo de teste' });
  await novo.getByLabel('Instruções de preparo').fill('Preparo sintético');
  await novo.getByLabel('Exige consentimento').check();
  await novo.getByRole('button', { name: 'Cadastrar procedimento' }).click();

  const ficha = catalogo.locator('details').filter({ hasText: 'Exame fictício' });
  await expect(ficha.locator('summary')).toContainText('TUSS 09990001');
  await ficha.locator('summary').click();
  await expect(ficha.locator('dd').filter({ hasText: 'Preparo sintético' })).toBeVisible();
  await expect(ficha.getByText('Exigido', { exact: true })).toBeVisible();
  await ficha.getByLabel('Procedimento ativo').uncheck();
  await ficha.getByRole('button', { name: 'Salvar procedimento' }).click();
  await expect(ficha.locator('summary')).toContainText('Inativo');
});
