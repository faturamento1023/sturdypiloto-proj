import { expect, test } from '@playwright/test';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

test('prévia da recepção abre com estilos e reserva antes de criar um atendimento', async ({ page }, info) => {
  const falhas: string[] = [];
  page.on('pageerror', erro => falhas.push(erro.message));
  await page.goto(pathToFileURL(resolve('prototype/index.html')).href);
  await expect(page.getByRole('heading', { name: 'Agenda', exact: true })).toBeVisible();
  await expect(page.locator('#agenda-rows tr')).toHaveCount(7);
  await expect(page.locator('#agenda-date-br')).toHaveText('10/11/2026');

  if (info.project.name === 'celular') {
    await expect(page.getByRole('navigation', { name: 'Módulos da recepção' })).toBeHidden();
    await page.getByRole('button', { name: 'Menu', exact: true }).click();
  }
  await expect(page.getByRole('navigation', { name: 'Módulos da recepção' })).toBeVisible();
  await expect(page.locator('#sidebar')).toHaveCSS('background-color', 'rgb(19, 44, 44)');
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(await page.evaluate(() => innerWidth));

  const agenda = page.getByRole('region', { name: 'Agenda', exact: true });
  await agenda.getByRole('button', { name: 'Horários Livres' }).click();
  const vagas = page.getByRole('dialog', { name: 'Horários Livres' });
  await expect(vagas.getByText('Agendamentos livres até 17/11/2026')).toBeVisible();
  await expect(vagas.getByRole('button', { name: 'Grade por profissional' })).toBeVisible();
  await vagas.getByRole('button', { name: 'Fechar', exact: true }).first().click();

  await agenda.getByRole('button', { name: 'Pesquisar' }).click();
  const pesquisa = page.getByRole('dialog', { name: 'Pesquisa de Agendamento' });
  await pesquisa.getByRole('searchbox').fill('Carla');
  await pesquisa.getByRole('button', { name: 'Pesquisar' }).click();
  await expect(agenda.getByRole('row').filter({ hasText: 'Carla Almeida' })).toBeVisible();
  await expect(agenda.getByRole('row').filter({ hasText: 'Ana Moreira' })).toHaveCount(0);

  await page.getByRole('button', { name: 'Novo agendamento' }).click();
  await page.locator('#booking-patient').selectOption('1003');
  await page.locator('#booking-time').fill('08:00');
  await page.getByRole('button', { name: 'Reservar horário' }).click();
  await expect(page.getByRole('alert')).toContainText('Horário indisponível');
  await page.locator('#booking-time').fill('13:30');
  await page.getByRole('button', { name: 'Reservar horário' }).click();
  const reserva = page.getByRole('row').filter({ hasText: '13:30' });
  await expect(reserva).toContainText('Reservado');
  await reserva.getByRole('button', { name: 'Atender' }).click();
  await expect(page.getByRole('heading', { name: 'Novo atendimento' })).toBeVisible();
  await expect(page.locator('#record-name')).toHaveValue('Carla Almeida');
  await page.getByRole('group', { name: 'Procedimentos' }).getByRole('button', { name: 'Adicionar' }).click();
  await page.getByRole('button', { name: 'Salvar', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Atendimento fictício AT-242');

  const atendimentos = page.getByRole('region', { name: 'Atendimentos', exact: true });
  await atendimentos.getByLabel('Período dos atendimentos').selectOption('range');
  await expect(atendimentos.getByLabel('Fim', { exact: true })).toBeVisible();
  await atendimentos.getByRole('button', { name: 'Pesquisar' }).click();
  const pesquisaAtendimento = page.getByRole('dialog', { name: 'Pesquisar Atendimentos' });
  await pesquisaAtendimento.getByRole('searchbox').fill('DEMO-242');
  await pesquisaAtendimento.getByRole('button', { name: 'Pesquisar' }).click();
  await expect(atendimentos.getByRole('row').filter({ hasText: 'DEMO-242' })).toBeVisible();
  await expect(atendimentos.getByRole('row').filter({ hasText: 'DEMO-241' })).toHaveCount(0);
  await expect(atendimentos.getByRole('region', { name: 'Totais dos atendimentos filtrados' })).toContainText('TOTAL COBRADO');
  expect(falhas).toEqual([]);
});

test('a versão pública abre a grade e o histórico por link direto', async ({ page }) => {
  const preview = pathToFileURL(resolve('prototype/index.html')).href;
  await page.goto(preview + '#grade');
  const grade = page.getByRole('region', { name: 'Grade por profissional' });
  await expect(grade.getByRole('table')).toHaveCount(2);
  await expect(grade.getByText('Confirmado', { exact: true })).toBeVisible();
  await grade.getByRole('button', { name: 'Horários livres' }).click();
  await expect(grade.getByRole('button', { name: 'Horários livres' })).toHaveAttribute('aria-pressed', 'true');
  await expect(grade.getByText('Confirmado', { exact: true })).toHaveCount(0);
  await expect(grade.getByText('Livre', { exact: true }).first()).toBeVisible();
  await grade.getByLabel('Profissional', { exact: true }).selectOption('clinica');
  await expect(grade.getByRole('table')).toHaveCount(1);
  await expect(grade.getByRole('heading', { name: 'Dra. Marina Lima' })).toBeVisible();
  await grade.getByRole('button', { name: 'Próximo dia' }).click();
  await expect(grade.getByLabel('Data da grade')).toHaveValue('2026-11-11');

  await page.goto(preview + '#historico');
  const history = page.getByRole('region', { name: 'Histórico de itens', exact: true });
  await expect(history.getByRole('row').filter({ hasText: 'Consulta clínica' })).toContainText('R$ 300,00');
  await history.getByRole('searchbox').fill('sem resultados');
  await expect(history.getByText('Nenhum item encontrado no histórico.')).toBeVisible();
  await history.getByRole('searchbox').fill('marina');
  await expect(history.getByText('Consulta clínica')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(await page.evaluate(() => innerWidth));

  await page.goto(preview + '#atendimentos');
  const atendimentos = page.getByRole('region', { name: 'Atendimentos', exact: true });
  const totais = atendimentos.getByRole('region', { name: 'Totais dos atendimentos filtrados' });
  await expect(atendimentos.getByRole('row').filter({ hasText: 'DEMO-240' })).toHaveCount(0);
  await atendimentos.getByLabel('Período dos atendimentos').selectOption('range');
  await atendimentos.getByLabel('Início').fill('2026-11-09');
  await expect(atendimentos.getByRole('row').filter({ hasText: 'DEMO-240' })).toBeVisible();
  await expect(totais).toContainText(/TOTAL RECEBIDO\s*R\$\s*474,25/);
  await expect(totais).toContainText(/TOTAL COBRADO\s*R\$\s*569,50/);
});
