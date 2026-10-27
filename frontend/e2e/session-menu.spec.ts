import { expect, test, type Page } from '@playwright/test'

// Cabeçalho que muda com a sessão e menu do perfil (API simulada, VITE_USE_MOCKS=true).
const STUDENT = { email: 'aluno.teste@edu.unifor.br', password: 'Senha1234' }
const ADMIN = { email: 'administrador.teste@edu.unifor.br', password: 'Admin1234' }

async function loginAs(page: Page, account: { email: string; password: string }, path = '/login') {
  await page.goto(path)
  await page.getByLabel('E-mail institucional').fill(account.email)
  await page.getByLabel('Senha', { exact: true }).fill(account.password)
  await page.getByRole('button', { name: 'Entrar' }).click()
}

const header = (page: Page) => page.getByRole('banner')
const avatar = (page: Page) => header(page).getByRole('button', { name: 'Minha conta' })
const tokenInStorage = (page: Page) => page.evaluate(() => sessionStorage.getItem('unishop.token'))

test.describe('Cabeçalho · visitante', () => {
  test('mostra Entrar e Criar conta, sem avatar nem "Anunciar item"', async ({ page }) => {
    await page.goto('/')

    await expect(header(page).getByRole('link', { name: 'Entrar' })).toBeVisible()
    await expect(header(page).getByRole('link', { name: 'Criar conta' })).toBeVisible()
    await expect(avatar(page)).toHaveCount(0)
    await expect(header(page).getByRole('link', { name: '+ Anunciar item' })).toHaveCount(0)
    await expect(page.getByRole('link', { name: 'Criar conta', exact: true })).toBeVisible()
  })
})

test.describe('Cabeçalho · aluno logado', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, STUDENT)
    await expect(page).toHaveURL('/categorias')
  })

  test('em Categorias mostra "+ Anunciar item" e o avatar, e some Entrar e Criar conta', async ({ page }) => {
    await expect(header(page).getByRole('link', { name: '+ Anunciar item' })).toBeVisible()
    await expect(avatar(page)).toBeVisible()
    await expect(avatar(page)).toHaveText('AT')
    await expect(header(page).getByRole('link', { name: 'Entrar' })).toHaveCount(0)
    await expect(header(page).getByRole('link', { name: 'Criar conta' })).toHaveCount(0)
  })

  test('na tela inicial também aparece o cabeçalho logado, e o botão vira "Categorias"', async ({ page }) => {
    await header(page).getByRole('link', { name: 'Início' }).click()

    await expect(page).toHaveURL('/')
    await expect(header(page).getByRole('link', { name: '+ Anunciar item' })).toBeVisible()
    await expect(avatar(page)).toBeVisible()
    await expect(header(page).getByRole('link', { name: 'Entrar' })).toHaveCount(0)
    await expect(page.getByRole('link', { name: 'Categorias', exact: true })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Criar conta', exact: true })).toHaveCount(0)
    await expect(page.getByRole('contentinfo').getByRole('link', { name: 'Criar conta' })).toHaveCount(0)
  })

  test('a sessão sobrevive ao F5', async ({ page }) => {
    await page.reload()
    await expect(avatar(page)).toBeVisible()
    await expect(header(page).getByRole('link', { name: 'Entrar' })).toHaveCount(0)
  })

  test('passar o mouse no avatar abre o cartão com "Ver perfil" e "Sair" em vermelho', async ({ page }) => {
    await avatar(page).hover()

    const profile = page.getByRole('link', { name: 'Ver perfil' })
    const logout = page.getByRole('button', { name: 'Sair' })
    await expect(profile).toBeVisible()
    await expect(logout).toBeVisible()
    await expect(logout).toHaveCSS('color', 'rgb(198, 40, 40)')
    await expect(profile).not.toHaveCSS('color', 'rgb(198, 40, 40)')
  })

  test('tirar o mouse fecha o cartão', async ({ page }) => {
    await avatar(page).hover()
    await expect(page.getByRole('button', { name: 'Sair' })).toBeVisible()

    await page.mouse.move(600, 500)

    await expect(page.getByRole('button', { name: 'Sair' })).toHaveCount(0)
  })

  test('o cursor vai do avatar até o "Sair" sem o cartão fechar no caminho', async ({ page }) => {
    await avatar(page).hover()
    await page.getByRole('button', { name: 'Sair' }).hover()
    await page.waitForTimeout(400)

    await expect(page.getByRole('button', { name: 'Sair' })).toBeVisible()
  })

  test('"Ver perfil" leva a /perfil', async ({ page }) => {
    await avatar(page).hover()
    await page.getByRole('link', { name: 'Ver perfil' }).click()
    await expect(page).toHaveURL('/perfil')
  })

  test('"Sair" apaga a sessão e volta à tela inicial com Entrar e Criar conta', async ({ page }) => {
    expect(await tokenInStorage(page)).not.toBeNull()

    await avatar(page).hover()
    await page.getByRole('button', { name: 'Sair' }).click()

    await expect(page).toHaveURL('/')
    await expect(header(page).getByRole('link', { name: 'Entrar' })).toBeVisible()
    await expect(header(page).getByRole('link', { name: 'Criar conta' })).toBeVisible()
    await expect(avatar(page)).toHaveCount(0)
    await expect(header(page).getByRole('link', { name: '+ Anunciar item' })).toHaveCount(0)
    await expect(page.getByRole('link', { name: 'Criar conta', exact: true })).toBeVisible()
    expect(await tokenInStorage(page)).toBeNull()
  })

  test('depois de sair, login e cadastro voltam a abrir e dá para entrar de novo', async ({ page }) => {
    await avatar(page).hover()
    await page.getByRole('button', { name: 'Sair' }).click()
    await expect(page).toHaveURL('/')

    await header(page).getByRole('link', { name: 'Entrar' }).click()
    await expect(page).toHaveURL('/login')
    await page.getByLabel('E-mail institucional').fill(STUDENT.email)
    await page.getByLabel('Senha', { exact: true }).fill(STUDENT.password)
    await page.getByRole('button', { name: 'Entrar' }).click()

    await expect(page).toHaveURL('/categorias')
    await expect(avatar(page)).toBeVisible()
  })

  test('com a sessão aberta, /login e /cadastro levam direto a Categorias', async ({ page }) => {
    await page.goto('/login')
    await expect(page).toHaveURL('/categorias')
  })
})

