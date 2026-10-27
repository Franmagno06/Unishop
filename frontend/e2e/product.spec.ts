import { expect, test, type Page } from '@playwright/test'

// Telas 08a e 08d: página do produto e pop-up "Fazer pedido" (dados de exemplo).
// Entra pelo login e navega pelo site: recarregar a página apagaria os anúncios publicados.
async function loginAsStudent(page: Page) {
  await page.goto('/login')
  await page.getByLabel('E-mail institucional').fill('aluno.teste@edu.unifor.br')
  await page.getByLabel('Senha').fill('Senha1234')
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(page).toHaveURL('/categorias')
}

const photo = (name: string) => ({ name, mimeType: 'image/png', buffer: Buffer.from('iVBORw0KGgo=', 'base64') })

test.describe('Produto · fluxo', () => {
  test('da lista da categoria ao produto: dados, galeria de 3 fotos e pop-up', async ({ page }) => {
    const consoleErrors: string[] = []
    page.on('console', (message) => message.type() === 'error' && consoleErrors.push(message.text()))
    page.on('pageerror', (error) => consoleErrors.push(error.message))

    await loginAsStudent(page)
    await page.getByRole('link', { name: /Livros e apostilas/ }).click()
    await page.getByRole('link', { name: /Cálculo I — Guidorizzi/ }).click()

    await expect(page).toHaveURL('/produtos/1')
    await expect(page.getByRole('heading', { level: 1, name: 'Cálculo I — Guidorizzi, vol. 1' })).toBeVisible()
    await expect(page.getByText('R$ 45,00').first()).toBeVisible()
    await expect(page.getByText('Ana Lima')).toBeVisible()
    await expect(page.getByText('Aluno(a) verificado(a) · Engenharia Civil')).toBeVisible()

    const main = page.getByRole('img', { name: /foto \d de 3/ })
    await expect(main).toHaveAccessibleName(/foto 1 de 3/)
    await page.getByRole('button', { name: 'Ver foto 3 de 3' }).click()
    await expect(main).toHaveAccessibleName(/foto 3 de 3/)

    const order = page.getByRole('button', { name: /^Fazer pedido/ })
    await order.click()
    const dialog = page.getByRole('dialog', { name: 'Como você quer fazer o pedido?' })
    await expect(dialog).toBeVisible()
    await expect(dialog).toContainText('vendido por Ana Lima')

    // o contato por WhatsApp ainda não leva a lugar nenhum: só avisa (o pagamento está em checkout.spec.ts)
    await dialog.getByRole('button', { name: /Entrar em contato com o vendedor/ }).click()
    await expect(dialog.getByRole('status')).toContainText('ainda não está disponível')
    await expect(page).toHaveURL('/produtos/1')

    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()
    await expect(order).toBeFocused()
    expect(consoleErrors).toEqual([])
  })

  test('botão anima a escala ao pressionar', async ({ page }) => {
    await loginAsStudent(page)
    await page.goto('/produtos/1')
    const transition = await page.getByRole('button', { name: /^Fazer pedido/ }).evaluate((el) => getComputedStyle(el).transitionProperty)
    expect(transition).toContain('scale')
  })

  test('com movimento reduzido o pop-up só esmaece', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await loginAsStudent(page)
    await page.goto('/produtos/1')
    await page.getByRole('button', { name: /^Fazer pedido/ }).click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    expect(await dialog.evaluate((el) => getComputedStyle(el).transitionProperty)).toBe('opacity')
  })

  test('controles não selecionam texto ao segurar; conteúdo continua copiável', async ({ page }) => {
    await loginAsStudent(page)
    await page.goto('/produtos/1')
    const order = page.getByRole('button', { name: /^Fazer pedido/ })
    expect(await order.evaluate((el) => getComputedStyle(el).userSelect)).toBe('none')
    const text = page.getByText(/Livro em ótimo estado/)
    expect(await text.evaluate((el) => getComputedStyle(el).userSelect)).not.toBe('none')
    await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content', '#ffffff')
    await order.click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    expect(await dialog.locator('xpath=..').evaluate((el) => getComputedStyle(el).overscrollBehaviorY)).toBe('contain')
  })

  test('anúncio publicado com 2 fotos: capa no card da categoria e as duas na galeria do produto', async ({ page }) => {
    await loginAsStudent(page)
    await page.getByRole('link', { name: '+ Anunciar item' }).click()

    await page.getByLabel('Nome do item *').fill('Anúncio com fotos e2e')
    await page.getByLabel('Categoria *').selectOption({ label: 'Livros e apostilas' })
    await page.getByLabel('Descrição *').fill('Descrição do anúncio de teste com fotos.')
    await page.getByLabel('Preço (R$) *').fill('30')
    await page.getByLabel(/Arraste fotos/).setInputFiles([photo('primeira.png'), photo('segunda.png')])
    await page.getByRole('button', { name: 'Publicar', exact: true }).click()
    await page.getByRole('dialog').getByRole('link', { name: 'Meu anúncio', exact: true }).click()

    // a primeira foto aparece no card (era o bug: o card ficava sem imagem)
    const card = page.getByRole('link', { name: /Anúncio com fotos e2e/ })
    await expect(card.locator('img')).toHaveAttribute('src', /^blob:/)

    // no produto, as duas fotos estão na galeria e o dono não vê o botão de pedido
    await card.click()
    await expect(page.getByRole('heading', { level: 1, name: 'Anúncio com fotos e2e' })).toBeVisible()
    await expect(page.getByRole('img', { name: /foto 1 de 2/ })).toHaveAttribute('src', /^blob:/)
    await page.getByRole('button', { name: 'Ver foto 2 de 2' }).click()
    await expect(page.getByRole('img', { name: /foto 2 de 2/ })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Este é o seu anúncio' })).toBeVisible()
    await expect(page.getByRole('button', { name: /Fazer pedido/ })).toHaveCount(0)
  })

  test('anúncio que não existe mostra "Anúncio indisponível"', async ({ page }) => {
    await loginAsStudent(page)
    await page.goto('/produtos/999999')
    await expect(page.getByRole('heading', { name: 'Anúncio indisponível' })).toBeVisible()
    await page.getByRole('link', { name: 'Categorias', exact: true }).click()
    await expect(page).toHaveURL('/categorias')
  })

  test('visitante: Fazer pedido leva ao login e, depois de entrar, volta ao produto', async ({ page }) => {
  await page.goto('/produtos/1')
  await page.getByRole('button', { name: /^Fazer pedido/ }).click()
  await expect(page).toHaveURL('/login')

  await page.getByLabel('E-mail institucional').fill('aluno.teste@edu.unifor.br')
  await page.getByLabel('Senha').fill('Senha1234')
  await page.getByRole('button', { name: 'Entrar' }).click()

  await expect(page).toHaveURL('/produtos/1')
  await expect(page.getByRole('button', { name: /^Fazer pedido/ })).toBeVisible()
})


  for (const width of [320, 390, 768, 1440]) {
    test(`produto e pop-up sem rolagem horizontal em ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 })
      await loginAsStudent(page)
      await page.goto('/produtos/1')
      await page.getByRole('button', { name: /^Fazer pedido/ }).click()
      await expect(page.getByRole('dialog')).toBeVisible()

      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      )
      expect(overflow).toBeLessThanOrEqual(0)
    })
  }
})
