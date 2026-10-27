import { expect, test, type Page } from '@playwright/test'

// Telas 09a, 09b e 10: pagamento (cartão e Pix) e pedido confirmado, com dados de exemplo.
// Entra pelo login e navega pelo site: recarregar a página apagaria os pedidos de exemplo.
async function loginAsStudent(page: Page) {
  await page.goto('/login')
  await page.getByLabel('E-mail institucional').fill('aluno.teste@edu.unifor.br')
  await page.getByLabel('Senha').fill('Senha1234')
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(page).toHaveURL('/categorias')
}

async function openPayment(page: Page) {
  await page.getByRole('link', { name: /Livros e apostilas/ }).click()
  await page.getByRole('link', { name: /Cálculo I — Guidorizzi/ }).click()
  await page.getByRole('button', { name: /^Fazer pedido/ }).click()
  await page.getByRole('button', { name: /Seguir para o pagamento/ }).click()
  await expect(page).toHaveURL(/\/pagamento\/\d+$/)
  await expect(page.getByRole('heading', { level: 1, name: 'Pagamento' })).toBeVisible()
}

async function fillCard(page: Page, number: string) {
  await page.getByLabel('Número do cartão').fill(number)
  await page.getByLabel('Nome impresso no cartão').fill('Aluno Teste')
  await page.getByLabel('Validade').fill('1299')
  await page.getByLabel('CVV').fill('123')
}

function watchConsole(page: Page) {
  const errors: string[] = []
  page.on('console', (message) => message.type() === 'error' && errors.push(message.text()))
  page.on('pageerror', (error) => errors.push(error.message))
  return errors
}

test.describe('Pagamento · fluxo', () => {
  test('cartão aprovado: do produto à confirmação', async ({ page }) => {
    const consoleErrors = watchConsole(page)
    await loginAsStudent(page)
    await openPayment(page)

    await expect(page.getByText('Ambiente de demonstração').first()).toBeVisible()
    await expect(page.getByRole('region', { name: 'Resumo do pedido' })).toContainText('Vendido por Ana Lima')
    await expect(page.getByRole('region', { name: 'Resumo do pedido' })).toContainText('R$ 45,00')

    await fillCard(page, '4111111111111111')
    await page.getByRole('button', { name: /^Pagar R\$/ }).click()

    await expect(page).toHaveURL(/\/pedido-confirmado\/\d+$/)
    await expect(page.getByRole('heading', { level: 1, name: 'Pagamento confirmado!' })).toBeVisible()
    await expect(page.getByText(/#UNI-\d{4}-\d{4}/)).toBeVisible()
    await expect(page.getByText('Cálculo I — Guidorizzi, vol. 1')).toBeVisible()
    await expect(page.getByRole('link', { name: /Contato do vendedor/ })).toHaveAttribute('href', /^https:\/\/wa\.me\/55/)

    await page.getByRole('link', { name: 'Continuar comprando' }).click()
    await expect(page).toHaveURL('/categorias')
    expect(consoleErrors).toEqual([])
  })

  test('cartão recusado: mostra o erro e deixa tentar de novo no mesmo pedido', async ({ page }) => {
    await loginAsStudent(page)
    await openPayment(page)
    const paymentUrl = page.url()

    await fillCard(page, '4000000000000002')
    await page.getByRole('button', { name: /^Pagar R\$/ }).click()
    await expect(page.getByRole('alert')).toContainText('O pagamento foi recusado')
    expect(page.url()).toBe(paymentUrl)

    await page.getByLabel('Número do cartão').fill('4111111111111111')
    await page.getByRole('button', { name: /^Pagar R\$/ }).click()
    await expect(page.getByRole('heading', { name: 'Pagamento confirmado!' })).toBeVisible()
  })

  test('cartão sem estoque na liquidação: aviso de estorno', async ({ page }) => {
    await loginAsStudent(page)
    await openPayment(page)

    await fillCard(page, '4000000000000119')
    await page.getByRole('button', { name: /^Pagar R\$/ }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'Pedido cancelado' })).toBeVisible()
    await expect(page.getByRole('alert')).toContainText('Seu valor será estornado')
  })

  test('Pix: código, "Já paguei" e confirmação', async ({ page }) => {
    await loginAsStudent(page)
    await openPayment(page)

    await page.getByRole('tab', { name: 'Pix' }).click()
    await expect(page.getByRole('heading', { name: 'Pague com Pix em segundos' })).toBeVisible()
    await expect(page.getByLabel('Código Pix copia e cola')).toHaveValue(/^00020126580014br\.gov\.bcb\.pix/)
    await expect(page.locator('time')).toContainText(/\d{2}:\d{2}/)

    await page.getByRole('button', { name: 'Já paguei' }).click()
    await expect(page).toHaveURL(/\/pedido-confirmado\/\d+$/)
    await expect(page.getByRole('heading', { name: 'Pagamento confirmado!' })).toBeVisible()
  })

  test('Pix expirado: pedido cancelado e link para fazer um novo', async ({ page }) => {
    await loginAsStudent(page)
    await openPayment(page)

    await page.getByRole('tab', { name: 'Pix' }).click()
    await page.getByRole('button', { name: 'Simular Pix expirado' }).click()
    await expect(page.getByRole('heading', { name: 'Pedido cancelado' })).toBeVisible()
    await page.getByRole('link', { name: 'Novo pedido', exact: true }).click()
    await expect(page).toHaveURL('/produtos/1')
  })

  test('formulário vazio mostra os erros e não paga', async ({ page }) => {
    await loginAsStudent(page)
    await openPayment(page)

    await page.getByRole('button', { name: /^Pagar R\$/ }).click()
    await expect(page.getByText('Informe o número do cartão.')).toBeVisible()
    await expect(page.getByText('Informe o CVV.')).toBeVisible()
    await expect(page).toHaveURL(/\/pagamento\/\d+$/)
  })

  test('as abas funcionam pelo teclado', async ({ page }) => {
    await loginAsStudent(page)
    await openPayment(page)

    await page.getByRole('tab', { name: 'Cartão de crédito' }).focus()
    await page.keyboard.press('ArrowRight')
    await expect(page.getByRole('tab', { name: 'Pix' })).toBeFocused()
    await expect(page.getByRole('tab', { name: 'Pix' })).toHaveAttribute('aria-selected', 'true')
  })
})

test.describe('Pagamento · celular e telas pequenas', () => {
  for (const width of [320, 390, 768, 1440]) {
    test(`sem rolagem horizontal em ${width}px (cartão e Pix)`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 })
      await loginAsStudent(page)
      await openPayment(page)

      const overflows = () =>
        page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)
      expect(await overflows()).toBe(false)

      await page.getByRole('tab', { name: 'Pix' }).click()
      await expect(page.getByRole('heading', { name: 'Pague com Pix em segundos' })).toBeVisible()
      expect(await overflows()).toBe(false)

      await page.getByRole('button', { name: 'Já paguei' }).click()
      await expect(page.getByRole('heading', { name: 'Pagamento confirmado!' })).toBeVisible()
      expect(await overflows()).toBe(false)
    })
  }
})
