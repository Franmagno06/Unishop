import { useState } from 'react'
import { ArrowLink } from '../../../../shared/components/ui/ArrowLink'
import { Button, ButtonLink } from '../../../../shared/components/ui/Button'
import { ConfirmDialog } from '../../../../shared/components/ui/ConfirmDialog'
import { EmptyState } from '../../../../shared/components/ui/EmptyState'
import { Skeleton } from '../../../../shared/components/ui/Skeleton'
import { ROUTES } from '../../../../shared/constants/routes'
import { useDocumentTitle } from '../../../../shared/hooks/use-document-title'
import { OrderCard } from '../components/OrderCard'
import { useCancelOrder, useConfirmReceipt, useMyOrders } from '../hooks/use-orders'
import type { BuyerOrder } from '../types/order.types'

type Pending = { kind: 'cancel' | 'receipt'; order: BuyerOrder } | null

// RF014 · RN-PED-06, 08 e 12 (Figma 05c). Lista do mais recente ao mais antigo. Dados de exemplo;
// sem guard até a API.
export function MyOrdersPage() {
  useDocumentTitle('Meus pedidos')
  const orders = useMyOrders()
  const cancel = useCancelOrder()
  const receipt = useConfirmReceipt()
  const [pending, setPending] = useState<Pending>(null)

  const action = pending?.kind === 'cancel' ? cancel : receipt

  function close() {
    cancel.reset()
    receipt.reset()
    setPending(null)
  }

  function confirm() {
    if (!pending) return
    action.mutate(pending.order.id, { onSuccess: close })
  }

  return (
    <section className="mx-auto flex max-w-[1440px] flex-col gap-6 px-4 pb-20 pt-8 sm:px-5 md:px-12 lg:px-[100px] lg:pt-12">
      <ArrowLink to={ROUTES.profile}>Voltar ao perfil</ArrowLink>
      <div className="flex flex-col gap-1.5">
        <h1 className="font-display text-4xl font-bold text-navy md:text-[40px]">Meus pedidos</h1>
        <p className="text-base text-text-muted">
          Itens que você comprou ou reservou com outros alunos.
        </p>
      </div>

      <p role="status" className="sr-only">
        {orders.isPending ? 'Carregando pedidos…' : orders.isSuccess ? `${orders.data.length} pedidos` : ''}
      </p>

      {orders.isPending ? (
        <div className="flex flex-col gap-6">
          <Skeleton className="h-[190px] rounded-2xl" />
          <Skeleton className="h-[190px] rounded-2xl" />
        </div>
      ) : orders.isError ? (
        <div role="alert">
          <EmptyState
            title="Não foi possível carregar seus pedidos"
            action={<Button onClick={() => void orders.refetch()}>Tentar de novo</Button>}
          >
            Confira sua conexão e tente de novo.
          </EmptyState>
        </div>
      ) : orders.data.length === 0 ? (
        <EmptyState
          title="Você ainda não fez nenhum pedido"
          action={<ButtonLink to={ROUTES.categories}>Categorias</ButtonLink>}
        >
          Quando você comprar ou reservar um item, ele aparece aqui.
        </EmptyState>
      ) : (
        <ul className="flex flex-col gap-6">
          {orders.data.map((order) => (
            <li key={order.id}>
              <OrderCard
                order={order}
                onCancel={(item) => setPending({ kind: 'cancel', order: item })}
                onConfirmReceipt={(item) => setPending({ kind: 'receipt', order: item })}
              />
            </li>
          ))}
        </ul>
      )}

      {pending?.kind === 'cancel' ? (
        <ConfirmDialog
          title="Cancelar este pedido?"
          description={`O pedido de "${pending.order.listingTitle}" será cancelado e o vendedor deixa de esperar por você.`}
          confirmLabel="Cancelar pedido"
          cancelLabel="Voltar"
          onConfirm={confirm}
          onCancel={close}
          pending={action.isPending}
          errorMessage={action.isError ? 'Não foi possível cancelar agora. Atualize a página e tente de novo.' : undefined}
        />
      ) : null}
      {pending?.kind === 'receipt' ? (
        <ConfirmDialog
          tone="primary"
          title="Confirmar recebimento?"
          description={`Confirme só depois de ter retirado "${pending.order.listingTitle}" com o vendedor. O pedido passa a Concluído.`}
          confirmLabel="Confirmar recebimento"
          cancelLabel="Voltar"
          onConfirm={confirm}
          onCancel={close}
          pending={action.isPending}
          errorMessage={action.isError ? 'Não foi possível confirmar agora. Atualize a página e tente de novo.' : undefined}
        />
      ) : null}
    </section>
  )
}