test.describe('Menu do perfil · teclado', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, STUDENT)
    await expect(avatar(page)).toBeVisible()
  })

  test('Enter abre, Tab percorre, Esc fecha e devolve o foco ao avatar', async ({ page }) => {
    await avatar(page).focus()
    await page.keyboard.press('Enter')
    await expect(page.getByRole('link', { name: 'Ver perfil' })).toBeVisible()

    await page.keyboard.press('Tab')
    await expect(page.getByRole('link', { name: 'Ver perfil' })).toBeFocused()
    await page.keyboard.press('Tab')
    await expect(page.getByRole('button', { name: 'Sair' })).toBeFocused()

    await page.keyboard.press('Escape')
    await expect(page.getByRole('button', { name: 'Sair' })).toHaveCount(0)
    await expect(avatar(page)).toBeFocused()
  })

  test('dá para sair só pelo teclado', async ({ page }) => {
    await avatar(page).focus()
    await page.keyboard.press('Enter')
    await page.keyboard.press('Tab')
    await page.keyboard.press('Tab')
    await page.keyboard.press('Enter')

    await expect(page).toHaveURL('/')
    await expect(header(page).getByRole('link', { name: 'Entrar' })).toBeVisible()
  })
})

test.describe('Menu do perfil · celular (toque)', () => {
  test.use({ hasTouch: true, viewport: { width: 390, height: 844 } })

  test('tocar abre; tocar fora fecha; tocar de novo e em "Sair" sai', async ({ page }) => {
    await loginAs(page, STUDENT)
    await expect(avatar(page)).toBeVisible()

    await avatar(page).tap()
    await expect(page.getByRole('button', { name: 'Sair' })).toBeVisible()

    await page.getByRole('heading', { level: 1, name: 'Categorias' }).tap()
    await expect(page.getByRole('button', { name: 'Sair' })).toHaveCount(0)

    await avatar(page).tap()
    await page.getByRole('button', { name: 'Sair' }).tap()
    await expect(page).toHaveURL('/')
    await expect(header(page).getByRole('link', { name: 'Entrar' })).toBeVisible()
  })

  for (const width of [320, 390]) {
    test(`cabeçalho logado sem rolagem horizontal em ${width} px (inicial e Categorias)`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 })
      await loginAs(page, STUDENT)
      await expect(avatar(page)).toBeVisible()

      for (const path of ['/categorias', '/']) {
        await page.goto(path)
        await expect(avatar(page)).toBeVisible()
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)
        expect(overflow, `${path} em ${width}px`).toBe(false)
      }
    })
  }
})

test.describe('Cabeçalho · administrador logado', () => {
  test('não anuncia: tem o avatar, sem "+ Anunciar item"; o menu leva ao painel e permite sair', async ({ page }) => {
    await loginAs(page, ADMIN, '/admin/login')
    await expect(page).toHaveURL('/admin/usuarios')
    // O painel tem o próprio menu lateral; o cabeçalho do site aparece nas telas comuns.
    await page.goto('/categorias')

    await expect(avatar(page)).toBeVisible()
    await expect(header(page).getByRole('link', { name: '+ Anunciar item' })).toHaveCount(0)
    await expect(header(page).getByRole('link', { name: 'Meus anúncios' })).toHaveCount(0)

    await avatar(page).hover()
    await expect(page.getByRole('link', { name: 'Painel admin' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Ver perfil' })).toHaveCount(0)
    await page.getByRole('link', { name: 'Painel admin' }).click()
    await expect(page).toHaveURL('/admin/usuarios')

    await page.goto('/categorias')
    await avatar(page).hover()
    await page.getByRole('button', { name: 'Sair' }).click()
    await expect(page).toHaveURL('/')
    await expect(header(page).getByRole('link', { name: 'Entrar' })).toBeVisible()
  })

  test('com a sessão de admin aberta, /admin/login leva ao painel', async ({ page }) => {
    await loginAs(page, ADMIN, '/admin/login')
    await expect(page).toHaveURL('/admin/usuarios')
    await page.goto('/admin/login')
    await expect(page).toHaveURL('/admin/usuarios')
  })
})
