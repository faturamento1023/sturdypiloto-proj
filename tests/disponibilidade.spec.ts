import { expect, test } from '@playwright/test';

test('gestão cadastra sala e horário semanal, vê a grade e encerra a vigência', async ({ page, context }, info) => {
  await page.goto('/entrar');
  await page.getByLabel('E-mail', { exact: true }).fill(`cadastro-${info.project.name}@example.com`);
  await page.getByLabel('Senha', { exact: true }).fill('Piloto-ficticio-123');
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await page.getByLabel('Código do autenticador', { exact: true }).fill('123456');
  await page.getByRole('button', { name: 'Verificar acesso', exact: true }).click();
  await page.getByRole('link', { name: 'Abrir painel' }).click();
  await page.getByRole('main').getByRole('link', { name: /Agenda/ }).click();
  await page.getByRole('link', { name: 'Configurar disponibilidade' }).click();

  const config = page.getByRole('region', { name: 'Disponibilidade regular' });
  const sala = 'Sala de Teste DEV022';
  await config.getByLabel('Nome do local').fill(sala);
  await config.getByRole('button', { name: 'Cadastrar local' }).click();
  await expect(config.getByRole('status')).toHaveText('Cadastro salvo.');

  const nova = config.getByRole('region', { name: 'Nova disponibilidade' });
  const preencher = async (inicio: string, fim: string) => {
    await nova.getByLabel('Profissional', { exact: true }).selectOption({ label: 'Profissional de histórico' });
    await nova.getByLabel('Local', { exact: true }).selectOption({ label: sala });
    await nova.getByLabel('Dia da semana', { exact: true }).selectOption('1');
    await nova.getByLabel('Horário inicial').fill(inicio);
    await nova.getByLabel('Horário final').fill(fim);
    await nova.getByLabel('Vigente a partir de').fill('2090-11-07');
    await nova.getByRole('button', { name: 'Salvar disponibilidade' }).click();
  };
  await preencher('08:00', '10:00');
  const regras = config.getByRole('region', { name: 'Disponibilidades cadastradas' });
  await expect(regras.getByText('Segunda-feira, 08:00 a 10:00')).toBeVisible();
  await preencher('09:00', '11:00');
  await expect(config.getByRole('alert')).toContainText('se sobrepõe');

  const unidade = new URL(page.url()).searchParams.get('unidade');
  const grade = (data: string) => '/painel?modulo=agenda&unidade=' + unidade + '&dataAgenda=' + data;
  await config.getByRole('link', { name: 'Voltar à grade' }).click();
  await page.getByLabel('Data da agenda').fill('2090-11-13');
  await page.getByRole('button', { name: 'Consultar' }).click();
  await expect(page.getByText('Livre · ' + sala)).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(await page.evaluate(() => window.innerWidth));

  const api = '/api/v1/unidades/' + unidade + '/agenda?inicio=2090-11-13T03:00:00Z&fim=2090-11-14T03:00:00Z';
  const consulta = await context.request.get(api);
  expect(consulta.status()).toBe(200);
  expect((await consulta.json()).livres).toEqual([expect.objectContaining({ local_nome: sala })]);

  await page.getByRole('link', { name: 'Configurar disponibilidade' }).click();
  await regras.getByLabel('Encerrar a partir de').fill('2090-11-20');
  await regras.getByRole('button', { name: 'Encerrar regra' }).click();
  await expect(config.getByRole('status')).toContainText('Disponibilidade encerrada');
  await page.goto(grade('2090-11-20'));
  await expect(page.getByText('Livre · ' + sala)).toHaveCount(0);
  await page.goto(grade('2090-11-13'));
  await expect(page.getByText('Livre · ' + sala)).toBeVisible();
});
