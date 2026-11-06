import { expect, test } from '@playwright/test';

test('histórico no painel mantém o total depois da inativação no catálogo', async ({ page }, info) => {
  await page.goto('/entrar');
  await page.getByLabel('E-mail', { exact: true }).fill(`cadastro-${info.project.name}@example.com`);
  await page.getByLabel('Senha', { exact: true }).fill('Piloto-ficticio-123');
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await page.getByLabel('Código do autenticador', { exact: true }).fill('123456');
  await page.getByRole('button', { name: 'Verificar acesso', exact: true }).click();
  await page.getByRole('link', { name: 'Abrir painel' }).click();
  await page.getByRole('main').getByRole('link', { name: /Atendimentos/ }).click();

  const historico = page.getByRole('region', { name: 'Histórico de itens' });
  const item = historico.getByRole('listitem').filter({ hasText: 'HIST-020' });
  await expect(item.locator('dd').filter({ hasText: '250,00' })).toBeVisible();
  await expect(item.locator('dd').filter({ hasText: /^Ativo$/ })).toBeVisible();
  await expect(historico.getByText('Paciente de histórico')).toHaveCount(0);

  await page.goto('/painel?modulo=catalogo');
  const cadastro = page.getByRole('region', { name: 'Catálogo da unidade' }).locator('details').filter({ hasText: 'Procedimento de histórico' });
  await cadastro.locator('summary').click();
  await cadastro.getByLabel('Procedimento ativo').uncheck();
  await cadastro.getByRole('button', { name: 'Salvar procedimento' }).click();
  await expect(cadastro.locator('summary')).toContainText('Inativo');

  await page.goto('/painel?modulo=atendimentos');
  await expect(item.locator('dd').filter({ hasText: /^Inativo$/ })).toBeVisible();
  await expect(item.locator('dd').filter({ hasText: '250,00' })).toBeVisible();
});
