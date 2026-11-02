import { api } from '../../../../shared/lib/api'
import type { ProfileApiUser } from '../../../../shared/lib/current-user'
import { MOCK_MODE } from '../../../../shared/lib/mock-mode'

// Conta e sessão do aluno logado (backend.md §9): completar cadastro, trocar senha e trocar e-mail.
// Em modo de demonstração (MOCK_MODE) as chamadas vão para `account.mock.ts`; o `import.meta.env.DEV`
// escrito aqui é o que deixa o Vite apagar o código de exemplo do build de produção.
export type AccountState = { user: ProfileApiUser | null; needsTermsAcceptance: boolean }

export type CompleteProfileInput = {
  course: string
  whatsapp: string // só dígitos (RN-PER-07)
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
