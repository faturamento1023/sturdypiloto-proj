import { expect, test } from '@playwright/test';

test('recepção cadastra paciente sintético e encontra pelo nome social sem acento', async ({ page }, info) => {
  await page.goto('/entrar');
  await page.getByLabel('E-mail', { exact: true }).fill(`painel-${info.project.name}@example.com`);
  await page.getByLabel('Senha', { exact: true }).fill('Piloto-ficticio-123');
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await page.getByLabel('Código do autenticador', { exact: true }).fill('123456');
  await page.getByRole('button', { name: 'Verificar acesso', exact: true }).click();
  await page.getByRole('link', { name: 'Abrir painel' }).click();
  await page.getByRole('main').getByRole('link', { name: /Pacientes/ }).click();

  const cadastro = page.getByRole('region', { name: 'Lista de pacientes' });
  await cadastro.getByText('Novo paciente', { exact: true }).click();
  await cadastro.getByLabel('Nome completo').fill(`Paciente Fictícia ${info.project.name}`);
  await cadastro.getByLabel('Nome social (opcional)').fill(`Iêda Sintética ${info.project.name}`);
  await cadastro.getByLabel('Data de nascimento').fill('1990-04-15');
  await cadastro.getByRole('button', { name: 'Cadastrar paciente' }).click();
  await expect(cadastro.getByRole('status')).toHaveText('Paciente cadastrado.');
  await cadastro.getByRole('searchbox').fill(`IEDA SINTETICA ${info.project.name}`);
  await cadastro.getByRole('button', { name: 'Pesquisar', exact: true }).click();
  const linha = cadastro.getByRole('row').filter({ hasText: `Paciente Fictícia ${info.project.name}` });
  await expect(linha).toContainText(`Iêda Sintética ${info.project.name}`);
  await expect(linha).toContainText('15/04/1990');
  expect(new URL(page.url()).search).not.toContain('IEDA');
});
