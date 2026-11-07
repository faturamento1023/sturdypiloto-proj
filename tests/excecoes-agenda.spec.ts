import { expect, test } from '@playwright/test';

test('feriado, bloqueio e horário substituto alteram a grade sem cancelar compromissos', async ({ page, context }, info) => {
  await page.goto('/entrar');
  await page.getByLabel('E-mail', { exact: true }).fill(`cadastro-${info.project.name}@example.com`);
  await page.getByLabel('Senha', { exact: true }).fill('Piloto-ficticio-123');
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await page.getByLabel('Código do autenticador', { exact: true }).fill('123456');
  await page.getByRole('button', { name: 'Verificar acesso', exact: true }).click();
  await page.getByRole('link', { name: 'Abrir painel' }).click();
  await page.getByRole('main').getByRole('link', { name: /Agenda/ }).click();
  await page.getByRole('link', { name: 'Exceções e feriados' }).click();

  const config = page.getByRole('region', { name: 'Exceções e feriados' });
  const consultarDia = async (dia: string) => {
    await config.getByLabel('Data da exceção').fill(dia);
    await config.getByRole('button', { name: 'Consultar data' }).click();
    await expect(page).toHaveURL(new RegExp('dataAgenda=' + dia));
  };
  await consultarDia('2091-11-07');
  const substituicao = config.getByRole('region', { name: 'Horário substituto', exact: true });
  await substituicao.getByLabel('Profissional', { exact: true }).selectOption({ label: 'Profissional de histórico' });
  await substituicao.getByLabel('Local', { exact: true }).selectOption({ label: 'Sala de exceções' });
  await substituicao.getByLabel('Horário inicial').fill('13:00');
  await substituicao.getByLabel('Horário final').fill('17:00');
  await substituicao.getByRole('button', { name: 'Salvar substituição' }).click();
  await expect(config.getByRole('status')).toHaveText('Alteração salva.');
  const bloqueio = config.getByRole('region', { name: 'Bloqueio de horário' });
  await bloqueio.getByLabel('Horário inicial').fill('14:00');
  await bloqueio.getByLabel('Horário final').fill('24:00');
  await bloqueio.getByRole('button', { name: 'Salvar bloqueio' }).click();
  const ativos = config.getByRole('region', { name: 'Registros ativos na data' });
  await expect(ativos.getByText('14:00 a 24:00')).toBeVisible();

  const unidade = new URL(page.url()).searchParams.get('unidade');
  const url = '/api/v1/unidades/' + unidade + '/agenda?inicio=2091-11-07T03:00:00Z&fim=2091-11-08T03:00:00Z';
  await config.getByRole('link', { name: 'Voltar à grade' }).click();
  const grade = page.getByRole('region', { name: 'Grade de horários' });
  await expect(grade.getByRole('listitem').filter({ hasText: /13:00 a 14:00\s*Livre · Sala de exceções/ })).toBeVisible();
  await expect(grade.getByText('Bloqueio · Toda a unidade · 14:00 a 24:00')).toBeVisible();
  await grade.getByRole('link', { name: 'Exceções e feriados' }).click();

  async function feriado(nome: string) {
    await config.getByLabel('Nome do feriado').fill(nome);
    await config.getByRole('button', { name: 'Cadastrar feriado' }).click();
  }

  await feriado('Feriado fictício');
  await expect(ativos.getByText('Feriado · Feriado fictício')).toBeVisible();
  const resposta = await context.request.get(url);
  expect(resposta.status()).toBe(200);
  const dados = await resposta.json();
  expect(dados.livres).toHaveLength(0);
  expect(dados.avisos).toEqual([expect.objectContaining({ tipo: 'feriado', descricao: 'Feriado fictício' })]);
  await ativos.getByRole('button', { name: 'Liberar dia' }).click();
  await expect(ativos.getByText('Feriado · Feriado fictício')).toHaveCount(0);
  expect((await (await context.request.get(url)).json()).livres).toHaveLength(1);

  await consultarDia('2091-11-14');
  await feriado('Dia com reserva');
  await expect(config.getByRole('alert')).toContainText('agendamentos pendentes');
  await config.getByRole('link', { name: 'Voltar à grade' }).click();
  await expect(grade.getByRole('listitem').filter({ hasText: /09:00 a 09:30\s*Confirmado/ })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(await page.evaluate(() => window.innerWidth));
});
