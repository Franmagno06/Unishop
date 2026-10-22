import { expect, test, type Page } from '@playwright/test'

// Tela 07: anúncios de uma categoria, com rolagem infinita, filtros e ordem (dados de exemplo).
const cards = (page: Page) => page.getByRole('main').getByRole('link', { name: /R\$/ })

async function scrollUntil(page: Page, count: number) {
  await expect
    .poll(
      async () => {
        await page.keyboard.press('End')
        return cards(page).count()
      },
      { timeout: 20_000, intervals: [150, 300, 500] },
    )
    .toBe(count)
}

const priceOf = async (card: ReturnType<typeof cards>) => {
  const text = (await card.first().textContent()) ?? ''
  const [, value] = /R\$\s*([\d.]+,\d\d)/.exec(text) ?? []
  return Number(value!.replace('.', '').replace(',', '.'))
}

test.describe('Anúncios da categoria · fluxo', () => {
  test('de Categorias para a lista: título, total e 12 anúncios', async ({ page }) => {
    const consoleErrors: string[] = []
    page.on('console', (message) => message.type() === 'error' && consoleErrors.push(message.text()))
    page.on('pageerror', (error) => consoleErrors.push(error.message))

    await page.goto('/categorias')
    await page.getByRole('link', { name: /Livros e apostilas/ }).click()

    await expect(page).toHaveURL('/categorias/1')
    await expect(page.getByRole('heading', { level: 1, name: 'Livros e apostilas' })).toBeVisible()
    await expect(page.getByText('48 anúncios de alunos da Unifor')).toBeVisible()
    await expect(cards(page)).toHaveCount(12)
    await expect(page.getByRole('heading', { level: 2, name: 'Cálculo I — Guidorizzi, vol. 1' })).toBeVisible()
    expect(consoleErrors).toEqual([])
  })

  test('as contagens de Categorias batem com o total de cada lista', async ({ page }) => {
    await page.goto('/categorias')
    await expect(page.getByRole('main').getByRole('link')).toHaveCount(6)
    const counts = await page.getByRole('main').getByRole('link').allTextContents()
    expect(counts.map((text) => /(\d+) anúncios?/.exec(text)?.[1])).toEqual(['48', '21', '35', '27', '12', '9'])

    for (const [id, total] of [[2, 21], [5, 12], [6, 9]] as const) {
      await page.goto(`/categorias/${id}`)
      await expect(page.getByText(`${total} anúncios de alunos da Unifor`)).toBeVisible()
    }
  })

  test('rolar até o fim carrega 12, 24, 36 e 48 anúncios, sem repetir, e avisa o fim', async ({ page }) => {
    await page.goto('/categorias/1')
    await expect(cards(page)).toHaveCount(12)

    await scrollUntil(page, 48)

    await expect(page.getByText('Você viu todos os 48 anúncios.')).toBeVisible()
    const hrefs = await cards(page).evaluateAll((links) => links.map((link) => link.getAttribute('href')))
    expect(new Set(hrefs).size).toBe(48)
  })

  test('uma categoria com poucos anúncios mostra todos de uma vez, sem esperar a rolagem', async ({ page }) => {
    await page.goto('/categorias/6')
    await expect(cards(page)).toHaveCount(9)
    await expect(page.getByText('Você viu todos os 9 anúncios.')).toBeVisible()
  })

  test('o link "← Categorias" volta para a lista de categorias', async ({ page }) => {
    await page.goto('/categorias/1')
    await page.getByRole('link', { name: 'Categorias', exact: true }).first().click()
    await expect(page).toHaveURL('/categorias')
  })

  test('clicar num anúncio leva à página do produto', async ({ page }) => {
    await page.goto('/categorias/1')
    await cards(page).first().click()
    await expect(page).toHaveURL(/\/produtos\/\d+$/)
  })

  test('os cards de uma mesma linha têm a mesma altura', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('/categorias/1')
    await expect(cards(page)).toHaveCount(12)

    const heights = await cards(page).evaluateAll((links) => links.slice(0, 8).map((link) => Math.round(link.getBoundingClientRect().height)))
    expect(new Set(heights.slice(0, 4)).size).toBe(1)
    expect(new Set(heights.slice(4, 8)).size).toBe(1)
  })
})

