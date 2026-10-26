import { ButtonLink } from '../../../../shared/components/ui/Button'
import { EmptyState } from '../../../../shared/components/ui/EmptyState'
import { ROUTES } from '../../../../shared/constants/routes'
import { useDocumentTitle } from '../../../../shared/hooks/use-document-title'

// 404 dentro do painel: o menu lateral continua na tela.
export function AdminNotFoundPage() {
  useDocumentTitle('Página não encontrada · Admin')
  return (
    <EmptyState
      title="Página não encontrada"
      action={<ButtonLink to={ROUTES.adminUsers}>Ir para usuários</ButtonLink>}
    >
      O endereço não existe no painel admin.
    </EmptyState>
  )
}
