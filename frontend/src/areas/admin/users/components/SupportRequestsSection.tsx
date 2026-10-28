import { useState } from 'react'
import { Link } from 'react-router'
import { ErrorAlert } from '../../../../shared/components/ui/Alert'
import { Avatar } from '../../../../shared/components/ui/Avatar'
import { Badge, type BadgeTone } from '../../../../shared/components/ui/Badge'
import { Button } from '../../../../shared/components/ui/Button'
import { Skeleton } from '../../../../shared/components/ui/Skeleton'
import { adminPaths } from '../../../../shared/constants/routes'
import { formatDate } from '../../../../shared/utils/format-date'
import { tableCard } from '../../shared/components/table-styles'
import { useSupportRequests, useUpdateSupportRequest } from '../hooks/use-support-requests'
import { ResolveSupportDialog } from './ResolveSupportDialog'
import type { SupportRequest, SupportRequestStatus, SupportRequestType } from '../types/support.types'

const TYPE_LABEL: Record<SupportRequestType, string> = {
  refund: 'Reembolso',
  order_cancellation: 'Cancelamento de pedido',
  other: 'Outro assunto',
}
const STATUS: Record<SupportRequestStatus, { label: string; tone: BadgeTone }> = {
  open: { label: 'Aberta', tone: 'danger' },
  in_review: { label: 'Em análise', tone: 'warning' },
  resolved: { label: 'Resolvida', tone: 'done' },
  denied: { label: 'Negada', tone: 'danger' },
}

const isClosed = (status: SupportRequestStatus) => status === 'resolved' || status === 'denied'

// Suporte ao usuário (Usuários, abaixo da lista): pedidos de reembolso, cancelamento de pedido e
// outros assuntos. O admin passa a solicitação para "Em análise" e depois a "Resolvida".
export function SupportRequestsSection() {
  const requests = useSupportRequests()
  const update = useUpdateSupportRequest()
  const [resolving, setResolving] = useState<SupportRequest | null>(null)
  const items = requests.data ?? []
  const pending = items.filter((request) => isClosed(request.status) === false).length

  return (
    <section aria-labelledby="support-title" className="flex flex-col gap-4 pt-4">
      <div className="flex flex-col gap-1">
        <h2 id="support-title" className="font-display text-2xl font-bold text-navy">
          Suporte ao usuário
        </h2>
        <p className="text-sm text-text-muted">
          Solicitações de reembolso, cancelamento de pedido e outros assuntos enviadas pelos alunos.
          {requests.data ? ` ${pending} aguardando atendimento.` : ''}
        </p>
      </div>

      {update.isError ? (
        <ErrorAlert title="Não foi possível atualizar a solicitação">Confira sua conexão e tente de novo.</ErrorAlert>
      ) : null}

      {requests.isPending ? (
        <>
          <p role="status" className="sr-only">
            Carregando solicitações…
          </p>
          <Skeleton className="h-32 rounded-2xl" />
        </>
      ) : requests.isError ? (
        <div role="alert" className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-surface p-5 text-sm text-text-muted">
          Não foi possível carregar as solicitações.
          <Button size="sm" variant="secondary" onClick={() => void requests.refetch()}>
            Tentar de novo
          </Button>
        </div>
      ) : items.length === 0 ? (
        <p className="rounded-2xl border border-border bg-surface p-5 text-sm text-text-muted">
          Nenhuma solicitação de suporte por enquanto.
        </p>
      ) : (
        <ul className={`${tableCard} divide-y divide-border`}>
          {items.map((request) => (
            <li key={request.id} className="flex flex-wrap items-start gap-x-4 gap-y-3 px-5 py-4">
              <Avatar name={request.userName} />
              <div className="flex min-w-0 flex-1 basis-60 flex-col gap-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone="info">{TYPE_LABEL[request.type]}</Badge>
                  <Badge tone={STATUS[request.status].tone}>{STATUS[request.status].label}</Badge>
                  <span className="text-[13px] text-text-muted">{formatDate(request.createdAt)}</span>
                </div>
                <p className="break-words text-sm text-text">{request.message}</p>
                <p className="break-words text-[13px] text-text-muted">
                  <Link
                    to={adminPaths.userDetail(request.userId)}
                    className="font-semibold text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                  >
                    {request.userName}
                  </Link>{' '}
                  · {request.userEmail}
                  {request.orderId ? ` · Pedido #${request.orderId}` : ''}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {request.status === 'open' ? (
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={update.isPending}
                    onClick={() => update.mutate({ id: request.id, status: 'in_review' })}
                  >
                    Em análise
                  </Button>
                ) : null}
                {!isClosed(request.status) ? (
                  <Button
                    size="sm"
                    disabled={update.isPending}
                    onClick={() => {
                      update.reset()
                      setResolving(request)
                    }}
                  >
                    Resolver
                  </Button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}

      {resolving ? (
        <ResolveSupportDialog
          request={resolving}
          onDecide={(status) =>
            update.mutate({ id: resolving.id, status }, { onSuccess: () => setResolving(null) })
          }
          onClose={() => setResolving(null)}
          pending={update.isPending}
          failed={update.isError}
        />
      ) : null}
    </section>
  )
}
