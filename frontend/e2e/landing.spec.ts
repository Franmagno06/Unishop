import { expect, test, type Page } from '@playwright/test'

// Carrossel "Anúncios recentes" da tela inicial (RF001): além do toque e das setas, o mouse arrasta.
// Entra como visitante, sem login.
const track = (page: Page) => page.locator('ul[aria-label="Lista de anúncios recentes"]')
const dots = (page: Page) =>
  page.locator('section[aria-labelledby="recentes-titulo"] > div[aria-hidden="true"] > span')
const scrollLeft = (page: Page) => track(page).evaluate((el) => el.scrollLeft)

// Espera a rolagem assentar: duas leituras seguidas iguais.
async function settledScrollLeft(page: Page) {
  let previous = -1
  await expect
    .poll(async () => {
      const current = await scrollLeft(page)
      const stable = current === previous
      previous = current
      return stable
    })
    .toBe(true)
  return previous
}

async function firstCardCenter(page: Page) {
  const box = await track(page).locator('li').first().boundingBox()
  if (!box) throw new Error('Primeiro card sem posição')
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
}

test.describe('Carrossel de anúncios recentes', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await track(page).scrollIntoViewIfNeeded()
  })

  test('arrastar com o mouse para a esquerda leva à próxima página', async ({ page }) => {
    const { x, y } = await firstCardCenter(page)
    await page.mouse.move(x, y)
    await page.mouse.down()
    await page.mouse.move(x - 260, y, { steps: 13 })
    await page.mouse.up()

    await expect.poll(() => scrollLeft(page)).toBeGreaterThan(0)
    expect(await settledScrollLeft(page)).toBeGreaterThan(0)
    await expect(page.getByRole('button', { name: 'Anúncios anteriores' })).toHaveAttribute(
      'aria-disabled',
      'false',
    )
    await expect(dots(page).nth(1)).toHaveClass(/bg-primary/)
  })

  test('arrasto curto volta para a mesma página', async ({ page }) => {
    const { x, y } = await firstCardCenter(page)
    await page.mouse.move(x, y)
    await page.mouse.down()
    // Arrasto lento (cerca de 0,08 px/ms), para não contar como gesto rápido.
    for (let step = 1; step <= 10; step++) {
      await page.mouse.move(x - step * 4, y)
      await page.waitForTimeout(50)
    }
    await page.mouse.up()

    await expect.poll(() => scrollLeft(page)).toBe(0)
    expect(await settledScrollLeft(page)).toBe(0)
    await expect(page.getByRole('button', { name: 'Anúncios anteriores' })).toHaveAttribute(
      'aria-disabled',
      'true',
    )
  })

  test('um gesto rápido (flick) avança uma página mesmo curto', async ({ page }) => {
    const { x, y } = await firstCardCenter(page)
    await page.mouse.move(x, y)
    await page.mouse.down()
    await page.mouse.move(x - 70, y, { steps: 3 })
    await page.mouse.up()

    await expect(page.getByRole('button', { name: 'Anúncios anteriores' })).toHaveAttribute(
      'aria-disabled',
      'false',
    )
    await expect(dots(page).nth(1)).toHaveClass(/bg-primary/)
    expect(await settledScrollLeft(page)).toBeGreaterThan(0)
  })

  test('cursor: grab em repouso e grabbing durante o arrasto', async ({ page }) => {
    const cursor = () => track(page).evaluate((el) => getComputedStyle(el).cursor)
    expect(await cursor()).toBe('grab')

    const { x, y } = await firstCardCenter(page)
    await page.mouse.move(x, y)
    await page.mouse.down()
    await page.mouse.move(x - 30, y, { steps: 3 })
    expect(await cursor()).toBe('grabbing')
    await page.mouse.up()

    await expect.poll(cursor).toBe('grab')
  })

  test('botão direito não arrasta', async ({ page }) => {
    const { x, y } = await firstCardCenter(page)
    await page.mouse.move(x, y)
    await page.mouse.down({ button: 'right' })
    await page.mouse.move(x - 260, y, { steps: 13 })
    await page.mouse.up({ button: 'right' })
    await page.keyboard.press('Escape')

    expect(await settledScrollLeft(page)).toBe(0)
  })

  test('soltar o botão fora do carrossel antes do arrasto não deixa o arrasto preso', async ({ page }) => {
    const { x, y } = await firstCardCenter(page)
    await page.mouse.move(x, y)
    await page.mouse.down()
    await page.mouse.move(x - 2, y + 300, { steps: 10 })
    await page.mouse.up()

    // Passa por cima do carrossel sem botão apertado.
    await page.mouse.move(x, y)
    await page.mouse.move(x - 200, y, { steps: 10 })

    expect(await settledScrollLeft(page)).toBe(0)
    expect(await track(page).evaluate((el) => getComputedStyle(el).cursor)).toBe('grab')
    expect(await track(page).evaluate((el) => el.style.scrollSnapType)).not.toBe('none')
  })

  test('as setas continuam funcionando', async ({ page }) => {
    await page.getByRole('button', { name: 'Próximos anúncios' }).click()

    await expect(dots(page).nth(1)).toHaveClass(/bg-primary/)
    expect(await settledScrollLeft(page)).toBeGreaterThan(0)
  })
})
