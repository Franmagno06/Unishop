import { useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { ErrorAlert } from '../../../../shared/components/ui/Alert'
import { ArrowLink } from '../../../../shared/components/ui/ArrowLink'
import { Badge } from '../../../../shared/components/ui/Badge'
import { Button, ButtonLink } from '../../../../shared/components/ui/Button'
import { Card } from '../../../../shared/components/ui/Card'
import { ConfirmDialog } from '../../../../shared/components/ui/ConfirmDialog'
import { EmptyState } from '../../../../shared/components/ui/EmptyState'
import { Skeleton } from '../../../../shared/components/ui/Skeleton'
import { listingRoutes, ROUTES } from '../../../../shared/constants/routes'
import { useDocumentTitle } from '../../../../shared/hooks/use-document-title'
import { ApiError } from '../../../../shared/lib/api'
import { formatCurrency } from '../../../../shared/utils/format-currency'
import { formatDate } from '../../../../shared/utils/format-date'
import { formatWhatsapp } from '../../../../shared/utils/whatsapp'
import { ListingStatsCards } from '../components/ListingStatsCards'
import { ListingStatusBadge } from '../components/ListingStatusBadge'
import { ReceivedOrdersList } from '../components/ReceivedOrdersList'
import { useListingActions, useManagedListing } from '../hooks/use-my-listings'

type Dialog = 'sold' | 'delete' | null

function parseListingId(value: string | undefined): number | null {
  const id = Number(value)
  return Number.isInteger(id) && id > 0 ? id : null
}

function ActionGroup({ hint, children }: { hint: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      {children}
      <p className="text-xs text-text-muted">{hint}</p>
    </div>
  )
}

function deleteFailure(error: unknown): string {
  if (error instanceof ApiError && error.code === 'HAS_OPEN_PAID_ORDERS') {
    return 'Este anúncio tem pedidos pagos ou com retirada combinada em aberto. Conclua-os antes de excluir.'
  }
  return 'Não foi possível excluir o anúncio agora. Tente de novo.'
}

// RF017 · RN-ANU-04, 08 e 09, RN-PED-07, 08, 12 e 13, RN-EST-06 (Figma 05d). Anúncio pausado e
// vendido reaproveitam esta tela: o Figma 05e está em branco. Dados de exemplo; sem guard até a API.
export function ManageListingPage() {
  const { id } = useParams()
  const listingId = parseListingId(id)
  const navigate = useNavigate()
  const managed = useManagedListing(listingId)
  const actions = useListingActions(listingId ?? 0)
  const [dialog, setDialog] = useState<Dialog>(null)
  useDocumentTitle(managed.data?.listing.title ?? 'Gerenciar anúncio')

  const notFound = listingId === null || (managed.isSuccess && managed.data === null)
  const listing = managed.data?.listing
  const orders = managed.data?.orders ?? []
  const orderAction = [actions.arrangePickup, actions.completeSale, actions.closeNegotiation].find(
    (action) => action.isError,
  )
  const busy = [actions.arrangePickup, actions.completeSale, actions.closeNegotiation].some(
    (action) => action.isPending,
  )
  const statusAction = actions.pause.isError ? actions.pause : actions.reactivate.isError ? actions.reactivate : null

  function closeDialog() {
    actions.markAsSold.reset()
    actions.remove.reset()
    setDialog(null)
  }

  return (
    <section className="mx-auto flex max-w-[1440px] flex-col gap-6 px-4 pb-20 pt-8 sm:px-5 md:px-12 lg:px-[100px] lg:pt-12">
      <ArrowLink to={ROUTES.profile}>Voltar ao perfil</ArrowLink>

      {notFound ? (
        <EmptyState
          title="Anúncio não encontrado"
          action={<ButtonLink to={ROUTES.profile}>Perfil</ButtonLink>}
        >
          Esse anúncio não existe, foi excluído ou não é seu.
        </EmptyState>
      ) : managed.isError ? (
        <div role="alert">
          <EmptyState
            title="Não foi possível carregar o anúncio"
            action={<Button onClick={() => void managed.refetch()}>Tentar de novo</Button>}
          >
            Confira sua conexão e tente de novo.
          </EmptyState>
        </div>
      ) : (
        <>
          <h1 className="font-display text-4xl font-bold text-navy md:text-[40px]">
            Gerenciar anúncio
          </h1>

          {!listing ? (
            <div className="grid gap-8 lg:grid-cols-[1fr_400px]">
              <p role="status" className="sr-only">
                Carregando anúncio…
              </p>
              <div className="flex flex-col gap-6">
                <Skeleton className="h-[230px] rounded-2xl" />
                <Skeleton className="h-[100px] rounded-2xl" />
                <Skeleton className="h-[200px] rounded-2xl" />
              </div>
              <Skeleton className="h-[460px] rounded-2xl" />
            </div>
          ) : (
            <div className="grid items-start gap-8 lg:grid-cols-[1fr_400px]">
              <div className="flex min-w-0 flex-col gap-6">
                <Card className="flex flex-col gap-5 p-5 sm:flex-row sm:gap-6 sm:p-6">
                  {listing.imageUrl ? (
                    <img
                      src={listing.imageUrl}
                      alt=""
                      className="size-[180px] shrink-0 rounded-xl object-cover"
                    />
                  ) : (
                    <div aria-hidden="true" className="size-[180px] shrink-0 rounded-xl bg-primary-soft" />
                  )}
                  <div className="flex min-w-0 flex-1 flex-col items-start gap-2">
                    <div className="flex flex-wrap gap-2">
                      <ListingStatusBadge status={listing.status} />
                      <Badge>{listing.categoryName}</Badge>
                    </div>
                    <h2 className="break-words font-display text-[28px] font-bold leading-tight text-navy">
                      {listing.title}
                    </h2>
                    <p className="font-display text-2xl font-bold text-navy">
                      {formatCurrency(listing.priceInCents)}
                    </p>
                    <p className="break-words text-sm text-text-muted">{listing.description}</p>
                    <p className="text-[13px] text-text-muted">
                      Publicado em {formatDate(listing.publishedAt)} · WhatsApp{' '}
                      {formatWhatsapp(listing.whatsapp)}
                    </p>
                  </div>
                </Card>

                <ListingStatsCards
                  stats={[
                    { value: listing.views, label: 'Visualizações' },
                    { value: listing.whatsappContacts, label: 'Contatos pelo WhatsApp' },
                    { value: orders.length, label: 'Pedidos recebidos' },
                  ]}
                />

                <ReceivedOrdersList
                  orders={orders}
                  busy={busy}
                  error={orderAction?.error}
                  onArrangePickup={(orderId) => actions.arrangePickup.mutate(orderId)}
                  onCompleteSale={(orderId) => actions.completeSale.mutate(orderId)}
                  onCloseNegotiation={(orderId) => actions.closeNegotiation.mutate(orderId)}
                />
              </div>

              <Card className="flex flex-col gap-4 p-6 sm:p-7">
                <h2 className="text-lg font-semibold text-navy">Ações</h2>

                {statusAction ? (
                  <ErrorAlert title="Não foi possível mudar o anúncio">
                    {statusAction.error instanceof ApiError && statusAction.error.status === 409
                      ? statusAction.error.message
                      : 'Confira sua conexão e tente de novo.'}
                  </ErrorAlert>
                ) : null}

                <ActionGroup hint="Altere nome, descrição, preço, categoria, imagem ou WhatsApp.">
                  <ButtonLink to={listingRoutes.edit(listing.id)} fullWidth>
                    Editar anúncio
                  </ButtonLink>
                </ActionGroup>

                {listing.status === 'active' ? (
                  <ActionGroup hint="O anúncio sai das buscas temporariamente. Você pode reativar quando quiser.">
                    <Button
                      variant="secondary"
                      fullWidth
                      disabled={actions.pause.isPending}
                      onClick={() => actions.pause.mutate()}
                    >
                      {actions.pause.isPending ? 'Pausando…' : 'Pausar anúncio'}
                    </Button>
                  </ActionGroup>
                ) : null}
                {listing.status === 'paused' ? (
                  <ActionGroup hint="O anúncio volta a aparecer nas buscas.">
                    <Button
                      variant="secondary"
                      fullWidth
                      disabled={actions.reactivate.isPending}
                      onClick={() => actions.reactivate.mutate()}
                    >
                      {actions.reactivate.isPending ? 'Reativando…' : 'Reativar anúncio'}
                    </Button>
                  </ActionGroup>
                ) : null}

                {listing.status !== 'sold' ? (
                  <ActionGroup hint="Encerra o anúncio e registra a venda no seu histórico.">
                    <Button variant="secondary" fullWidth onClick={() => setDialog('sold')}>
                      Marcar vendido
                    </Button>
                  </ActionGroup>
                ) : (
                  <p className="rounded-lg bg-primary-soft p-3 text-sm text-navy">
                    Este anúncio foi vendido e não pode ser reativado.
                  </p>
                )}

                <hr className="border-border" />

                <div className="flex flex-col gap-2.5 rounded-xl border border-danger bg-danger-soft p-4">
                  <h3 className="text-[15px] font-bold text-danger">Excluir anúncio</h3>
                  <p className="text-xs text-text">
                    Remove o anúncio permanentemente. Pedidos já pagos continuam no histórico do
                    comprador.
                  </p>
                  <Button variant="danger-outline" fullWidth onClick={() => setDialog('delete')}>
                    Excluir anúncio
                  </Button>
                </div>
              </Card>
            </div>
          )}
        </>
      )}

      {listing && dialog === 'sold' ? (
        <ConfirmDialog
          tone="primary"
          title="Marcar como vendido?"
          description="O anúncio sai das buscas e fica registrado como vendido no seu histórico. Você não poderá reativá-lo."
          confirmLabel="Confirmar venda"
          onConfirm={() => actions.markAsSold.mutate(undefined, { onSuccess: closeDialog })}
          onCancel={closeDialog}
          pending={actions.markAsSold.isPending}
          errorMessage={
            actions.markAsSold.isError ? 'Não foi possível marcar como vendido agora. Tente de novo.' : undefined
          }
        />
      ) : null}
      {listing && dialog === 'delete' ? (
        <ConfirmDialog
          title="Excluir este anúncio?"
          description={`"${listing.title}" será removido permanentemente e deixará de aparecer para os alunos.`}
          confirmLabel="Excluir"
          onConfirm={() =>
            actions.remove.mutate(undefined, {
              onSuccess: () => navigate(ROUTES.profile, { replace: true, state: { listingDeleted: true } }),
            })
          }
          onCancel={closeDialog}
          pending={actions.remove.isPending}
          errorMessage={actions.remove.isError ? deleteFailure(actions.remove.error) : undefined}
        />
      ) : null}
    </section>
  )
}
