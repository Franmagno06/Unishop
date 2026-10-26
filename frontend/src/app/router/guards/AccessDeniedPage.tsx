import { SiteHeader } from '../../../shared/components/layout/SiteHeader'
import { ButtonLink } from '../../../shared/components/ui/Button'
import { EmptyState } from '../../../shared/components/ui/EmptyState'
import { ROUTES } from '../../../shared/constants/routes'
import { useDocumentTitle } from '../../../shared/hooks/use-document-title'

// 403 de tela (frontend.md §6): quem não é administrador digitou uma rota do painel. A barreira de
// verdade é o backend (RN-ADM-01); aqui só evitamos mostrar um painel que não vai carregar.
export function AccessDeniedPage() {
  useDocumentTitle('Acesso negado')
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-[720px] flex-1 flex-col justify-center px-4 py-16">
        <EmptyState
          title="Acesso negado"
          action={<ButtonLink to={ROUTES.categories}>Ir para as categorias</ButtonLink>}
        >
          Esta área é só para administradores do Unishop.
        </EmptyState>
      </main>
    </div>
  )
}
