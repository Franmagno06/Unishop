import { useParams } from 'react-router'
import { ArrowLink } from '../../../../shared/components/ui/ArrowLink'
import { Button, ButtonLink } from '../../../../shared/components/ui/Button'
import { EmptyState } from '../../../../shared/components/ui/EmptyState'
import { Skeleton } from '../../../../shared/components/ui/Skeleton'
import { adminPaths, ROUTES } from '../../../../shared/constants/routes'
import { useDocumentTitle } from '../../../../shared/hooks/use-document-title'
import { AdminPageHeading } from '../../shared/components/AdminPageHeading'
import { UserForm } from '../components/UserForm'
import { useUserDetail } from '../hooks/use-admin-users'

// RF021 (Figma A02b). Carrega o usuário e mostra o formulário já preenchido.
export function AdminUserEditPage() {
  const id = Number(useParams().id)
  const detail = useUserDetail(id)
  useDocumentTitle('Editar usuário · Admin')

  const back = <ArrowLink to={Number.isInteger(id) ? adminPaths.userDetail(id) : ROUTES.adminUsers}>Voltar para o usuário</ArrowLink>

  return (
    <>
      {back}
      <AdminPageHeading title="Editar usuário" />
      {detail.isPending && detail.fetchStatus !== 'idle' ? (
        <>
          <p role="status" className="sr-only">
            Carregando usuário…
          </p>
          <Skeleton className="h-[520px] max-w-[760px] rounded-2xl" />
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
        // key: ao salvar e recarregar os dados, o formulário recomeça com os valores novos.
        <UserForm key={detail.data.user.id} user={detail.data.user} />
      ) : (
        <EmptyState
          title="Usuário não encontrado"
          action={<ButtonLink to={ROUTES.adminUsers}>Ver usuários</ButtonLink>}
        >
          Ele pode ter sido excluído ou o endereço está errado.
        </EmptyState>
      )}
    </>
  )
}
