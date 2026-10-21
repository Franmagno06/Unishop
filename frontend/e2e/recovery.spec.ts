import { expect, test, type Page } from '@playwright/test'

// Recuperação de senha no modo de demonstração (API simulada, VITE_USE_MOCKS=true).
const EMAIL = 'aluno.teste@edu.unifor.br'
const OLD_PASSWORD = 'Senha1234'
const NEW_PASSWORD = 'NovaSenha1'

async function askForLink(page: Page, email = EMAIL) {
  // espera a tela nova (carregada sob demanda) antes de preencher, senão o campo ainda é o do login
  await expect(page.getByRole('heading', { level: 1, name: 'Esqueceu a senha?' })).toBeVisible()
  await page.getByLabel('E-mail institucional').fill(email)
  await page.getByRole('button', { name: 'Enviar link de redefinição' }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Verifique seu e-mail' })).toBeVisible()
}

async function setNewPassword(page: Page, password = NEW_PASSWORD, confirmation = password) {
  await page.getByLabel('Nova senha', { exact: true }).fill(password)
  await page.getByLabel('Confirmar nova senha').fill(confirmation)
  await page.getByRole('button', { name: 'Redefinir senha' }).click()
}

async function login(page: Page, password: string) {
  await page.getByLabel('E-mail institucional').fill(EMAIL)
  await page.getByLabel('Senha', { exact: true }).fill(password)
  await page.getByRole('button', { name: 'Entrar' }).click()
}

test.describe('Recuperação de senha · fluxo completo', () => {
  test('esqueci a senha → e-mail → link simulado → nova senha → login com a senha nova', async ({ page }) => {
    await page.goto('/login')
    await page.getByRole('link', { name: 'Esqueci minha senha' }).click()
    await expect(page).toHaveURL('/recuperar-senha')
    await expect(page.getByRole('heading', { level: 1, name: 'Esqueceu a senha?' })).toBeVisible()

    await askForLink(page)
    await expect(page).toHaveURL('/recuperar-senha/enviado')
    await expect(page.getByText(EMAIL)).toBeVisible()
    await expect(page.getByText(/Ele expira em 30 minutos/)).toBeVisible()

    // o botão da simulação já vem clicável, sem conferir nada
    await page.getByRole('link', { name: 'Abrir link do e-mail (simulação)' }).click()
    await expect(page).toHaveURL(/\/redefinir-senha\/demo\./)
    await expect(page.getByRole('heading', { level: 1, name: 'Criar nova senha' })).toBeVisible()

    await setNewPassword(page)
    await expect(page).toHaveURL('/senha-redefinida')
    await expect(page.getByRole('heading', { level: 1, name: 'Senha redefinida!' })).toBeVisible()

    await page.getByRole('link', { name: 'Ir para o login' }).click()
    await expect(page).toHaveURL('/login')

    // a senha antiga deixou de valer
    await login(page, OLD_PASSWORD)
    await expect(page.getByRole('alert')).toContainText('E-mail ou senha incorretos.')

    // e a nova entra
    await page.getByLabel('Senha', { exact: true }).fill(NEW_PASSWORD)
    await page.getByRole('button', { name: 'Entrar' }).click()
    await expect(page).toHaveURL('/categorias')
  })

  test('redefinir a senha libera uma conta bloqueada por tentativas', async ({ page }) => {
    await page.goto('/login')
    for (let attempt = 1; attempt <= 5; attempt++) {
      await login(page, `Errada${attempt}`)
      await expect(page.getByRole('alert')).toContainText('E-mail ou senha incorretos.')
    }
    await login(page, OLD_PASSWORD)
    await expect(page.getByRole('alert')).toContainText('Conta bloqueada')

    await page.getByRole('link', { name: 'Esqueci minha senha' }).click()
    await askForLink(page)
    await page.getByRole('link', { name: 'Abrir link do e-mail (simulação)' }).click()
    await setNewPassword(page)
    await page.getByRole('link', { name: 'Ir para o login' }).click()

    await login(page, NEW_PASSWORD)
    await expect(page).toHaveURL('/categorias')
  })

  test('e-mail desconhecido recebe a mesma resposta (não revela quem tem conta)', async ({ page }) => {
    await page.goto('/recuperar-senha')
    await askForLink(page, 'ninguem@edu.unifor.br')
    await expect(page.getByText('ninguem@edu.unifor.br')).toBeVisible()
    await expect(page.getByText(/Ele expira em 30 minutos/)).toBeVisible()
  })
})

test.describe('Recuperação de senha · pedir o link', () => {
  test('e-mail vazio ou inválido mostra o erro e não avança', async ({ page }) => {
    await page.goto('/recuperar-senha')

    await page.getByRole('button', { name: 'Enviar link de redefinição' }).click()
    await expect(page.getByText('Informe seu e-mail.')).toBeVisible()

    await page.getByLabel('E-mail institucional').fill('ana@')
    await page.getByRole('button', { name: 'Enviar link de redefinição' }).click()
    await expect(page.getByText('Informe um e-mail válido.')).toBeVisible()
    await expect(page).toHaveURL('/recuperar-senha')
  })

  test('"Verifique seu e-mail" aberta direto volta para pedir o link', async ({ page }) => {
    await page.goto('/recuperar-senha/enviado')
    await expect(page).toHaveURL('/recuperar-senha')
    await expect(page.getByRole('heading', { level: 1, name: 'Esqueceu a senha?' })).toBeVisible()
  })

  test('"Reenviar e-mail" confirma com um aviso', async ({ page }) => {
    await page.goto('/recuperar-senha')
    await askForLink(page)

    await page.getByRole('button', { name: 'Não recebeu? Reenviar e-mail' }).click()

    await expect(page.getByRole('status')).toContainText('E-mail reenviado.')
  })
})

test.describe('Recuperação de senha · nova senha', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/recuperar-senha')
    await askForLink(page)
    await page.getByRole('link', { name: 'Abrir link do e-mail (simulação)' }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'Criar nova senha' })).toBeVisible()
  })

  test('senha fraca e confirmação diferente mostram os erros nos campos', async ({ page }) => {
    await setNewPassword(page, 'senhafraca', 'outra')

    await expect(page.getByText('Inclua ao menos uma letra maiúscula.')).toBeVisible()
    await expect(page.getByText('As senhas não são iguais.')).toBeVisible()
    await expect(page).toHaveURL(/\/redefinir-senha\//)
  })

  test('a lista de requisitos marca enquanto digita', async ({ page }) => {
    const done = page.getByText('(atendido)')
    await expect(done).toHaveCount(0)

    await page.getByLabel('Nova senha', { exact: true }).fill('NovaSenha1')
    await expect(done).toHaveCount(3)
  })
})

