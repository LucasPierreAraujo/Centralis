// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('Autenticação', () => {

  test.beforeEach(async ({ page }) => {
    // Ir para página de login antes de cada teste
    await page.goto('/login');
  });

  test('deve mostrar página de login', async ({ page }) => {
    // Verificar elementos da página de login
    await expect(page.locator('input[type="text"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('deve mostrar erro com credenciais inválidas', async ({ page }) => {
    // Preencher credenciais inválidas
    await page.fill('input[type="text"]', 'usuariofalso');
    await page.fill('input[type="password"]', 'senhaerrada');
    await page.click('button[type="submit"]');

    // Aguardar mensagem de erro
    await expect(page.locator('text=incorretos')).toBeVisible({ timeout: 10000 });
  });

  test('deve fazer login com AdminSabedoria', async ({ page }) => {
    // Preencher credenciais válidas
    await page.fill('input[type="text"]', 'AdminSabedoria');
    await page.fill('input[type="password"]', 'Sabedoria2025@');
    await page.click('button[type="submit"]');

    // Aguardar redirecionamento para dashboard
    await expect(page).toHaveURL('/dashboard', { timeout: 15000 });

    // Verificar que está no dashboard (verifica se tem algum card visível)
    await expect(page.locator('text=Membros').first()).toBeVisible({ timeout: 10000 });
  });

  test('deve fazer login com Veneravel', async ({ page }) => {
    await page.fill('input[type="text"]', 'Veneravel');
    await page.fill('input[type="password"]', 'Veneravel2025@');
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL('/dashboard', { timeout: 15000 });
    await expect(page.locator('text=Membros').first()).toBeVisible({ timeout: 10000 });
  });

  test('deve fazer logout corretamente', async ({ page }) => {
    // Fazer login primeiro
    await page.fill('input[type="text"]', 'AdminSabedoria');
    await page.fill('input[type="password"]', 'Sabedoria2025@');
    await page.click('button[type="submit"]');

    // Aguardar dashboard carregar
    await expect(page).toHaveURL('/dashboard', { timeout: 15000 });

    // Clicar no botão de logout (pelo title ou aria-label)
    await page.click('button[title="Sair"]');

    // Verificar redirecionamento para login
    await expect(page).toHaveURL('/login', { timeout: 10000 });
  });

  test('deve redirecionar para login se não autenticado', async ({ page }) => {
    // Tentar acessar dashboard diretamente sem login
    await page.goto('/dashboard');

    // Deve redirecionar para login
    await expect(page).toHaveURL('/login', { timeout: 15000 });
  });

});