test.describe('Anúncios da categoria · filtros e ordem', () => {
  test('"No campus" filtra, mostra o total e guarda o filtro na URL', async ({ page }) => {
    await page.goto('/categorias/1')
    await expect(cards(page)).toHaveCount(12)

    await page.getByRole('button', { name: 'No campus' }).click()

    await expect(page).toHaveURL('/categorias/1?contato=campus')
    await expect(page.getByText('16 anúncios de alunos da Unifor')).toBeVisible()
    await expect(page.getByRole('button', { name: 'No campus' })).toHaveAttribute('aria-pressed', 'true')
    await expect(cards(page)).toHaveCount(12)
    for (const text of await cards(page).allTextContents()) expect(text).toMatch(/Bloco \w · Horário \w+/)

    await scrollUntil(page, 16)
  })

  test('"Pagamento no site" e "WhatsApp" mostram só o seu tipo; "Todos" limpa', async ({ page }) => {
    await page.goto('/categorias/1')
    await expect(cards(page)).toHaveCount(12)

    await page.getByRole('button', { name: 'WhatsApp' }).click()
    await expect(page).toHaveURL('/categorias/1?contato=whatsapp')
    await expect.poll(async () => (await cards(page).allTextContents()).every((t) => t.includes('WhatsApp'))).toBe(true)

    await page.getByRole('button', { name: 'Pagamento no site' }).click()
    await expect(page).toHaveURL('/categorias/1?contato=site')
    await expect.poll(async () => (await cards(page).allTextContents()).every((t) => t.includes('Pagamento no site'))).toBe(true)

    await page.getByRole('button', { name: 'Todos' }).click()
    await expect(page).toHaveURL('/categorias/1')
    await expect(page.getByText('48 anúncios de alunos da Unifor')).toBeVisible()
  })

  test('"Ordenar por → Menor preço" mostra o mais barato primeiro; "Maior preço", o mais caro', async ({ page }) => {
    await page.goto('/categorias/1')
    await expect(cards(page)).toHaveCount(12)

    await page.getByLabel('Ordenar por').selectOption({ label: 'Menor preço' })
    await expect(page).toHaveURL('/categorias/1?ordem=menor-preco')
    await expect.poll(() => priceOf(cards(page))).toBe(15)

    await page.getByLabel('Ordenar por').selectOption({ label: 'Maior preço' })
    await expect(page).toHaveURL('/categorias/1?ordem=maior-preco')
    await expect.poll(() => priceOf(cards(page))).toBeGreaterThan(90)

    await page.getByLabel('Ordenar por').selectOption({ label: 'Mais recentes' })
    await expect(page).toHaveURL('/categorias/1')
    await expect.poll(() => priceOf(cards(page))).toBe(45)
  })

  test('o link com filtro e ordem abre já configurado (compartilhável)', async ({ page }) => {
    await page.goto('/categorias/1?contato=whatsapp&ordem=maior-preco')

    await expect(page.getByRole('button', { name: 'WhatsApp' })).toHaveAttribute('aria-pressed', 'true')
    await expect(page.getByLabel('Ordenar por')).toHaveValue('price_desc')
    await expect(cards(page).first()).toContainText('WhatsApp')
  })

  test('trocar o filtro depois de rolar volta para os primeiros anúncios', async ({ page }) => {
    await page.goto('/categorias/1')
    await scrollUntil(page, 24)

    await page.getByRole('button', { name: 'No campus' }).click()

    await expect.poll(() => cards(page).count()).toBeLessThanOrEqual(12)
  })

  test('o "Voltar" do navegador não passa por cada filtro clicado', async ({ page }) => {
    await page.goto('/categorias')
    await page.getByRole('link', { name: /Livros e apostilas/ }).click()
    await page.getByRole('button', { name: 'No campus' }).click()
    await page.getByRole('button', { name: 'WhatsApp' }).click()
    await page.getByRole('button', { name: 'Pagamento no site' }).click()

    await page.goBack()

    await expect(page).toHaveURL('/categorias')
  })
})

test.describe('Anúncios da categoria · teclado e erros', () => {
  test('o botão escondido "Carregar mais anúncios" aparece com o foco e carrega a próxima página', async ({ page }) => {
    await page.goto('/categorias/1')
    await expect(cards(page)).toHaveCount(12)

    const button = page.getByRole('button', { name: 'Carregar mais anúncios' })
    await button.focus()
    await expect(button).toBeVisible()
    await page.keyboard.press('Enter')

    // Focar o botão já rola até o fim da lista (e a rolagem carrega); o Enter pede mais uma página.
    // O importante: o botão é alcançável e usável só pelo teclado e a lista cresce.
    await expect.poll(() => cards(page).count()).toBeGreaterThanOrEqual(24)
  })

  test('categoria que não existe: aviso e caminho de volta', async ({ page }) => {
    await page.goto('/categorias/99')
    await expect(page.getByRole('heading', { name: 'Categoria não encontrada' })).toBeVisible()

    await page.getByRole('link', { name: 'Ver todas as categorias' }).click()
    await expect(page).toHaveURL('/categorias')
  })

  test('endereço com texto no lugar do número também mostra "não encontrada"', async ({ page }) => {
    await page.goto('/categorias/abc')
    await expect(page.getByRole('heading', { name: 'Categoria não encontrada' })).toBeVisible()
  })

  test('logado, o cabeçalho continua o de aluno nesta tela', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel('E-mail institucional').fill('aluno.teste@edu.unifor.br')
    await page.getByLabel('Senha', { exact: true }).fill('Senha1234')
    await page.getByRole('button', { name: 'Entrar' }).click()
    await expect(page).toHaveURL('/categorias')

    await page.getByRole('link', { name: /Eletrônicos/ }).click()

    await expect(page).toHaveURL('/categorias/2')
    await expect(page.getByRole('banner').getByRole('link', { name: '+ Anunciar item' })).toBeVisible()
    await expect(page.getByRole('banner').getByRole('button', { name: 'Minha conta' })).toBeVisible()
  })
})

test.describe('Anúncios da categoria · responsivo', () => {
  for (const [width, columns] of [[1440, 4], [1280, 4], [1024, 3], [768, 3], [600, 2], [390, 1], [320, 1]] as const) {
    test(`em ${width} px: ${columns} coluna(s) e sem rolagem horizontal`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 })
      await page.goto('/categorias/1')
      await expect(cards(page)).toHaveCount(12)

      const lefts = await cards(page).evaluateAll((links) => links.slice(0, 8).map((link) => Math.round(link.getBoundingClientRect().left)))
      expect(new Set(lefts).size).toBe(columns)

      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)
      expect(overflow).toBe(false)
    })
  }

  test('no celular os filtros quebram em linhas e continuam clicáveis', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 800 })
    await page.goto('/categorias/1')

    for (const name of ['Todos', 'Pagamento no site', 'No campus', 'WhatsApp']) {
      await expect(page.getByRole('button', { name })).toBeVisible()
    }
    await page.getByRole('button', { name: 'WhatsApp' }).click()
    await expect(page).toHaveURL('/categorias/1?contato=whatsapp')
  })
})
