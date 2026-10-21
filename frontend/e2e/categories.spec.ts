import { expect, test } from '@playwright/test'

// Fluxo da tela 04 sem backend: a tela inicial leva a /categorias pelo cabeçalho.
test.describe('Categorias', () => {
  test('da tela inicial até a lista, busca e clique num card', async ({ page }) => {
    const consoleErrors: string[] = []
    page.on('console', (message) => message.type() === 'error' && consoleErrors.push(message.text()))
    page.on('pageerror', (error) => consoleErrors.push(error.message))

    await page.goto('/')
    await page.getByRole('navigation', { name: 'Principal' }).getByRole('link', { name: 'Categorias' }).click()

    await expect(page).toHaveURL('/categorias')
    await expect(page.getByRole('heading', { level: 1, name: 'Categorias' })).toBeVisible()
    await expect(page.getByRole('main').getByRole('link', { name: /anúncios?$/ })).toHaveCount(6)

    const search = page.getByRole('searchbox', { name: 'Buscar item ou categoria' })
    await search.fill('alim')
    await expect(page).toHaveURL('/categorias?q=alim')
    await expect(page.getByRole('main').getByRole('link', { name: /anúncios?$/ })).toHaveCount(1)

    await search.fill('xyz')
    await expect(page.getByRole('heading', { name: 'Nenhuma categoria encontrada' })).toBeVisible()
    await page.getByRole('button', { name: 'Limpar busca' }).click()
    await expect(page.getByRole('main').getByRole('link', { name: /anúncios?$/ })).toHaveCount(6)

    await page.getByRole('link', { name: /Alimentos/ }).click()
    await expect(page).toHaveURL('/categorias/3')

    expect(consoleErrors).toEqual([])
  })

  test('abre com o link da busca e a navegação funciona só por teclado', async ({ page }) => {
    await page.goto('/categorias?q=livros')
    await expect(page.getByRole('searchbox')).toHaveValue('livros')
    await expect(page.getByRole('link', { name: /Livros e apostilas/ })).toBeVisible()

    await page.goto('/categorias')
    await expect(page.getByRole('heading', { level: 1, name: 'Categorias' })).toBeVisible()
    await page.keyboard.press('Tab')
    await expect(page.getByRole('link', { name: 'Ir para o conteúdo' })).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(page.getByRole('main')).toBeFocused()
  })

  for (const width of [320, 390, 768, 1440]) {
    test(`sem rolagem horizontal em ${width} px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 })
      await page.goto('/categorias')
      await expect(page.getByRole('link', { name: /Livros e apostilas/ })).toBeVisible()

      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > window.innerWidth,
      )
      expect(overflow).toBe(false)
    })
  }
})
