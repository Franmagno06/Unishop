import { useState } from 'react'
import { useSearchParams } from 'react-router'
import { ArrowLink } from '../../../../shared/components/ui/ArrowLink'
import { Button, ButtonLink } from '../../../../shared/components/ui/Button'
import { ConfirmDialog } from '../../../../shared/components/ui/ConfirmDialog'
import { EmptyState } from '../../../../shared/components/ui/EmptyState'
import { Skeleton } from '../../../../shared/components/ui/Skeleton'
import { ROUTES } from '../../../../shared/constants/routes'
import { useDocumentTitle } from '../../../../shared/hooks/use-document-title'
import { CancelOrderDialog } from '../components/CancelOrderDialog'
import { OrderCard } from '../components/OrderCard'
import { useCancelOrder, useConfirmReceipt, useMyOrders } from '../hooks/use-orders'
import type { BuyerOrder } from '../types/order.types'
import { orderFilters, type OrderFilter } from '../utils/order-status'

// Cor da bolinha de cada filtro, a mesma do selo do status.
const dotTone: Record<string, string> = {
  info: 'bg-primary',
  done: 'bg-whatsapp-hover',
  warning: 'bg-warning',
}

type Pending = { kind: 'cancel' | 'receipt'; order: BuyerOrder } | null

// RF014 · RN-PED-06, 08 e 12 (Figma 05c). Lista do mais recente ao mais antigo. Dados de exemplo;
// sem guard até a API.
export function MyOrdersPage() {
  useDocumentTitle('Meus pedidos')
  const orders = useMyOrders()
  const cancel = useCancelOrder()
  const receipt = useConfirmReceipt()
  const [pending, setPending] = useState<Pending>(null)
  const [params, setParams] = useSearchParams()
  // O filtro vai na URL (/meus-pedidos?status=concluido): o link copiado e o "voltar" reabrem o mesmo filtro.
  const filter: OrderFilter = orderFilters.find((item) => item.param === params.get('status'))?.value ?? 'all'
  const activeFilter = orderFilters.find((item) => item.value === filter)!
  const allOrders = orders.data ?? []
  const visibleOrders = activeFilter.statuses
    ? allOrders.filter((order) => activeFilter.statuses!.includes(order.status))
    : allOrders

  function selectFilter(next: OrderFilter) {
    const param = orderFilters.find((item) => item.value === next)!.param
    setParams(param ? { status: param } : {}, { replace: true })
  }

  const action = receipt

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

      <div role="group" aria-label="Filtrar pedidos por status" className="flex flex-wrap gap-2">
        {orderFilters.map((item) => {
          const count = item.statuses
            ? allOrders.filter((order) => item.statuses!.includes(order.status)).length
            : allOrders.length
          return (
            <button
              key={item.value}
              type="button"
              aria-pressed={filter === item.value}
              onClick={() => selectFilter(item.value)}
              className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-border bg-surface px-4 py-2 text-[13px] font-semibold text-navy transition-colors duration-150 hover:border-navy/40 aria-pressed:border-navy aria-pressed:bg-navy aria-pressed:text-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              {item.tone ? (
                <span aria-hidden="true" className={`size-2 rounded-full ${dotTone[item.tone]} ring-1 ring-surface/60`} />
              ) : null}
              {item.label}
              {orders.isSuccess ? <span className="font-normal opacity-70">({count})</span> : null}
            </button>
          )
        })}
      </div>

      <p role="status" className="sr-only">
        {orders.isPending ? 'Carregando pedidos…' : orders.isSuccess ? `${visibleOrders.length} pedidos` : ''}
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
      ) : allOrders.length > 0 && visibleOrders.length === 0 ? (
        <EmptyState title="Nenhum pedido com esse status">
          Escolha outro status ou veja todos os pedidos.
        </EmptyState>
      ) : orders.data.length === 0 ? (
        <EmptyState
          title="Você ainda não fez nenhum pedido"
          action={<ButtonLink to={ROUTES.categories}>Categorias</ButtonLink>}
        >
          Quando você comprar ou reservar um item, ele aparece aqui.
        </EmptyState>
      ) : (
        <ul className="flex flex-col gap-6">
          {visibleOrders.map((order) => (
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
        <CancelOrderDialog
          order={pending.order}
          onConfirm={(reason) => cancel.mutate({ id: pending.order.id, reason }, { onSuccess: close })}
          onCancel={close}
          pending={cancel.isPending}
          failed={cancel.isError}
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
