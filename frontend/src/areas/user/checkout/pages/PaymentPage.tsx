import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Navigate, useParams } from 'react-router'
import { ErrorAlert } from '../../../../shared/components/ui/Alert'
import { BackLink } from '../../../../shared/components/ui/BackLink'
import { Button, ButtonLink } from '../../../../shared/components/ui/Button'
import { Card } from '../../../../shared/components/ui/Card'
import { EmptyState } from '../../../../shared/components/ui/EmptyState'
import { Skeleton } from '../../../../shared/components/ui/Skeleton'
import { ROUTES } from '../../../../shared/constants/routes'
import { useDocumentTitle } from '../../../../shared/hooks/use-document-title'
import { ApiError } from '../../../../shared/lib/api'
import { MOCK_MODE } from '../../../../shared/lib/mock-mode'
import { formatCurrency } from '../../../../shared/utils/format-currency'
import { useOrder } from '../../orders/hooks/use-order'
import type { Order } from '../../orders/types/order.types'
import { isPaidOrder, isRefundedOrder, parseOrderId } from '../../orders/utils/order-params'
import { CardPaymentForm } from '../components/CardPaymentForm'
import { DemoEnvironmentNotice } from '../components/DemoEnvironmentNotice'
import { OrderSummary } from '../components/OrderSummary'
import { PaymentMethodTabs, type PaymentMethod } from '../components/PaymentMethodTabs'
import { PixDemoControls } from '../components/PixDemoControls'
import { PixPayment } from '../components/PixPayment'
import { useConfirmPix, useSimulatePixExpiry } from '../hooks/use-confirm-pix'
import { usePayWithCard } from '../hooks/use-pay-with-card'
import { usePixCharge } from '../hooks/use-pix-charge'

const CARD_FORM_ID = 'card-payment-form'
const sectionClasses = 'mx-auto flex max-w-[1440px] flex-col gap-6 px-4 pb-24 pt-8 sm:px-5 md:px-12 lg:px-[100px] lg:pt-12'

function cardErrorMessage(error: Error): string {
  if (error instanceof ApiError) {
    if (error.code === 'NETWORK_ERROR') return 'Sem conexão com o servidor. Confira sua internet e tente de novo.'
    if (error.status === 429) return 'Muitas tentativas seguidas. Aguarde um pouco e tente de novo.'
    if (error.code === 'PAYMENT_DECLINED') return error.message // RN-PAG-07
  }
  return 'Não foi possível processar o pagamento agora. Tente de novo em instantes.'
}

function PaymentSkeleton() {
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]" aria-busy="true">
      <Skeleton className="h-[420px] w-full rounded-2xl" />
      <Skeleton className="h-[320px] w-full rounded-2xl" />
    </div>
  )
}

