import { expect, test } from '@playwright/test';

test('a versão compilada mostra a tela de homologação e carrega os estilos', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));

  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Projeto Piloto' })).toBeVisible();
  await expect(page.getByText('Homologação', { exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Verificar status técnico' })).toBeVisible();
  const layout = await page.evaluate(() => ({
    style: getComputedStyle(document.body).backgroundColor,
    overflow: document.documentElement.scrollWidth > window.innerWidth,
  }));
  expect(layout.style).toBe('rgb(241, 246, 244)');
  expect(layout.overflow).toBe(false);
  expect(errors).toEqual([]);
});

test('a rota de saúde informa o ambiente em execução', async ({ request }) => {
  const response = await request.get('/api/saude');
  expect(response.ok()).toBe(true);
  expect(response.headers()['cache-control']).toContain('no-store');
  expect(await response.json()).toEqual({ status: 'ok', ambiente: 'homologacao' });
});
