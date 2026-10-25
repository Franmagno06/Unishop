import type { ReactNode } from 'react'

export type BadgeTone = 'info' | 'neutral' | 'success' | 'danger'

// Cores do Figma: azul-claro (ativo), cinza (concluído) e verde (ATIVO do anúncio). O vermelho
// (cancelado) não é desenhado: deriva do `--danger`.
const tones: Record<BadgeTone, string> = {
  info: 'bg-primary-soft text-navy',
  neutral: 'bg-border text-text-muted',
  success: 'bg-success-soft text-whatsapp',
  danger: 'bg-danger-soft text-danger',
}

// Selo de status em caixa alta (pedido, anúncio, categoria). `dot` põe a bolinha do "ATIVO".
export function Badge({
  tone = 'info',
  dot = false,
  children,
}: {
  tone?: BadgeTone
  dot?: boolean
  children: ReactNode
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase ${tones[tone]}`}
    >
      {dot ? <span aria-hidden="true" className="size-2 rounded-full bg-current" /> : null}
      {children}
    </span>
  )
}