function PaymentForm({ order }: { order: Order }) {
  const queryClient = useQueryClient()
  const [method, setMethod] = useState<PaymentMethod>('card')
  const card = usePayWithCard(order.id)
  const pix = usePixCharge(order.id, method === 'pix')
  const confirmPix = useConfirmPix(order.id)
  const simulateExpiry = useSimulatePixExpiry(order.id)
  const paying = card.state.status === 'pending'

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
      <Card className="flex flex-col gap-5 p-5 sm:p-8">
        <h2 className="text-base font-semibold text-navy">Como você quer pagar?</h2>
        <PaymentMethodTabs method={method} onMethodChange={setMethod}>
          {method === 'card' ? (
            <CardPaymentForm
              formId={CARD_FORM_ID}
              totalInCents={order.totalInCents}
              onSubmit={(values) => void card.pay(values)}
              submitError={card.state.status === 'failed' ? cardErrorMessage(card.state.error) : null}
            />
          ) : pix.data ? (
            <>
              <PixPayment
                charge={pix.data}
                onExpire={() => void queryClient.invalidateQueries({ queryKey: ['order', order.id] })}
              />
              {confirmPix.isError ? (
                <ErrorAlert>Não foi possível conferir o pagamento. Tente de novo em instantes.</ErrorAlert>
              ) : null}
              {MOCK_MODE ? <PixDemoControls onExpire={() => simulateExpiry.mutate()} /> : null}
            </>
          ) : pix.isError ? (
            <div className="flex flex-col items-start gap-3">
              <ErrorAlert>Não foi possível gerar o código Pix. Tente de novo.</ErrorAlert>
              <Button variant="secondary" onClick={() => void pix.refetch()}>
                Tentar de novo
              </Button>
            </div>
          ) : (
            <div aria-busy="true">
              <p role="status" className="sr-only">
                Gerando o código Pix…
              </p>
              <Skeleton className="h-44 w-full rounded-xl" />
            </div>
          )}
        </PaymentMethodTabs>
      </Card>

      <OrderSummary order={order}>
        {method === 'card' ? (
          <Button type="submit" form={CARD_FORM_ID} fullWidth disabled={paying}>
            {paying ? 'Processando…' : `Pagar ${formatCurrency(order.totalInCents)}`}
          </Button>
        ) : (
          <Button fullWidth onClick={() => confirmPix.mutate()} disabled={!pix.data || confirmPix.isPending}>
            {confirmPix.isPending ? 'Conferindo…' : 'Já paguei'}
          </Button>
        )}
        <p role="status" className="sr-only">
          {paying ? 'Processando o pagamento…' : confirmPix.isPending ? 'Conferindo o pagamento…' : ''}
        </p>
      </OrderSummary>
    </div>
  )
}

// RF010 · RN-PAG-02, 03, 04, 07, 09, 11 e 15 (Figma 09a e 09b). Cartão ou Pix, resumo do pedido e
// aviso de demonstração. Hoje usa pedidos de exemplo; a API real só troca o serviço.
export function PaymentPage() {
  const { pedidoId } = useParams()
  const orderId = parseOrderId(pedidoId)
  const query = useOrder(orderId)
  const order = query.data
  useDocumentTitle('Pagamento')

  if (order && (isPaidOrder(order) || isRefundedOrder(order))) {
    // RN-PAG-11: o pedido já está Pago (ou foi estornado): quem mostra isso é a confirmação.
    return <Navigate to={`${ROUTES.orderConfirmed}/${order.id}`} replace />
  }

  const status = query.error instanceof ApiError ? query.error.status : null
  const forbidden = status === 403
  const notFound = orderId === null || status === 404
  const expired = order?.status === 'cancelled'

  return (
    <section className={sectionClasses}>
      <BackLink fallbackTo={order ? `${ROUTES.products}/${order.listingId}` : ROUTES.categories}>
        {order ? 'Voltar ao produto' : 'Voltar'}
      </BackLink>
      <h1 className="font-display text-3xl font-bold text-navy lg:text-[40px]">Pagamento</h1>
      <DemoEnvironmentNotice />

      {forbidden ? (
        <EmptyState title="Acesso negado" action={<ButtonLink to={ROUTES.categories}>Ver categorias</ButtonLink>}>
          Este pedido é de outra pessoa.
        </EmptyState>
      ) : notFound ? (
        <EmptyState title="Pedido não encontrado" action={<ButtonLink to={ROUTES.categories}>Ver categorias</ButtonLink>}>
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
        <>
          <p role="status" className="sr-only">
            Carregando pedido…
          </p>
          <PaymentSkeleton />
        </>
      ) : expired ? (
        // RN-PAG-04 e 12: pedido vencido é cancelado e a pessoa faz um novo; não há novo código.
        <EmptyState
          title="Pedido cancelado"
          action={<ButtonLink to={`${ROUTES.products}/${order.listingId}`}>Fazer um novo pedido</ButtonLink>}
        >
          O prazo de 30 minutos para pagar acabou e o pedido foi cancelado. Nenhum valor foi cobrado.
        </EmptyState>
      ) : (
        <PaymentForm order={order} />
      )}
    </section>
  )
}
