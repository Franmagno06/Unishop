import { useEffect, useRef, useState } from 'react'
import { ClockIcon, LockIcon } from '../../../../shared/components/ui/icons'
import type { PixCharge } from '../../orders/types/order.types'
import { formatCountdown } from '../utils/card'

type PixPaymentProps = {
  charge: PixCharge
  // Chamado uma vez quando o tempo acaba; a tela consulta o pedido, que já vem Cancelado (RN-PAG-04).
  onExpire: () => void
}

function secondsLeft(expiresAt: string): number {
  return Math.max(0, Math.ceil((Date.parse(expiresAt) - Date.now()) / 1000))
}

// RF010.3 · RN-PAG-04 (Figma 09b): QR Code, passos, código "copia e cola" e contador de 30 min.
// O QR Code é um bloco de exemplo; o real vem da cobrança do Mercado Pago.
export function PixPayment({ charge, onExpire }: PixPaymentProps) {
  const [remaining, setRemaining] = useState(() => secondsLeft(charge.expiresAt))
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle')
  const expired = useRef(false)
  const onExpireRef = useRef(onExpire)
  useEffect(() => {
    onExpireRef.current = onExpire
  })

  useEffect(() => {
    const timer = setInterval(() => {
      const left = secondsLeft(charge.expiresAt)
      setRemaining(left)
      if (left === 0 && !expired.current) {
        expired.current = true
        onExpireRef.current()
      }
    }, 1000)
    return () => clearInterval(timer)
  }, [charge.expiresAt])

  useEffect(() => {
    if (copyState === 'idle') return
    const timer = setTimeout(() => setCopyState('idle'), 2500)
    return () => clearTimeout(timer)
  }, [copyState])

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(charge.code)
      setCopyState('copied')
    } catch {
      setCopyState('failed')
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-5 sm:flex-row">
        <div
          role="img"
          aria-label="QR Code do Pix (exemplo)"
          className="flex aspect-square w-full max-w-[180px] shrink-0 items-center justify-center self-center rounded-xl bg-primary-soft p-4 text-center text-[13px] font-semibold text-navy sm:self-start"
        >
          QR Code Pix
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <h3 className="text-[15px] font-semibold text-navy">Pague com Pix em segundos</h3>
          <ol className="flex list-inside list-decimal flex-col gap-1.5 text-[13px] text-text">
            <li>Abra o app do seu banco e escolha Pix.</li>
            <li>Escaneie o QR Code ou use o código copia e cola.</li>
            <li>A confirmação aparece aqui automaticamente.</li>
          </ol>

          <div className="flex items-center gap-2 rounded-lg border border-border bg-surface py-1.5 pl-3 pr-1.5">
            <label htmlFor="pix-code" className="sr-only">
              Código Pix copia e cola
            </label>
            <input
              id="pix-code"
              readOnly
              value={charge.code}
              onFocus={(event) => event.currentTarget.select()}
              className="min-w-0 flex-1 truncate bg-transparent text-xs text-text-muted focus:outline-none"
            />
            <button
              type="button"
              onClick={() => void copyCode()}
              className="rounded px-2.5 py-1.5 text-xs font-semibold text-primary hover:bg-primary-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              Copiar
            </button>
          </div>
          <p role="status" className="min-h-4 text-xs font-semibold text-whatsapp">
            {copyState === 'copied' ? 'Código copiado!' : null}
            {copyState === 'failed' ? (
              <span className="text-danger">Não foi possível copiar. Selecione o código e copie.</span>
            ) : null}
          </p>

          <p className="flex items-center gap-1.5 text-xs text-text-muted">
            <ClockIcon className="size-3.5" />
            <span>
              O código expira em{' '}
              <time className="font-semibold tabular-nums text-text">{formatCountdown(remaining)}</time>.
            </span>
          </p>
        </div>
      </div>

      <p className="flex items-center gap-1.5 text-xs text-text-muted">
        <LockIcon className="size-3.5" />
        Pagamento processado por gateway seguro com confirmação instantânea.
      </p>
    </div>
  )
}
