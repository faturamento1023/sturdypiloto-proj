import { expect, test } from '@playwright/test';

const unidadeA = '00000000-0000-4000-8000-000000000001';
const unidadeB = '00000000-0000-4000-8000-000000000002';
const profissional = '00000000-0000-4000-8000-000000000221';
const janela = '?inicio=2030-11-06T03:00:00Z&fim=2030-11-07T03:00:00Z';

test('agenda protege o endpoint e mostra intervalos livres e ocupados na data local', async ({ page, context }, info) => {
  const api = '/api/v1/unidades/' + unidadeA + '/agenda';
  expect((await context.request.get(api + janela)).status()).toBe(401);
  await page.goto('/entrar');
  await page.getByLabel('E-mail', { exact: true }).fill(`painel-${info.project.name}@example.com`);
  await page.getByLabel('Senha', { exact: true }).fill('Piloto-ficticio-123');
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page).toHaveURL(/\/verificar-acesso$/);
  expect((await context.request.get(api + janela)).status()).toBe(403);
  await page.getByLabel('Código do autenticador', { exact: true }).fill('123456');
  await page.getByRole('button', { name: 'Verificar acesso', exact: true }).click();
  await page.getByRole('link', { name: 'Abrir painel' }).click();
  await page.getByRole('main').getByRole('link', { name: /Agenda/ }).click();

  await expect(page.getByRole('link', { name: 'Configurar disponibilidade' })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Exceções e feriados' })).toHaveCount(0);
  expect((await context.request.get('/painel?modulo=agenda&configuracaoAgenda=excecoes')).status()).toBe(404);
  expect((await context.request.get('/painel?modulo=agenda&configuracaoAgenda=1')).status()).toBe(404);
  await page.getByLabel('Data da agenda').fill('2030-11-06');
  await page.getByRole('button', { name: 'Consultar' }).click();
  const grade = page.getByRole('region', { name: 'Grade de horários' });
  const iris = grade.getByRole('region', { name: 'Dra. Íris Fictícia' });
  await expect(iris.getByRole('row').filter({ hasText: /08:00 a 09:00\s*Livre/ })).toBeVisible();
  await expect(iris.getByRole('row').filter({ hasText: /09:00 a 09:30\s*Confirmado/ })).toBeVisible();
  await expect(iris.getByRole('row').filter({ hasText: /09:30 a 12:00\s*Livre/ })).toBeVisible();
  await expect(iris.getByText('Cancelado')).toBeVisible();
  await expect(grade.getByText('Paciente sintético reservado')).toHaveCount(0);
  await grade.getByRole('link', { name: 'Horários livres' }).click();
  await expect(iris.getByText('Confirmado')).toHaveCount(0);
  await expect(iris.getByText('Cancelado')).toHaveCount(0);
  await expect(iris.getByRole('cell', { name: 'Livre', exact: true })).toHaveCount(2);
  await grade.getByRole('link', { name: 'Mostrar todos' }).click();
  await expect(iris.getByText('Confirmado')).toBeVisible();

  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
    await page.evaluate(() => window.innerWidth),
  );

  await page.getByLabel('Pesquisar profissional').fill('iris');
  await page.getByRole('button', { name: 'Consultar' }).click();
  await expect(iris).toBeVisible();
  await expect(grade.getByRole('heading', { name: 'Dr. Bento Fictício' })).toHaveCount(0);
  await page.getByLabel('Pesquisar profissional').fill('');
  await page.getByLabel('Profissional', { exact: true }).selectOption(profissional);
  await page.getByRole('button', { name: 'Consultar' }).click();
  await expect(page).toHaveURL(new RegExp(profissional));
  await expect(iris).toBeVisible();
  await page.getByRole('link', { name: 'Próximo dia' }).click();
  await expect(page.getByLabel('Data da agenda')).toHaveValue('2030-11-07');
  await expect(iris.getByText('Sem disponibilidade cadastrada ou agendamentos para este dia.')).toBeVisible();

  const leitura = await context.request.get(api + janela + '&profissionalId=' + profissional);
  expect(leitura.status()).toBe(200);
  expect(leitura.headers()['cache-control']).toContain('no-store');
  const resposta = await leitura.json();
  expect(resposta.agendamentos).toHaveLength(2);
  expect(Object.keys(resposta.agendamentos[0]).sort()).toEqual(['estado', 'fim', 'id', 'inicio', 'profissional_id']);
  expect(resposta.livres).toHaveLength(2);
  expect((await context.request.get('/api/v1/unidades/' + unidadeB + '/agenda' + janela)).status()).toBe(403);
  expect((await context.request.get(api + janela.replace('11-06', '02-30'))).status()).toBe(400);
});
