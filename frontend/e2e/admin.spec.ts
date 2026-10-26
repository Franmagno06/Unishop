import { expect as baseExpect, test, type Page } from '@playwright/test'

// A primeira abertura de cada rota compila o código do painel: dá mais tempo que os 5 s padrão.
const expect = baseExpect.configure({ timeout: 10_000 })

// Painel admin (API simulada, VITE_USE_MOCKS=true): login pela conta de teste, guard, usuários e
// produtos. Os dados são os de exemplo de src/areas/admin/*/services.
const ADMIN = { email: 'administrador.teste@edu.unifor.br', password: 'Admin1234' }
const STUDENT = { email: 'aluno.teste@edu.unifor.br', password: 'Senha1234' }

async function loginAs(page: Page, account: { email: string; password: string }, path = '/login') {
  await page.goto(path)
  await page.getByLabel('E-mail institucional').fill(account.email)
  await page.getByLabel('Senha', { exact: true }).fill(account.password)
  await page.getByRole('button', { name: 'Entrar' }).click()
}

test.describe('Entrada do administrador', () => {
  test('a tela de login mostra a conta de teste do admin e a senha', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByText(/administrador\.teste@edu\.unifor\.br · senha Admin1234/)).toBeVisible()
  })

  test('ao entrar, o admin abre direto no painel de usuários', async ({ page }) => {
    await loginAs(page, ADMIN)
    await expect(page).toHaveURL('/admin/usuarios')
    await expect(page.getByRole('heading', { level: 1, name: 'Usuários' })).toBeVisible()
    await expect(page.getByRole('navigation', { name: 'Painel admin' })).toBeVisible()
  })

  test('sem sessão, a rota do painel leva ao login e volta ao destino depois de entrar', async ({ page }) => {
    await page.goto('/admin/produtos')
    await expect(page).toHaveURL('/admin/login')
    await loginAs(page, ADMIN, '/admin/login')
    await expect(page).toHaveURL('/admin/produtos')
    await expect(page.getByRole('heading', { level: 1, name: 'Produtos' })).toBeVisible()
  })

  test('aluno que digita a rota do painel vê "acesso negado"', async ({ page }) => {
    await loginAs(page, STUDENT)
    await expect(page).toHaveURL('/categorias')
    // Navegação interna (sem recarregar): a sessão do aluno fica só em memória e no sessionStorage.
    await page.evaluate(() => {
      window.history.pushState({}, '', '/admin/usuarios')
      window.dispatchEvent(new PopStateEvent('popstate'))
    })
    await expect(page.getByRole('heading', { name: 'Acesso negado' })).toBeVisible()
  })

  test('"Sair" encerra a sessão e volta à tela inicial', async ({ page }) => {
    await loginAs(page, ADMIN)
    await expect(page).toHaveURL('/admin/usuarios')
    await page.getByRole('button', { name: 'Sair' }).first().click()
    await expect(page).toHaveURL('/')
  })
})

test.describe('Painel · usuários', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, ADMIN)
    await expect(page.getByRole('row', { name: /Francisco Magno/ })).toBeVisible()
  })

  test('mostra os indicadores, a lista paginada e o resumo', async ({ page }) => {
    await expect(
      page.getByRole('region', { name: 'Indicadores de usuários' }).getByText('Usuários cadastrados'),
    ).toBeVisible()
    await expect(page.getByText('1.412', { exact: true })).toBeVisible()
    await expect(page.getByText('Mostrando 7 de 1.412 usuários')).toBeVisible()

    await page.getByRole('button', { name: 'Próxima ›' }).click()
    await expect(page).toHaveURL(/pagina=2/)
    await expect(page.getByRole('button', { name: 'Página 2', exact: true })).toHaveAttribute('aria-current', 'page')
  })

  test('a busca filtra por nome ou e-mail e guarda o termo na URL', async ({ page }) => {
    await page.getByLabel('Buscar por nome ou e-mail').fill('ana.lima')
    await expect(page).toHaveURL(/busca=ana\.lima/)
    await expect(page.getByRole('row', { name: /Ana Lima/ })).toBeVisible()
    await expect(page.getByRole('row', { name: /Francisco Magno/ })).toHaveCount(0)

    await page.getByLabel('Buscar por nome ou e-mail').fill('zzzz-nao-existe')
    await expect(page.getByRole('heading', { name: 'Nenhum usuário encontrado' })).toBeVisible()
  })

  test('o filtro "Offline" esconde quem está logado agora', async ({ page }) => {
    await page.getByRole('button', { name: 'Offline' }).click()
    await expect(page.getByRole('row', { name: /Carla Mendes/ })).toBeVisible()
    await expect(page.getByText('Logado agora')).toHaveCount(0)
  })

  test('foto e nome abrem o perfil; de lá, editar o status e voltar aos detalhes', async ({ page }) => {
    await page.getByRole('link', { name: 'Abrir perfil de Carla Mendes' }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'Detalhes do usuário' })).toBeVisible()
    await expect(page.getByText('carla.mendes@edu.unifor.br')).toBeVisible()

    await page.getByRole('link', { name: 'Editar usuário' }).click()
    await expect(page.getByLabel('Nome *')).toHaveCount(0) // só o status é editável
    await page.getByLabel('Status da conta').selectOption('Suspensa')
    await page.getByRole('button', { name: 'Salvar alterações' }).click()

    const dialog = page.getByRole('dialog', { name: 'Alterações salvas!' })
    await expect(dialog).toBeVisible()
    await dialog.getByRole('button', { name: 'Voltar' }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'Detalhes do usuário' })).toBeVisible()
    await expect(page.getByText('Conta suspensa')).toBeVisible()
  })

  test('excluir um usuário com pedido pago em aberto é recusado (RN-ADM-06)', async ({ page }) => {
    await page.getByRole('button', { name: 'Excluir Ana Lima' }).click()
    const dialog = page.getByRole('dialog', { name: 'Excluir este usuário?' })
    await expect(dialog).toBeVisible()
    await dialog.getByRole('button', { name: 'Sim, excluir' }).click()
    await expect(dialog.getByText(/há pedido pago ou com retirada combinada em aberto/)).toBeVisible()
    await dialog.getByRole('button', { name: 'Cancelar' }).click()
    await expect(page.getByRole('row', { name: /Ana Lima/ })).toBeVisible()
  })

  test('excluir um usuário sem pendência o tira da lista e dos indicadores', async ({ page }) => {
    await page.getByRole('button', { name: 'Excluir Pedro Alves' }).click()
    await page
      .getByRole('dialog', { name: 'Excluir este usuário?' })
      .getByRole('button', { name: 'Sim, excluir' })
      .click()
    await expect(page.getByText('A conta de Pedro Alves foi excluída (anonimizada).')).toBeVisible()
    await expect(page.getByRole('row', { name: /Pedro Alves/ })).toHaveCount(0)
    await expect(page.getByText('1.411', { exact: true })).toBeVisible()
  })
})

