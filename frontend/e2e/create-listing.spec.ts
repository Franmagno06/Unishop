import { expect, test, type Page } from '@playwright/test'

// Tela 06: anunciar item e pop-up "Anúncio publicado!" (dados de exemplo, só em memória).
// Entra pelo login e vai pelo botão do cabeçalho: recarregar a página apagaria o anúncio de exemplo.
async function loginAsStudent(page: Page) {
  await page.goto('/login')
  await page.getByLabel('E-mail institucional').fill('aluno.teste@edu.unifor.br')
  await page.getByLabel('Senha').fill('Senha1234')
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(page).toHaveURL('/categorias')
}

const png = { name: 'capa.png', mimeType: 'image/png', buffer: Buffer.from('iVBORw0KGgo=', 'base64') }

async function fillForm(page: Page, title: string) {
  await page.getByLabel('Nome do item *').fill(title)
  await page.getByLabel('Categoria *').selectOption({ label: 'Livros e apostilas' })
  await page.getByLabel('Descrição *').fill('Livro em ótimo estado, sem rasuras.')
  await page.getByLabel('Preço (R$) *').fill('45,50')
  await page.getByLabel(/Arraste fotos/).setInputFiles(png)
}

test.describe('Anunciar item · fluxo', () => {
  test('publica, vê o pop-up e encontra o anúncio no topo da categoria', async ({ page }) => {
    const consoleErrors: string[] = []
    page.on('console', (message) => message.type() === 'error' && consoleErrors.push(message.text()))
    page.on('pageerror', (error) => consoleErrors.push(error.message))

    await loginAsStudent(page)
    await page.getByRole('link', { name: '+ Anunciar item' }).click()
    await expect(page).toHaveURL('/anunciar')
    await expect(page.getByRole('heading', { level: 1, name: 'Anunciar item' })).toBeVisible()
    await expect(page.getByLabel('WhatsApp *')).toHaveValue('(85) 9 9999-0000')

    await fillForm(page, 'Anúncio de teste e2e')
    await page.getByRole('button', { name: 'Publicar anúncio' }).click()

    const dialog = page.getByRole('dialog', { name: 'Anúncio publicado!' })
    await expect(dialog).toBeVisible()
    await expect(dialog).toContainText('“Anúncio de teste e2e” já está visível para os alunos na categoria Livros e apostilas.')

    await dialog.getByRole('link', { name: 'Ver meu anúncio' }).click()
    await expect(page).toHaveURL('/categorias/1')
    await expect(page.getByText('49 anúncios de alunos da Unifor')).toBeVisible()
    await expect(page.getByRole('main').getByRole('heading', { level: 2 }).first()).toHaveText('Anúncio de teste e2e')
    expect(consoleErrors).toEqual([])
  })

  test('enviar vazio mostra os erros; Esc fecha o pop-up e o foco volta ao botão', async ({ page }) => {
    await loginAsStudent(page)
    await page.getByRole('link', { name: '+ Anunciar item' }).click()

    await page.getByRole('button', { name: 'Publicar anúncio' }).click()
    await expect(page.getByText('Informe o nome do item.')).toBeVisible()
    await expect(page.getByText('Envie pelo menos 1 foto.')).toBeVisible()
    await expect(page.getByLabel('Nome do item *')).toBeFocused()

    await fillForm(page, 'Teste de teclado')
    await page.getByRole('button', { name: 'Publicar anúncio' }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog')).toBeHidden()
    await expect(page.getByRole('button', { name: 'Publicar anúncio' })).toBeFocused()
  })

  test('recusa foto acima de 4 MB e arquivo que não é imagem', async ({ page }) => {
    await loginAsStudent(page)
    await page.getByRole('link', { name: '+ Anunciar item' }).click()

    const input = page.getByLabel(/Arraste fotos/)
    await input.setInputFiles({ name: 'grande.png', mimeType: 'image/png', buffer: Buffer.alloc(4 * 1024 * 1024 + 1) })
    await expect(page.getByText('“grande.png” passa de 4 MB.')).toBeVisible()
    await expect(page.getByText('0 de 5 fotos.')).toBeVisible()

    await input.setInputFiles({ name: 'doc.pdf', mimeType: 'application/pdf', buffer: Buffer.from('x') })
    await expect(page.getByText('“doc.pdf” não é JPG nem PNG.')).toBeVisible()
  })

  for (const width of [320, 390, 768, 1440]) {
    test(`sem rolagem horizontal em ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 })
      await loginAsStudent(page)
      await page.getByRole('link', { name: '+ Anunciar item' }).click()
      await expect(page.getByRole('button', { name: 'Publicar anúncio' })).toBeVisible()

      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
      expect(overflow).toBeLessThanOrEqual(0)
    })
  }
})
