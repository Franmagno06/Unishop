import { expect, type Page } from '@playwright/test'

// Contas do modo de demonstração (src/areas/public/auth/services/test-accounts.ts). Não são segredo:
// só existem com a API simulada, que é como os E2E sobem o servidor (playwright.config.ts).
export const STUDENT = { email: 'aluno.teste@edu.unifor.br', password: 'Senha1234' }
export const ADMIN = { email: 'administrador.teste@edu.unifor.br', password: 'Admin1234' }

// As rotas do aluno exigem sessão (PrivateRoute, RN-ACE-11): os specs entram antes de navegar. O token
// fica em sessionStorage, então um `page.goto` depois do login mantém a sessão.
export async function loginAsStudent(page: Page): Promise<void> {
  await page.goto('/login')
  await page.getByLabel('E-mail institucional').fill(STUDENT.email)
  await page.getByLabel('Senha').fill(STUDENT.password)
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(page).toHaveURL('/categorias')
}
