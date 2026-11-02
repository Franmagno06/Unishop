import { api } from '../../../../shared/lib/api'
import type { ProfileApiUser } from '../../../../shared/lib/current-user'
import { MOCK_MODE } from '../../../../shared/lib/mock-mode'

// Conta e sessão do aluno logado (backend.md §9): completar cadastro, trocar senha e trocar e-mail.
// Em modo de demonstração (MOCK_MODE) as chamadas vão para `account.mock.ts`; o `import.meta.env.DEV`
// escrito aqui é o que deixa o Vite apagar o código de exemplo do build de produção.
export type AccountState = {
  user: { id: number; name: string; role: 'student' | 'admin' } | null
  needsTermsAcceptance: boolean
}

export type CompleteProfileInput = {
  course: string
  whatsapp: string // só dígitos (RN-PER-07)
}

export type ChangePasswordInput = {
  currentPassword: string
  newPassword: string
  confirmation: string
}

// RN-ACE-15: confere a senha atual e devolve um token novo (o anterior deixa de valer). Conta Google
// sem senha recebe 400 CURRENT_PASSWORD_INVALID e cria a primeira pela recuperação de senha.
export async function changePassword(input: ChangePasswordInput): Promise<string> {
  if (import.meta.env.DEV && MOCK_MODE) return (await import('./account.mock')).mockAccount.changePassword()
  const response = await api<{ data: { token: string } }>('/users/me/password', {
    method: 'POST',
    body: input,
  })
  return response.data.token
}

// RN-ACE-15: conta Google sem senha cria a primeira pela recuperação de senha. O servidor responde 202
// igual exista ou não a conta (RN-ACE-10); o link vai ao e-mail da conta.
export async function requestPasswordReset(email: string): Promise<void> {
  if (import.meta.env.DEV && MOCK_MODE) return (await import('./account.mock')).mockAccount.requestPasswordReset()
  await api<unknown>('/auth/forgot-password', { method: 'POST', body: { email } })
}

// RN-PER-02: pede o link de confirmação para o e-mail novo (30 minutos, uso único). O atual segue
// valendo até a confirmação. 409 EMAIL_ALREADY_REGISTERED; 403 EMAIL_DOMAIN_NOT_ALLOWED.
export async function requestEmailChange(email: string): Promise<void> {
  if (import.meta.env.DEV && MOCK_MODE) return (await import('./account.mock')).mockAccount.requestEmailChange()
  await api<unknown>('/users/me/email-change', { method: 'POST', body: { email } })
}

// RN-PER-02: confirma a troca com o token do link; devolve o usuário já com o e-mail novo.
// 400 TOKEN_INVALID / TOKEN_EXPIRED; 409 EMAIL_ALREADY_REGISTERED.
export async function confirmEmailChange(token: string): Promise<ProfileApiUser> {
  if (import.meta.env.DEV && MOCK_MODE) return (await import('./account.mock')).mockAccount.confirmEmailChange()
  const response = await api<{ data: { user: ProfileApiUser } }>('/users/me/email-change/confirm', {
    method: 'POST',
    body: { token },
  })
  return response.data.user
}

// RN-ACE-06, 14: grava o aceite dos Termos (primeiro acesso por Google) e, se o aluno quiser, curso e
// WhatsApp. O aceite vai sempre `true`: a tela só chama depois do aluno marcar.
export async function completeProfile(input: CompleteProfileInput): Promise<AccountState> {
  if (import.meta.env.DEV && MOCK_MODE) {
    return (await import('./account.mock')).mockAccount.completeProfile()
  }
  const response = await api<{ data: AccountState }>('/users/me/complete-profile', {
    method: 'POST',
    body: {
      acceptTerms: true,
      ...(input.course ? { course: input.course } : {}),
      ...(input.whatsapp ? { whatsapp: input.whatsapp } : {}),
    },
  })
  return response.data
}
