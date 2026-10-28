import { useState } from 'react'
import { useParams } from 'react-router'
import { ArrowLink } from '../../../../shared/components/ui/ArrowLink'
import { Button, ButtonLink } from '../../../../shared/components/ui/Button'
import { EmptyState } from '../../../../shared/components/ui/EmptyState'
import { Skeleton } from '../../../../shared/components/ui/Skeleton'
import { cardClasses } from '../../../../shared/components/ui/card-styles'
import { ROUTES } from '../../../../shared/constants/routes'
import { useDocumentTitle } from '../../../../shared/hooks/use-document-title'
import { formatCurrency } from '../../../../shared/utils/format-currency'
import { formatDate } from '../../../../shared/utils/format-date'
import { formatWhatsapp } from '../../../../shared/utils/whatsapp'
import { CancelOrderDialog } from '../components/CancelOrderDialog'
import { InfoDialog } from '../components/InfoDialog'
import { RefundRequestDialog } from '../components/RefundRequestDialog'
import { ReviewOrderDialog } from '../components/ReviewOrderDialog'
import { OrderStatusBadge } from '../components/OrderStatusBadge'
import {
  useCancelOrder,
  useMyOrder,
  useReportRefundNotReceived,
  useRequestRefund,
  useReviewOrder,
} from '../hooks/use-orders'
import { cancelReasonLabels, paymentMethodLabels, refundDeadlineLabels } from '../utils/order-status'

function parseOrderId(value: string | undefined): number | null {
  const id = Number(value)
  return Number.isInteger(id) && id > 0 ? id : null
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6">
      <dt className="text-sm text-text-muted">{label}</dt>
      <dd className="break-words text-base font-semibold text-text sm:text-right">{children}</dd>
    </div>
  )
}

type Dialog = 'review' | 'review-sent' | 'cancel' | 'cancel-done' | 'refund' | 'refund-sent' | 'not-received' | null

