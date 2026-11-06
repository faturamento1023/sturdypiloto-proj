import { expect, test } from '@playwright/test';

test('gestão ou administração cadastra, busca e inativa um médico na sua unidade', async ({ page, context }, info) => {
  const desktop = info.project.name === 'desktop';
  const unidadeAlheia = '00000000-0000-4000-8000-00000000000' + (desktop ? '2' : '1');
  const nome = 'Médico fictício ' + info.project.name;

  await page.goto('/entrar');
  await page.getByLabel('E-mail', { exact: true }).fill(`cadastro-${info.project.name}@example.com`);
  await page.getByLabel('Senha', { exact: true }).fill('Piloto-ficticio-123');
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await page.getByLabel('Código do autenticador', { exact: true }).fill('123456');
  await page.getByRole('button', { name: 'Verificar acesso', exact: true }).click();
  await page.getByRole('link', { name: 'Abrir painel' }).click();
  await page.getByRole('main').getByRole('link', { name: /Cadastro de médicos/ }).click();

  const gerencia = page.getByRole('region', { name: 'Gerenciar médicos' });
  await gerencia.getByText('Novo médico', { exact: true }).click();
  const formulario = gerencia.locator('details').filter({ hasText: 'Novo médico' });
  await formulario.getByLabel('Nome completo').fill(nome);
  await formulario.getByLabel('CRM', { exact: true }).fill('001234');
  await formulario.getByLabel('UF do CRM').selectOption('GO');
  await formulario.getByLabel('Especialidade').fill('Clínica médica');
  await formulario.getByRole('button', { name: 'Cadastrar médico' }).click();
  await expect(gerencia.getByRole('status')).toHaveText('Cadastro salvo.');

  await gerencia.getByRole('searchbox').fill('1234');
  await gerencia.getByRole('button', { name: 'Filtrar' }).click();
  const ficha = gerencia.locator('details').filter({ hasText: nome });
  await expect(ficha.locator('summary')).toContainText('CRM GO 001234 · Ativo');
  await ficha.locator('summary').click();
  await ficha.getByLabel('Cadastro ativo').uncheck();
  await ficha.getByRole('button', { name: 'Salvar alterações' }).click();
  await expect(ficha.locator('summary')).toContainText('CRM GO 001234 · Inativo');

  const negado = await context.request.get('/painel?modulo=medicos&unidade=' + unidadeAlheia);
  expect(negado.status()).toBe(404);
});
