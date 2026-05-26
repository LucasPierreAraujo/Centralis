// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('Gerenciamento de Usuários', () => {

  // Helper para fazer login
  async function fazerLogin(page, username, password) {
    await page.goto('/login');
    await page.fill('input[type="text"]', username);
    await page.fill('input[type="password"]', password);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/dashboard', { timeout: 15000 });
  }

  test.describe('Como Admin', () => {

    test.beforeEach(async ({ page }) => {
      await fazerLogin(page, 'AdminSabedoria', 'Sabedoria2025@');
    });

    test('deve acessar página de usuários', async ({ page }) => {
      // Clicar no card de Gerenciar Usuários
      await page.click('text=Gerenciar Usuários');

      // Verificar que está na página de usuários
      await expect(page).toHaveURL('/usuarios', { timeout: 10000 });
      await expect(page.locator('h1:has-text("Gerenciar Usuários")')).toBeVisible();
    });

    test('deve ver usuário Veneravel na lista', async ({ page }) => {
      await page.goto('/usuarios');

      // Verificar que Veneravel está visível (usar td específico para evitar múltiplos matches)
      await expect(page.locator('table td').filter({ hasText: /^Veneravel$/ })).toBeVisible({ timeout: 10000 });
    });

    test('deve criar novo usuário com permissões de secretaria', async ({ page }) => {
      await page.goto('/usuarios');

      // Clicar em Novo Usuário
      await page.click('button:has-text("Novo Usuário")');

      // Preencher formulário
      await page.fill('input[type="text"]', 'TesteSecretaria');
      await page.fill('input[type="password"]', 'Teste12345@');

      // Selecionar permissões de secretaria
      await page.check('input[type="checkbox"]:near(:text("Membros"))');
      await page.check('input[type="checkbox"]:near(:text("Atas"))');

      // Salvar
      await page.click('button:has-text("Salvar")');

      // Verificar mensagem de sucesso
      await expect(page.locator('text=sucesso')).toBeVisible({ timeout: 10000 });

      // Verificar que usuário aparece na lista
      await expect(page.locator('text=TesteSecretaria')).toBeVisible({ timeout: 5000 });
    });

    test('deve editar usuário existente', async ({ page }) => {
      await page.goto('/usuarios');

      // Aguardar lista carregar
      await page.waitForSelector('table', { timeout: 10000 });

      // Encontrar o usuário TesteSecretaria e clicar em editar
      const row = page.locator('tr:has-text("TesteSecretaria")');
      await row.locator('button[title="Editar"]').click();

      // Alterar nome
      await page.fill('input[type="text"]', 'TesteSecretariaEditado');

      // Salvar
      await page.click('button:has-text("Salvar")');

      // Verificar mensagem de sucesso
      await expect(page.locator('text=sucesso')).toBeVisible({ timeout: 10000 });

      // Verificar nome atualizado
      await expect(page.locator('text=TesteSecretariaEditado')).toBeVisible({ timeout: 5000 });
    });

    test('deve excluir usuário', async ({ page }) => {
      await page.goto('/usuarios');

      // Aguardar lista carregar
      await page.waitForSelector('table', { timeout: 10000 });

      // Encontrar o usuário e clicar em excluir
      const row = page.locator('tr:has-text("TesteSecretariaEditado")');
      await row.locator('button[title="Excluir"]').click();

      // Confirmar exclusão no modal
      await page.click('button:has-text("Excluir")');

      // Verificar mensagem de sucesso
      await expect(page.locator('text=excluído com sucesso')).toBeVisible({ timeout: 10000 });

      // Verificar que usuário não está mais na lista
      await expect(page.locator('text=TesteSecretariaEditado')).not.toBeVisible({ timeout: 5000 });
    });

  });

  test.describe('Como Veneravel', () => {

    test.beforeEach(async ({ page }) => {
      await fazerLogin(page, 'Veneravel', 'Veneravel2025@');
    });

    test('deve acessar página de usuários', async ({ page }) => {
      await page.click('text=Gerenciar Usuários');
      await expect(page).toHaveURL('/usuarios', { timeout: 10000 });
    });

    test('NÃO deve ver AdminSabedoria na lista', async ({ page }) => {
      await page.goto('/usuarios');

      // Aguardar lista carregar
      await page.waitForSelector('table', { timeout: 10000 });

      // AdminSabedoria NÃO deve aparecer
      await expect(page.locator('td:has-text("AdminSabedoria")')).not.toBeVisible();
    });

    test('deve ver a si mesmo na lista', async ({ page }) => {
      await page.goto('/usuarios');

      // Veneravel deve aparecer na lista (usar filtro exato para evitar múltiplos matches)
      await expect(page.locator('table td').filter({ hasText: /^Veneravel$/ })).toBeVisible({ timeout: 10000 });
    });

    test('deve poder alterar própria senha', async ({ page }) => {
      await page.goto('/usuarios');

      // Encontrar própria linha e clicar no botão de chave
      const row = page.locator('tr:has-text("Veneravel")');
      await row.locator('button[title="Alterar Minha Senha"]').click();

      // Verificar modal de alterar senha
      await expect(page.locator('h2:has-text("Alterar Senha")')).toBeVisible();

      // Fechar modal
      await page.click('button:has-text("Cancelar")');
    });

    test('deve poder criar novo usuário', async ({ page }) => {
      await page.goto('/usuarios');

      // Gerar nome único para evitar conflitos
      const nomeUsuario = `UsuarioVen${Date.now()}`;

      // Clicar em Novo Usuário
      await page.click('button:has-text("Novo Usuário")');

      // Preencher formulário
      await page.fill('input[type="text"]', nomeUsuario);
      await page.fill('input[type="password"]', 'Teste12345@');

      // Selecionar permissão
      await page.check('input[type="checkbox"]:near(:text("Presenças"))');

      // Salvar
      await page.click('button:has-text("Salvar")');

      // Verificar sucesso
      await expect(page.locator('text=sucesso')).toBeVisible({ timeout: 10000 });

      // Limpar: excluir o usuário criado
      await page.waitForTimeout(1000);
      const row = page.locator(`tr:has-text("${nomeUsuario}")`);
      await row.locator('button[title="Excluir"]').click();
      await page.click('button:has-text("Excluir")');
    });

  });

});
