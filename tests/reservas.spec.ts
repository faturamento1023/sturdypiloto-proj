import { expect, test } from '@playwright/test';

test('recepção reserva na grade e a cota barra a segunda vaga', async ({ page, context }, info) => {
  const dia = info.project.name === 'desktop' ? '2030-11-08' : '2030-11-09';
  await page.goto('/entrar');
  await page.getByLabel('E-mail', { exact: true }).fill(`painel-${info.project.name}@example.com`);
  await page.getByLabel('Senha', { exact: true }).fill('Piloto-ficticio-123');
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await page.getByLabel('Código do autenticador', { exact: true }).fill('123456');
  await page.getByRole('button', { name: 'Verificar acesso', exact: true }).click();
  await page.getByRole('link', { name: 'Abrir painel' }).click();
  expect((await context.request.get('/painel?modulo=agenda&configuracaoAgenda=cotas')).status()).toBe(404);
  await page.goto(`/painel?modulo=agenda&dataAgenda=${dia}`);

  const iris = page.getByRole('region', { name: 'Dra. Íris Fictícia' });
  const reserva = page.getByRole('region', { name: 'Nova reserva' });
  const preencher = async () => {
    await iris.getByRole('link', { name: 'Reservar', exact: true }).click();
    await reserva.getByRole('searchbox').fill('Paciente sintético reservado');
    await reserva.getByRole('button', { name: 'Pesquisar', exact: true }).click();
    await reserva.getByRole('button', { name: 'Selecionar Paciente sintético reservado' }).click();
    await reserva.getByLabel('Convênio', { exact: true }).selectOption({ label: 'Convênio fictício da reserva' });
    await reserva.getByLabel('Procedimento', { exact: true }).selectOption({ label: 'Procedimento da tabela' });
    await reserva.getByRole('button', { name: 'Confirmar reserva' }).click();
  };
  await preencher();
  await expect(reserva.getByRole('status')).toContainText('Reserva criada.');
  await reserva.getByRole('link', { name: 'Voltar à grade' }).click();
  await expect(iris.getByRole('row').filter({ hasText: /08:00 a 08:30\s*Reservado/ })).toBeVisible();
  await preencher();
  await expect(reserva.getByRole('alert')).toContainText('A cota');
});
