import { expect, test } from '@playwright/test'
import { loginAsStudent, STUDENT } from './support/login'

// RN-ACE-11 e RN-CAT-04: o catálogo e o perfil só abrem para aluno logado (PrivateRoute, só UX; o
// backend é a barreira de verdade). O visitante vai ao login e volta ao destino depois de entrar.
test.describe('Guarda das rotas do aluno', () => {
  test('visitante em /categorias vai ao login e volta para lá depois de entrar', async ({ page }) => {
    await page.goto('/categorias')
    await expect(page).toHaveURL('/login')

    await page.getByLabel('E-mail institucional').fill(STUDENT.email)
    await page.getByLabel('Senha').fill(STUDENT.password)
    await page.getByRole('button', { name: 'Entrar' }).click()

    await expect(page).toHaveURL('/categorias')
    await expect(page.getByRole('heading', { level: 1, name: 'Categorias' })).toBeVisible()
  })

  test('visitante em /perfil volta ao perfil depois de entrar', async ({ page }) => {
    await page.goto('/perfil')
    await expect(page).toHaveURL('/login')

    await page.getByLabel('E-mail institucional').fill(STUDENT.email)
    await page.getByLabel('Senha').fill(STUDENT.password)
    await page.getByRole('button', { name: 'Entrar' }).click()

    await expect(page).toHaveURL('/perfil')
  })

  test('depois de sair, abrir Categorias pela própria tela inicial leva ao login (sem tela em branco)', async ({ page }) => {
    await loginAsStudent(page)
    await page.getByRole('banner').getByRole('button', { name: 'Minha conta' }).hover()
    await page.getByRole('button', { name: 'Sair' }).click()
    await expect(page).toHaveURL('/')

    await page.getByRole('navigation', { name: 'Principal' }).getByRole('link', { name: 'Categorias' }).click()
    await expect(page).toHaveURL('/login')
    await expect(page.getByLabel('E-mail institucional')).toBeVisible()
  })

  test('visitante clica em Categorias no cabeçalho da tela inicial e cai no login (RN-CAT-04)', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('navigation', { name: 'Principal' }).getByRole('link', { name: 'Categorias' }).click()
    await expect(page).toHaveURL('/login')

    await page.getByLabel('E-mail institucional').fill(STUDENT.email)
    await page.getByLabel('Senha').fill(STUDENT.password)
    await page.getByRole('button', { name: 'Entrar' }).click()
    await expect(page).toHaveURL('/categorias')
  })

  test('a tela inicial segue pública e mostra os anúncios recentes (RF001.4)', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveURL('/')
    await expect(page.getByRole('heading', { name: 'Anúncios recentes' })).toBeVisible()
    await expect(page.getByRole('list', { name: 'Lista de anúncios recentes' }).getByRole('listitem').first()).toBeVisible()
  })
})