test.describe('Recuperação de senha · link com problema', () => {
  async function openSimulated(page: Page, name: 'Simular link expirado' | 'Simular link inválido') {
    await page.goto('/recuperar-senha')
    await askForLink(page)
    await page.getByRole('link', { name }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'Criar nova senha' })).toBeVisible()
  }

  test('link expirado: alerta vermelho e atalho para pedir outro', async ({ page }) => {
    await openSimulated(page, 'Simular link expirado')
    await setNewPassword(page)

    const alert = page.getByRole('alert')
    await expect(alert).toContainText('Link expirado')
    await expect(alert).toContainText('Este link expirou (ele vale 30 minutos).')
    await expect(page).toHaveURL('/redefinir-senha/expirado')

    await page.getByRole('link', { name: 'Pedir novo link' }).click()
    await expect(page).toHaveURL('/recuperar-senha')
  })

  test('link inválido ou já usado: alerta vermelho', async ({ page }) => {
    await openSimulated(page, 'Simular link inválido')
    await setNewPassword(page)

    const alert = page.getByRole('alert')
    await expect(alert).toContainText('Link inválido')
    await expect(alert).toContainText('Este link já foi usado ou não é válido.')
  })
})

test.describe('Recuperação de senha · botão Voltar', () => {
  test('do login para "Esqueceu a senha?" e de volta ao login', async ({ page }) => {
    await page.goto('/login')
    await page.getByRole('link', { name: 'Esqueci minha senha' }).click()

    await page.getByRole('link', { name: 'Voltar' }).click()
    await expect(page).toHaveURL('/login')
  })

  test('aberta direto, "Esqueceu a senha?" volta para o login', async ({ page }) => {
    await page.goto('/recuperar-senha')
    await page.getByRole('link', { name: 'Voltar' }).click()
    await expect(page).toHaveURL('/login')
  })

  test('de "Verifique seu e-mail" volta para trocar o e-mail', async ({ page }) => {
    await page.goto('/recuperar-senha')
    await askForLink(page)

    await page.getByRole('link', { name: 'Voltar' }).click()

    await expect(page).toHaveURL('/recuperar-senha')
    await expect(page.getByRole('heading', { level: 1, name: 'Esqueceu a senha?' })).toBeVisible()
  })

  test('a nova senha aberta direto volta para o login', async ({ page }) => {
    await page.goto('/redefinir-senha/qualquer')
    await page.getByRole('link', { name: 'Voltar' }).click()
    await expect(page).toHaveURL('/login')
  })

  test('"Senha redefinida!" não tem Voltar, só "Ir para o login"', async ({ page }) => {
    await page.goto('/senha-redefinida')
    await expect(page.getByRole('link', { name: 'Voltar' })).toHaveCount(0)
    await expect(page.getByRole('link', { name: 'Ir para o login' })).toBeVisible()
  })
})

test.describe('Recuperação de senha · celular', () => {
  for (const width of [320, 390]) {
    for (const path of ['/recuperar-senha', '/redefinir-senha/abc', '/senha-redefinida']) {
      test(`${path} sem rolagem horizontal em ${width} px`, async ({ page }) => {
        await page.setViewportSize({ width, height: 800 })
        await page.goto(path)
        await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

        const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)
        expect(overflow).toBe(false)
      })
    }
  }

  test('"Verifique seu e-mail" com e-mail longo não estoura em 320 px', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 800 })
    await page.goto('/recuperar-senha')
    await askForLink(page, `${'a'.repeat(60)}@edu.unifor.br`)

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)
    expect(overflow).toBe(false)
  })
})
