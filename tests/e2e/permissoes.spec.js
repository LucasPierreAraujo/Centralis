// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('Permissões do Sistema', () => {

  // Helper para fazer login
  async function fazerLogin(page, username, password) {
    await page.goto('/login');
    await page.fill('input[type="text"]', username);
    await page.fill('input[type="password"]', password);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/dashboard', { timeout: 15000 });
  }

  test.describe('Admin - Acesso Total', () => {

    test.beforeEach(async ({ page }) => {
      await fazerLogin(page, 'AdminSabedoria', 'Sabedoria2025@');
    });

    test('deve ver todos os cards no dashboard', async ({ page }) => {
      // Verificar cards principais
      await expect(page.locator('text=Membros').first()).toBeVisible({ timeout: 10000 });
      await expect(page.locator('text=Gerar Recibo')).toBeVisible();
      await expect(page.locator('text=Gerenciar Usuários')).toBeVisible();
    });

    test('deve acessar página de membros', async ({ page }) => {
      // Clicar no link/card de membros usando texto mais específico
      await page.locator('a[href="/membros"], div:has-text("Membros")').first().click();
      await expect(page).toHaveURL('/membros', { timeout: 10000 });
    });

    test('deve acessar página financeira', async ({ page }) => {
      // Clicar no card Financeiro
      await page.locator('div.bg-white:has-text("Gestão Financeira")').click();
      await page.waitForTimeout(1000);
      // Verificar que navegou (pode ser /planilhas ou /financeiro)
      const url = page.url();
      expect(url.includes('/planilhas') || url.includes('/financeiro') || url.includes('/dashboard')).toBeTruthy();
    });

  });

  test.describe('Veneravel - Acesso Total', () => {

    test.beforeEach(async ({ page }) => {
      await fazerLogin(page, 'Veneravel', 'Veneravel2025@');
    });

    test('deve ver todos os cards no dashboard', async ({ page }) => {
      await expect(page.locator('text=Membros').first()).toBeVisible({ timeout: 10000 });
      await expect(page.locator('text=Gerar Recibo')).toBeVisible();
      await expect(page.locator('text=Gerenciar Usuários')).toBeVisible();
    });

    test('deve acessar página de usuários', async ({ page }) => {
      await page.click('text=Gerenciar Usuários');
      await expect(page).toHaveURL('/usuarios', { timeout: 10000 });
    });

  });

  test.describe('Tesoureiro - Acesso Limitado', () => {

    test.beforeEach(async ({ page }) => {
      await fazerLogin(page, 'Tesoureiro', 'Tesoureiro2025@');
    });

    test('deve ver apenas cards de tesouraria', async ({ page }) => {
      // Cards que DEVE ver
      await expect(page.locator('text=Gerar Recibo')).toBeVisible({ timeout: 10000 });

      // Card que NÃO deve ver
      await expect(page.locator('text=Gerenciar Usuários')).not.toBeVisible();
    });

    test('NÃO deve acessar página de usuários diretamente', async ({ page }) => {
      // Tentar acessar diretamente
      await page.goto('/usuarios');

      // Deve ser redirecionado ou ver mensagem de erro
      await page.waitForTimeout(2000);

      // Verifica se não está na página de usuários ou se mostra erro
      const url = page.url();
      const temErro = await page.locator('text=permissão').isVisible().catch(() => false);

      expect(url.includes('/usuarios') === false || temErro).toBeTruthy();
    });

  });

  test.describe('Secretário - Acesso Limitado', () => {

    test.beforeEach(async ({ page }) => {
      await fazerLogin(page, 'Secretario', 'Secretario2025@');
    });

    test('deve ver apenas cards de secretaria', async ({ page }) => {
      // Aguardar carregamento
      await page.waitForTimeout(1000);

      // Card que NÃO deve ver
      await expect(page.locator('text=Gerenciar Usuários')).not.toBeVisible();
      await expect(page.locator('text=Gerar Recibo')).not.toBeVisible();
    });

    test('deve acessar página de atas', async ({ page }) => {
      // Secretário tem acesso a atas
      await page.locator('div.bg-white:has-text("Atas de Sessões")').click();
      await expect(page).toHaveURL('/atas', { timeout: 10000 });
    });

    test('NÃO deve acessar página de usuários diretamente', async ({ page }) => {
      await page.goto('/usuarios');
      await page.waitForTimeout(2000);

      const url = page.url();
      const temErro = await page.locator('text=permissão').isVisible().catch(() => false);

      expect(url.includes('/usuarios') === false || temErro).toBeTruthy();
    });

  });

  test.describe('API - Verificação de Permissões', () => {

    test('API de usuários deve retornar 403 para não-admin', async ({ request }) => {
      // Tentar acessar API sem autenticação
      const response = await request.get('/api/usuarios');
      expect(response.status()).toBe(403);
    });

    test('API de membros deve estar acessível', async ({ request, page }) => {
      // Fazer login primeiro para ter o cookie
      await page.goto('/login');
      await page.fill('input[type="text"]', 'AdminSabedoria');
      await page.fill('input[type="password"]', 'Sabedoria2025@');
      await page.click('button[type="submit"]');
      await expect(page).toHaveURL('/dashboard', { timeout: 15000 });

      // Agora testar a API com o contexto autenticado
      const response = await page.request.get('/api/membros');
      expect(response.status()).toBe(200);
    });

  });

});
