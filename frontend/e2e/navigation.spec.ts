import { expect, test } from '@playwright/test'

// Botão "← Voltar" das telas de entrada: volta para a tela anterior do site; se a tela foi aberta
// direto, vai ao destino padrão.
test.describe('Voltar nas telas de entrada', () => {
  test('cadastro aberto direto: Voltar leva à tela inicial', async ({ page }) => {
    await page.goto('/cadastro')
    await page.getByRole('link', { name: 'Voltar' }).click()

    await expect(page).toHaveURL('/')
    await expect(page.getByRole('heading', { level: 1, name: /O comércio da Unifor/ })).toBeVisible()
  })

  test('login aberto direto: Voltar leva à tela inicial', async ({ page }) => {
    await page.goto('/login')
    await page.getByRole('link', { name: 'Voltar' }).click()
    await expect(page).toHaveURL('/')
  })

  test('do login para o cadastro: Voltar devolve ao login, e depois à tela inicial', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('banner').getByRole('link', { name: 'Entrar' }).click()
    await expect(page).toHaveURL('/login')

    await page.getByRole('link', { name: 'Não tem conta? Criar conta' }).click()
    await expect(page).toHaveURL('/cadastro')

    await page.getByRole('link', { name: 'Voltar' }).click()
    await expect(page).toHaveURL('/login')

    await page.getByRole('link', { name: 'Voltar' }).click()
    await expect(page).toHaveURL('/')
  })

  test('do cadastro para o login: Voltar devolve ao cadastro', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('banner').getByRole('link', { name: 'Criar conta' }).click()
    await page.getByRole('link', { name: 'Já tem conta? Entrar' }).click()
    await expect(page).toHaveURL('/login')

    await page.getByRole('link', { name: 'Voltar' }).click()
    await expect(page).toHaveURL('/cadastro')
  })

  test('funciona só pelo teclado', async ({ page }) => {
    await page.goto('/cadastro')
    await expect(page.getByRole('heading', { level: 1, name: 'Criar conta' })).toBeVisible()

    await page.getByRole('link', { name: 'Voltar' }).focus()
    await page.keyboard.press('Enter')

    await expect(page).toHaveURL('/')
  })
})
