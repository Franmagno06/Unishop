import { useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { ArrowLink } from '../../../../shared/components/ui/ArrowLink'
import { Button, ButtonLink } from '../../../../shared/components/ui/Button'
import { EmptyState } from '../../../../shared/components/ui/EmptyState'
import { Skeleton } from '../../../../shared/components/ui/Skeleton'
import { adminPaths, ROUTES } from '../../../../shared/constants/routes'
import { useDocumentTitle } from '../../../../shared/hooks/use-document-title'
import { AdminPageHeading } from '../../shared/components/AdminPageHeading'
import { SavedChangesModal } from '../../shared/components/SavedChangesModal'
import { UserStatusForm } from '../components/UserStatusForm'
import { useUserDetail } from '../hooks/use-admin-users'

// RF021 (Figma A02b, simplificado em 26/10/2026): só o status da conta. Salvar abre o pop-up
// "Alterações salvas!", cujo botão leva de volta aos detalhes do usuário.
export function AdminUserEditPage() {
  const id = Number(useParams().id)
  const navigate = useNavigate()
  const detail = useUserDetail(id)
  const [saved, setSaved] = useState(false)
  useDocumentTitle('Editar usuário · Admin')

  return (
    <>
      <ArrowLink to={Number.isInteger(id) ? adminPaths.userDetail(id) : ROUTES.adminUsers}>
        Voltar para o usuário
      </ArrowLink>
      <AdminPageHeading title="Editar usuário" />
      {detail.isPending && detail.fetchStatus !== 'idle' ? (
        <>
          <p role="status" className="sr-only">
            Carregando usuário…
          </p>
          <div className="flex max-w-[760px] flex-col gap-5">
            <Skeleton className="h-[420px] rounded-2xl" />
                      </div>
        </>
      ) : detail.isError ? (
        <div role="alert">
          <EmptyState
            title="Não foi possível carregar o usuário"
            action={<Button onClick={() => void detail.refetch()}>Tentar de novo</Button>}
          >
            Confira sua conexão e tente de novo.
          </EmptyState>
        </div>
      ) : detail.data ? (
        <div className="flex max-w-[760px] flex-col gap-5">
          {/* key: ao salvar e recarregar os dados, os formulários recomeçam com os valores novos. */}
          <UserStatusForm
            key={`${detail.data.user.id}-${detail.data.user.status}`}
            user={detail.data.user}
            onSaved={() => setSaved(true)}
          />
        </div>
      ) : (
        <EmptyState
          title="Usuário não encontrado"
          action={<ButtonLink to={ROUTES.adminUsers}>Ver usuários</ButtonLink>}
        >
          Ele pode ter sido excluído ou o endereço está errado.
        </EmptyState>
      )}

      {saved ? (
        <SavedChangesModal
          onClose={() => void navigate(adminPaths.userDetail(id), { replace: true })}
        />
      ) : null}
    </>
  )
}