test.describe('Painel · produtos', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, ADMIN)
    await page.getByRole('link', { name: 'Produtos' }).first().click()
    await expect(page.getByRole('row', { name: /Cálculo I/ })).toBeVisible()
  })

  test('mostra os indicadores e o resumo da lista', async ({ page }) => {
    await expect(page.getByText('152', { exact: true })).toBeVisible()
    await expect(page.getByText('Mostrando 6 de 266 produtos')).toBeVisible()
  })

  test('filtra por categoria e busca pelo nome do vendedor', async ({ page }) => {
    await page.getByLabel('Filtrar por categoria').selectOption({ label: 'Alimentos' })
    await expect(page).toHaveURL(/categoria=3/)
    await expect(page.getByRole('row', { name: /Brownie caseiro/ })).toBeVisible()
    await expect(page.getByRole('row', { name: /Cálculo I/ })).toHaveCount(0)

    await page.getByLabel('Filtrar por categoria').selectOption({ label: 'Todas as categorias' })
    await page.getByLabel('Buscar produto ou vendedor').fill('larissa moura')
    await expect(page.getByRole('row', { name: /Brownie caseiro/ })).toBeVisible()
  })

  test('detalhes mostram a galeria, o vendedor e levam ao usuário', async ({ page }) => {
    await page.getByRole('link', { name: /^Ver Cálculo I/ }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'Detalhes do produto' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Cálculo I — Guidorizzi, vol. 1' })).toBeVisible()
    await expect(page.getByRole('button', { name: /Ver foto 2 de 3/ })).toBeVisible()
    await page.getByRole('link', { name: 'Ver usuário →' }).click()
    await expect(page.getByRole('heading', { level: 2, name: 'Ana Lima' })).toBeVisible()
  })

  test('imagem e nome abrem os detalhes; editar muda só o status (Ativo ou Pausado)', async ({ page }) => {
    await page.getByRole('link', { name: 'Abrir Física I — Halliday, 10ª ed.' }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'Detalhes do produto' })).toBeVisible()
    await page.getByRole('link', { name: 'Editar produto' }).click()

    await expect(page.getByLabel('Nome do produto *')).toHaveCount(0)
    await expect(page.getByLabel('Status')).toHaveValue('paused')
    await page.getByLabel('Status').selectOption('Ativo')
    await page.getByRole('button', { name: 'Salvar alterações' }).click()
    await page.getByRole('dialog', { name: 'Alterações salvas!' }).getByRole('button', { name: 'Voltar' }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'Detalhes do produto' })).toBeVisible()
    await expect(page.getByText('Ativo', { exact: true })).toBeVisible()
  })

  test('excluir produto com pedido pago é recusado; sem pedido, tira da lista', async ({ page }) => {
    await page.getByRole('button', { name: /^Excluir Cálculo I/ }).click()
    const dialog = page.getByRole('dialog', { name: 'Excluir este produto?' })
    await dialog.getByRole('button', { name: 'Sim, excluir' }).click()
    await expect(dialog.getByText(/há pedido pago ou com retirada combinada em aberto/)).toBeVisible()
    await dialog.getByRole('button', { name: 'Cancelar' }).click()

    await page.getByRole('button', { name: /^Excluir Apostila de Anatomia/ }).click()
    await page
      .getByRole('dialog', { name: 'Excluir este produto?' })
      .getByRole('button', { name: 'Sim, excluir' })
      .click()
    await expect(page.getByText('O produto “Apostila de Anatomia Humana” foi excluído.')).toBeVisible()
    await expect(page.getByRole('row', { name: /Apostila de Anatomia/ })).toHaveCount(0)
  })
})
