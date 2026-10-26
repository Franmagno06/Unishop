import { InfoAlert } from '../../../../shared/components/ui/Alert'
import { MOCK_MODE } from '../services/mock-mode'
import { TEST_ACCOUNTS } from '../services/test-accounts'

// Só aparece em desenvolvimento com VITE_USE_MOCKS=true; no build de produção some junto com as contas.
export function MockModeNotice({ page }: { page: 'login' | 'register' }) {
  if (!MOCK_MODE) return null

  return (
    <InfoAlert title="Modo de demonstração (sem servidor)">
      {page === 'login'
        ? `Conta de aluno: ${TEST_ACCOUNTS.student.email} · senha ${TEST_ACCOUNTS.student.password}. Conta de administrador: ${TEST_ACCOUNTS.admin.email} · senha ${TEST_ACCOUNTS.admin.password}. Qualquer outra combinação mostra o erro de login.`
        : `Para ver o erro de "e-mail já cadastrado", use ${TEST_ACCOUNTS.student.email}. Qualquer outro e-mail @edu.unifor.br cria a conta.`}
    </InfoAlert>
  )
}
