import { Navigate, useParams } from 'react-router'
import { Button, ButtonLink } from '../../../../shared/components/ui/Button'
import { Card } from '../../../../shared/components/ui/Card'
import { EmptyState } from '../../../../shared/components/ui/EmptyState'
import { Skeleton } from '../../../../shared/components/ui/Skeleton'
import { ROUTES } from '../../../../shared/constants/routes'
import { useDocumentTitle } from '../../../../shared/hooks/use-document-title'
import { ApiError } from '../../../../shared/lib/api'
import { useOrder } from '../../orders/hooks/use-order'
import { isPaidOrder, isRefundedOrder, parseOrderId } from '../../orders/utils/order-params'
import { OrderPaidCard } from '../components/OrderPaidCard'
import { OrderRefundedCard } from '../components/OrderRefundedCard'

const sectionClasses = 'mx-auto flex max-w-[1440px] flex-col items-center px-4 pb-24 pt-10 sm:px-5 lg:pt-16'

// RF011 · RN-PED-03 e RN-PAG-11 (Figma 10). Só diz "Pagamento confirmado" com o pedido Pago no
// backend; pedido cancelado com estorno mostra o aviso (RN-PAG-08, 13 e 14).
export function OrderConfirmedPage() {
  const { pedidoId } = useParams()
  const orderId = parseOrderId(pedidoId)
  const query = useOrder(orderId)
  const order = query.data
  useDocumentTitle(order && isRefundedOrder(order) ? 'Pedido cancelado' : 'Pagamento confirmado')

  // Ainda Pendente: não há o que confirmar, a pessoa volta ao pagamento.
  if (order?.status === 'pending') {
    return <Navigate to={`${ROUTES.payment}/${order.id}`} replace />
  }

  const status = query.error instanceof ApiError ? query.error.status : null
  const missing = orderId === null || status === 404 || status === 403

  return (
    <section className={sectionClasses}>
      <Card className="w-full max-w-[520px] p-6 sm:p-10">
        {missing ? (
          <EmptyState title="Pedido não encontrado" action={<ButtonLink to={ROUTES.categories}>Categorias</ButtonLink>}>
            Este pedido não existe ou o endereço está incorreto.
          </EmptyState>
        ) : query.isError ? (
          <div role="alert">
            <EmptyState
              title="Não foi possível carregar o pedido"
              action={<Button onClick={() => void query.refetch()}>Tentar de novo</Button>}
            >
              Confira sua conexão e tente de novo.
            </EmptyState>
          </div>
        ) : !order ? (
          <div aria-busy="true" className="flex flex-col items-center gap-4">
            <p role="status" className="sr-only">
              Carregando pedido…
            </p>
            <Skeleton className="size-16 rounded-full" />
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-28 w-full rounded-lg" />
          </div>
        ) : isPaidOrder(order) ? (
          <OrderPaidCard order={order} />
        ) : isRefundedOrder(order) ? (
          <OrderRefundedCard order={order} />
        ) : (
          <EmptyState title="Pedido sem pagamento" action={<ButtonLink to={ROUTES.categories}>Categorias</ButtonLink>}>
            Este pedido não tem pagamento confirmado.
          </EmptyState>
        )}
      </Card>
    </section>
  )
}
