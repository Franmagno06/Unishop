import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { ArrowLink } from '../../../../shared/components/ui/ArrowLink'
import { Avatar } from '../../../../shared/components/ui/Avatar'
import { Badge } from '../../../../shared/components/ui/Badge'
import { Button, ButtonLink } from '../../../../shared/components/ui/Button'
import { Card } from '../../../../shared/components/ui/Card'
import { EmptyState } from '../../../../shared/components/ui/EmptyState'
import { Skeleton } from '../../../../shared/components/ui/Skeleton'
import { adminPaths, ROUTES } from '../../../../shared/constants/routes'
import { useDocumentTitle } from '../../../../shared/hooks/use-document-title'
import { formatCurrency } from '../../../../shared/utils/format-currency'
import { formatDate } from '../../../../shared/utils/format-date'
import { formatWhatsapp } from '../../../../shared/utils/whatsapp'
import { AdminPageHeading } from '../../shared/components/AdminPageHeading'
import { ListingStatusBadge } from '../../shared/components/ListingStatusBadge'
import { formatLastAccess } from '../../shared/utils/last-access'
import { DeleteUserModal } from '../components/DeleteUserModal'
import { useUserDetail } from '../hooks/use-admin-users'
import type { AdminUser } from '../types/user.types'

function Presence({ user }: { user: AdminUser }) {
  if (user.status === 'suspended') return <Badge tone="danger">Conta suspensa</Badge>
  return user.isOnline ? (
    <Badge tone="success" dot>
      Logado agora
    </Badge>
  ) : (
    <Badge tone="neutral">Offline</Badge>
  )
}

function Detail({ label, children }: { label: string; children: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">{label}</dt>
      <dd className="break-words text-[15px] text-text">{children}</dd>
    </div>
  )
}

function DetailSkeleton() {
  return (
    <div className="grid gap-5 lg:grid-cols-[360px_1fr]">
      <Skeleton className="h-[450px] rounded-2xl" />
      <div className="flex flex-col gap-5">
        <Skeleton className="h-24 rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    </div>
  )
}

// RF020 · RN-ADM-06 (Figma A02). O aluno, os três indicadores e os anúncios dele; daqui o admin
// edita ou exclui a conta. Dados de exemplo; sem API até o backend existir.
export function AdminUserDetailPage() {
  const id = Number(useParams().id)
  const navigate = useNavigate()
  const detail = useUserDetail(id)
  const [deleting, setDeleting] = useState(false)
  useDocumentTitle(detail.data ? `${detail.data.user.name} · Admin` : 'Usuário · Admin')

  const back = <ArrowLink to={ROUTES.adminUsers}>Voltar para usuários</ArrowLink>

  if (detail.isPending && detail.fetchStatus !== 'idle') {
    return (
      <>
        {back}
        <p role="status" className="sr-only">
          Carregando usuário…
        </p>
        <DetailSkeleton />
      </>
    )
  }
  if (detail.isError) {
    return (
      <>
        {back}
        <div role="alert">
          <EmptyState
            title="Não foi possível carregar o usuário"
            action={<Button onClick={() => void detail.refetch()}>Tentar de novo</Button>}
          >
            Confira sua conexão e tente de novo.
          </EmptyState>
        </div>
      </>
    )
  }
  if (!detail.data) {
    return (
      <>
        {back}
        <EmptyState
          title="Usuário não encontrado"
          action={<ButtonLink to={ROUTES.adminUsers}>Ver usuários</ButtonLink>}
        >
          Ele pode ter sido excluído ou o endereço está errado.
        </EmptyState>
      </>
    )
  }

  const { user, listings, stats } = detail.data

  return (
    <>
      {back}
      <AdminPageHeading
        title="Detalhes do usuário"
        actions={
          <>
            <Button variant="danger-outline" onClick={() => setDeleting(true)}>
              Excluir usuário
            </Button>
            <ButtonLink to={adminPaths.userEdit(user.id)}>Editar usuário</ButtonLink>
          </>
        }
      />

      <div className="grid items-start gap-5 lg:grid-cols-[360px_1fr]">
        <Card className="flex flex-col items-center gap-4 p-6 text-center sm:p-8">
          <Avatar name={user.name} imageUrl={user.avatarUrl} className="size-[88px] text-[28px]" />
          <h2 className="break-words font-display text-2xl font-bold text-navy">{user.name}</h2>
          <Presence user={user} />
          <dl className="flex w-full flex-col gap-4 pt-2 text-left">
            <Detail label="E-mail">{user.email}</Detail>
            <Detail label="Curso">{user.course || 'Não informado'}</Detail>
            <Detail label="WhatsApp">{user.whatsapp ? formatWhatsapp(user.whatsapp) : 'Não informado'}</Detail>
            <Detail label="Cadastro">{formatDate(user.createdAt)}</Detail>
            <Detail label="Último acesso">{formatLastAccess(user.lastAccessAt)}</Detail>
          </dl>
        </Card>

        <div className="flex flex-col gap-5">
          <section aria-label="Indicadores do usuário" className="grid gap-4 sm:grid-cols-3">
            {[
              { value: stats.listings, label: 'Anúncios publicados' },
              { value: stats.sales, label: 'Vendas concluídas' },
              { value: stats.purchases, label: 'Compras realizadas' },
            ].map((item) => (
              <Card key={item.label} className="px-5 py-4">
                <p className="font-display text-3xl font-bold text-navy">{item.value}</p>
                <p className="text-sm text-text-muted">{item.label}</p>
              </Card>
            ))}
          </section>

          <Card className="flex flex-col gap-4 p-5 sm:p-6">
            <h2 className="text-lg font-semibold text-navy">Anúncios do usuário</h2>
            {listings.length === 0 ? (
              <p className="py-6 text-center text-[15px] text-text-muted">
                Este usuário ainda não publicou anúncios.
              </p>
            ) : (
              <ul className="flex flex-col gap-3">
                {listings.map((listing) => (
                  <li key={listing.id}>
                    <Link
                      to={adminPaths.productDetail(listing.id)}
                      className="flex items-center gap-4 rounded-xl bg-background p-3 transition-colors duration-150 hover:bg-primary-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                    >
                      <span
                        aria-hidden="true"
                        className="size-14 shrink-0 overflow-hidden rounded-lg bg-primary-soft"
                      >
                        {listing.imageUrl ? (
                          <img src={listing.imageUrl} alt="" className="size-full object-cover" />
                        ) : null}
                      </span>
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="truncate text-[15px] font-semibold text-text">{listing.title}</span>
                        <span className="truncate text-[13px] text-text-muted">
                          {formatCurrency(listing.priceInCents)} · {listing.categoryName}
                        </span>
                      </span>
                      <ListingStatusBadge status={listing.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>

      {deleting ? (
        <DeleteUserModal
          user={{ id: user.id, name: user.name, listingsCount: stats.listings }}
          onClose={() => setDeleting(false)}
          onDeleted={() => void navigate(ROUTES.adminUsers, { replace: true })}
        />
      ) : null}
    </>
  )
}
