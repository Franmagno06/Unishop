import { expect, test, type Page } from '@playwright/test'

// Fluxos de login e cadastro no modo de demonstração (API simulada, VITE_USE_MOCKS=true).
const STUDENT = { email: 'aluno.teste@edu.unifor.br', password: 'Senha1234' }

async function login(page: Page, email: string, password: string) {
  await page.getByLabel('E-mail institucional').fill(email)
  await page.getByLabel('Senha', { exact: true }).fill(password)
  await page.getByRole('button', { name: 'Entrar' }).click()
}

test.describe('Login', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByRole('heading', { level: 1, name: 'Entrar' })).toBeVisible()
  })

  test('mostra o aviso do modo de demonstração com a conta de teste', async ({ page }) => {
    await expect(page.getByText('Modo de demonstração (sem servidor)')).toBeVisible()
    await expect(page.getByText(STUDENT.email, { exact: false })).toBeVisible()
  })

  test('a conta de teste entra e vai para Categorias', async ({ page }) => {
    await login(page, STUDENT.email, STUDENT.password)

    await expect(page).toHaveURL('/categorias')
    await expect(page.getByRole('heading', { level: 1, name: 'Categorias' })).toBeVisible()
  })

  test('senha errada: alerta vermelho, senha limpa e foco nela', async ({ page }) => {
    await login(page, STUDENT.email, 'SenhaErrada1')

    const alert = page.getByRole('alert')
    await expect(alert).toContainText('Não foi possível entrar')
    await expect(alert).toContainText('E-mail ou senha incorretos.')
    await expect(page.getByLabel('E-mail institucional')).toHaveValue(STUDENT.email)
    await expect(page.getByLabel('Senha', { exact: true })).toHaveValue('')
    await expect(page.getByLabel('Senha', { exact: true })).toBeFocused()
    await expect(page).toHaveURL('/login')
  })

  test('e-mail desconhecido recebe a mesma mensagem (não revela qual campo errou)', async ({ page }) => {
    await login(page, 'ninguem@edu.unifor.br', 'Senha1234')
    await expect(page.getByRole('alert')).toContainText('E-mail ou senha incorretos.')
  })

  test('depois de 5 senhas erradas a conta é bloqueada por 15 minutos', async ({ page }) => {
    for (let attempt = 1; attempt <= 5; attempt++) {
      await login(page, STUDENT.email, `Errada${attempt}`)
      await expect(page.getByRole('alert')).toContainText('E-mail ou senha incorretos.')
    }

    await login(page, STUDENT.email, STUDENT.password)
    const alert = page.getByRole('alert')
    await expect(alert).toContainText('Conta bloqueada')
    await expect(alert).toContainText('Tente de novo em 15 minutos.')
    await expect(page).toHaveURL('/login')
  })

  test('conta suspensa mostra o aviso próprio', async ({ page }) => {
    await login(page, 'suspenso@edu.unifor.br', 'Senha1234')
    await expect(page.getByRole('alert')).toContainText('Sua conta está suspensa. Fale com o suporte.')
  })

  test('campos vazios mostram os erros de validação, sem o alerta de envio', async ({ page }) => {
    await page.getByRole('button', { name: 'Entrar' }).click()

    await expect(page.getByText('Informe seu e-mail.')).toBeVisible()
    await expect(page.getByText('Informe sua senha.')).toBeVisible()
    await expect(page.getByRole('alert')).toHaveCount(0)
  })

  test('a conta de teste do admin entra pela rota de admin', async ({ page }) => {
    await page.goto('/admin/login')
    await login(page, 'admin.teste@unishop.local', 'Admin1234')
    await expect(page).toHaveURL('/admin/usuarios')
  })
})

test.describe('Cadastro', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/cadastro')
    await expect(page.getByRole('heading', { level: 1, name: 'Criar conta' })).toBeVisible()
  })

  async function fill(
    page: Page,
    values: { name?: string; email?: string; password?: string; confirm?: string; accept?: boolean } = {},
  ) {
    const { name = 'Ana Souza', email = 'ana@edu.unifor.br', password = 'Senha1234', confirm = password, accept = true } = values
    await page.getByLabel('Nome completo').fill(name)
    await page.getByLabel('E-mail institucional').fill(email)
    await page.getByLabel('Senha', { exact: true }).fill(password)
    await page.getByLabel('Confirmar senha').fill(confirm)
    if (accept) await page.getByRole('checkbox', { name: /Li e aceito/ }).check()
  }

  test('termos sem marcar: erro no quadradinho e o envio não acontece', async ({ page }) => {
    await fill(page, { accept: false })
    await page.getByRole('button', { name: 'Criar conta' }).click()

    await expect(page.getByText('Aceite os Termos e a Política para continuar.')).toBeVisible()
    await expect(page.getByRole('checkbox', { name: /Li e aceito/ })).toHaveAttribute('aria-invalid', 'true')
    await expect(page).toHaveURL('/cadastro')
  })

  test('e-mail fora do domínio: erro no campo', async ({ page }) => {
    await fill(page, { email: 'ana@gmail.com' })
    await page.getByRole('button', { name: 'Criar conta' }).click()

    await expect(page.getByText('Use seu e-mail institucional @edu.unifor.br.')).toBeVisible()
    await expect(page.getByLabel('E-mail institucional')).toHaveAttribute('aria-invalid', 'true')
  })

  test('senha fraca e confirmação diferente: erros nos campos', async ({ page }) => {
    await fill(page, { password: 'senhafraca', confirm: 'outra' })
    await page.getByRole('button', { name: 'Criar conta' }).click()

    await expect(page.getByText('Inclua ao menos uma letra maiúscula.')).toBeVisible()
    await expect(page.getByText('As senhas não são iguais.')).toBeVisible()
  })

  test('a lista de requisitos da senha marca enquanto digita', async ({ page }) => {
    const done = page.getByText('(atendido)')
    await expect(done).toHaveCount(0)

    await page.getByLabel('Senha', { exact: true }).fill('Senha1234')
    await expect(done).toHaveCount(3)
  })

  test('e-mail já cadastrado: erro no campo, com o foco nele', async ({ page }) => {
    await fill(page, { email: STUDENT.email })
    await page.getByRole('button', { name: 'Criar conta' }).click()

    await expect(page.getByText('Este e-mail já tem cadastro. Tente entrar.')).toBeVisible()
    await expect(page.getByLabel('E-mail institucional')).toBeFocused()
    await expect(page).toHaveURL('/cadastro')
  })

  test('cadastro válido leva ao login com o aviso de conta criada', async ({ page }) => {
    await fill(page)
    await page.getByRole('button', { name: 'Criar conta' }).click()

    await expect(page).toHaveURL('/login')
    await expect(page.getByRole('status')).toContainText('Conta criada! Entre com seu e-mail e senha.')
  })
})
