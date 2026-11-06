import { expect, test } from '@playwright/test';

test('gestão ou administração cadastra convênio e consulta preço pela data de vigência', async ({ page }, info) => {
  await page.goto('/entrar');
  await page.getByLabel('E-mail', { exact: true }).fill(`cadastro-${info.project.name}@example.com`);
  await page.getByLabel('Senha', { exact: true }).fill('Piloto-ficticio-123');
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await page.getByLabel('Código do autenticador', { exact: true }).fill('123456');
  await page.getByRole('button', { name: 'Verificar acesso', exact: true }).click();
  await page.getByRole('link', { name: 'Abrir painel' }).click();
  await page.getByRole('main').getByRole('link', { name: /Convênios e preços/ }).click();

  const painel = page.getByRole('region', { name: 'Convênios e preços da unidade' });
  await painel.getByText('Novo convênio', { exact: true }).click();
  await painel.getByLabel('Nome do convênio', { exact: true }).fill('Convênio de teste');
  await painel.getByRole('button', { name: 'Cadastrar convênio' }).click();
  await expect(painel.getByRole('status')).toHaveText('Cadastro salvo.');

  await painel.getByText('Novo preço', { exact: true }).click();
  const form = painel.locator('details').filter({ hasText: 'Novo preço' });
  await form.getByLabel('Convênio', { exact: true }).selectOption({ label: 'Convênio de teste' });
  await form.getByLabel('Procedimento', { exact: true }).selectOption({ label: 'Procedimento da tabela · FICT-TABELA' });
  await form.getByLabel('Início da vigência', { exact: true }).fill('2030-01-01');
  await form.getByLabel('Fim da vigência (exclusivo)', { exact: true }).fill('2030-02-01');
  await form.getByLabel('Valor em reais', { exact: true }).fill('120,50');
  await form.getByLabel('Coparticipação em reais', { exact: true }).fill('20,75');
  await form.getByRole('button', { name: 'Cadastrar preço' }).click();
  const ficha = painel.locator('details').filter({ hasText: 'Procedimento da tabela · Convênio de teste' });
  await expect(ficha.locator('summary')).toContainText('120,50');
  await ficha.locator('summary').click();
  await expect(ficha.locator('dd').filter({ hasText: '20,75' })).toBeVisible();

  const data = painel.getByLabel('Data de referência', { exact: true });
  const filtrar = painel.getByRole('button', { name: 'Filtrar preços' });
  await data.fill('2030-02-01');
  await filtrar.click();
  await expect(painel.getByText('Nenhum preço encontrado para os filtros informados.')).toBeVisible();
  await data.fill('2030-01-01');
  await filtrar.click();
  await expect(ficha.locator('summary')).toContainText('120,50');
});