// Detalhes do pedido (RN-PED-06 e 12). Prazo de entrega, cancelamento de pedido pago e reembolso
// foram pedidos para a tela e NÃO estão nas Regras (ver `deliveryDeadline`, `refund_review`): são
// provisórios, com dados de exemplo.
export function OrderDetailsPage() {
  const { id } = useParams()
  const orderId = parseOrderId(id)
  const query = useMyOrder(orderId)
  const cancel = useCancelOrder()
  const requestRefund = useRequestRefund()
  const reportNotReceived = useReportRefundNotReceived()
  const review = useReviewOrder(query.data?.listingId ?? 0)
  const [dialog, setDialog] = useState<Dialog>(null)
  const order = query.data
  useDocumentTitle(order ? `Pedido #${order.code}` : 'Detalhes do pedido')

  const notFound = orderId === null || (query.isSuccess && query.data === null)
  const isPaidStatus = order?.status === 'paid' || order?.status === 'pickup_arranged'
  const canCancel = order?.status === 'pending' || order?.status === 'negotiating' || isPaidStatus
  // Pago pelo site (Pix ou cartão): cancelar gera reembolso. Na entrega não há o que reembolsar.
  const refundable = isPaidStatus && order?.paymentMethod !== 'on_delivery'

  function close() {
    cancel.reset()
    requestRefund.reset()
    review.reset()
    reportNotReceived.reset()
    setDialog(null)
  }

  return (
    <section className="mx-auto flex max-w-[960px] flex-col gap-6 px-4 pb-20 pt-8 sm:px-5 md:px-12 lg:pt-12">
      <ArrowLink to={ROUTES.myOrders}>Voltar aos pedidos</ArrowLink>

      {notFound ? (
        <EmptyState
          title="Pedido não encontrado"
          action={<ButtonLink to={ROUTES.myOrders}>Meus pedidos</ButtonLink>}
        >
          Esse pedido não existe ou não é seu.
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
        <>
          <p role="status" className="sr-only">
            Carregando pedido…
          </p>
          <Skeleton className="h-10 w-72 rounded-xl" />
          <Skeleton className="h-[320px] rounded-2xl" />
        </>
      ) : (
        <>
          <div className="flex flex-col items-start gap-2">
            <OrderStatusBadge status={order.status} perspective="buyer" />
            <h1 className="font-display text-4xl font-bold text-navy md:text-[40px]">Detalhes do pedido</h1>
            <p className="text-base text-text-muted">
              Pedido #{order.code} · feito em {formatDate(order.createdAt)}
            </p>
          </div>

          <div className={`${cardClasses} flex flex-col gap-5 p-5 sm:flex-row sm:gap-6 sm:p-6`}>
            {order.imageUrl ? (
              <img src={order.imageUrl} alt="" className="size-32 shrink-0 rounded-xl object-cover" />
            ) : (
              <div aria-hidden="true" className="size-32 shrink-0 rounded-xl bg-primary-soft" />
            )}
            <div className="flex min-w-0 flex-col gap-2">
              <h2 className="break-words text-lg font-semibold text-navy">{order.listingTitle}</h2>
              <p className="break-words text-sm text-text-muted">{order.listingDescription}</p>
              <p className="font-display text-xl font-bold text-navy">{formatCurrency(order.priceInCents)}</p>
            </div>
          </div>

          <dl className={`${cardClasses} flex flex-col gap-4 p-5 sm:p-6`}>
            <Row label="Prazo de entrega">
              {order.deliveryDeadline ? formatDate(order.deliveryDeadline) : 'A combinar com o vendedor'}
            </Row>
            <Row label="Pagamento">{paymentMethodLabels[order.paymentMethod]}</Row>
            <Row label="Vendedor">{order.seller.name}</Row>
            <Row label="WhatsApp do vendedor">{formatWhatsapp(order.seller.whatsapp)}</Row>
            {order.status === 'cancelled' && order.cancelReason ? (
              <Row label="Motivo do cancelamento">{cancelReasonLabels[order.cancelReason]}</Row>
            ) : null}
            {order.status === 'cancelled' && order.cancelDetails ? (
              <Row label="Descrição do problema">{order.cancelDetails}</Row>
            ) : null}
          </dl>

          {canCancel ? (
            <div>
              <Button variant="danger" onClick={() => setDialog('cancel')}>
                Cancelar pedido
              </Button>
            </div>
          ) : null}
          {order.status === 'completed' ? (
            <div className="flex flex-wrap items-center gap-3">
              {order.reviewed ? (
                <p role="status" className="text-sm text-text-muted">
                  Você já avaliou este produto.
                </p>
              ) : (
                <Button onClick={() => setDialog('review')}>Fazer avaliação</Button>
              )}
              <Button variant="danger" onClick={() => setDialog('refund')}>
                Pedir reembolso
              </Button>
            </div>
          ) : null}
          {order.status === 'refund_approved' ? (
            order.refundNotReceivedReported ? (
              <p role="status" className="text-sm text-text-muted">
                O suporte foi informado e vai providenciar o seu reembolso.
              </p>
            ) : (
              <div>
                <Button
                  variant="danger"
                  onClick={() => {
                    reportNotReceived.mutate(order.id)
                    setDialog('not-received')
                  }}
                >
                  Não recebi reembolso
                </Button>
              </div>
            )
          ) : null}

          {dialog === 'review' ? (
            <ReviewOrderDialog
              order={order}
              onConfirm={(value) =>
                review.mutate({ id: order.id, review: value }, { onSuccess: () => setDialog('review-sent') })
              }
              onCancel={close}
              pending={review.isPending}
              failed={review.isError}
            />
          ) : null}
          {dialog === 'review-sent' ? (
            <InfoDialog
              title="Avaliação enviada"
              description="Obrigado! Sua avaliação já aparece na página do produto."
              onClose={close}
            />
          ) : null}
          {dialog === 'cancel' ? (
            <CancelOrderDialog
              order={order}
              paid={refundable}
              onConfirm={(reason, details) =>
                cancel.mutate(
                  { id: order.id, reason, details },
                  { onSuccess: () => setDialog(refundable ? 'cancel-done' : null) },
                )
              }
              onCancel={close}
              pending={cancel.isPending}
              failed={cancel.isError}
            />
          ) : null}
          {dialog === 'cancel-done' && order.paymentMethod !== 'on_delivery' ? (
            <InfoDialog
              title="Pedido cancelado"
              description="O reembolso será feito no mesmo meio de pagamento que você usou."
              onClose={close}
            >
              <p className="rounded-xl bg-background p-4 text-sm text-text">
                {paymentMethodLabels[order.paymentMethod]}: reembolso{' '}
                <strong>{refundDeadlineLabels[order.paymentMethod]}</strong>.
              </p>
            </InfoDialog>
          ) : null}
          {dialog === 'refund' ? (
            <RefundRequestDialog
              order={order}
              onConfirm={(description) =>
                requestRefund.mutate({ id: order.id, description }, { onSuccess: () => setDialog('refund-sent') })
              }
              onCancel={close}
              pending={requestRefund.isPending}
              failed={requestRefund.isError}
            />
          ) : null}
          {dialog === 'refund-sent' ? (
            <InfoDialog
              title="Pedido de reembolso enviado"
              description="Recebemos o seu pedido. Depois de avaliar, o suporte responde a você."
              onClose={close}
            />
          ) : null}
          {dialog === 'not-received' ? (
            <InfoDialog
              title="Suporte informado"
              description="Avisamos o suporte de que você não recebeu o reembolso. Ele vai providenciar o reembolso."
              onClose={close}
            />
          ) : null}
        </>
      )}
    </section>
  )
}
