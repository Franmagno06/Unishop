import { useId, useRef, type KeyboardEvent, type ReactNode } from 'react'
import { BoltIcon, CreditCardIcon } from '../../../../shared/components/ui/icons'

export type PaymentMethod = 'card' | 'pix'

type PaymentMethodTabsProps = {
  method: PaymentMethod
  onMethodChange: (method: PaymentMethod) => void
  // O painel da forma escolhida (CardPaymentForm ou PixPayment); só um fica na tela por vez.
  children: ReactNode
}

const METHODS: { value: PaymentMethod; label: string; icon: ReactNode }[] = [
  { value: 'card', label: 'Cartão de crédito', icon: <CreditCardIcon className="size-[18px]" /> },
  { value: 'pix', label: 'Pix', icon: <BoltIcon className="size-[18px]" /> },
]

// Abas "Cartão de crédito" e "Pix" (Figma 09a e 09b), no padrão de abas do WAI-ARIA: setas,
// Home e End trocam de aba e mexem o foco junto.
export function PaymentMethodTabs({ method, onMethodChange, children }: PaymentMethodTabsProps) {
  const baseId = useId()
  const tabRefs = useRef<Record<PaymentMethod, HTMLButtonElement | null>>({ card: null, pix: null })
  const tabId = (value: PaymentMethod) => `${baseId}-tab-${value}`
  const panelId = `${baseId}-panel`

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const index = METHODS.findIndex((item) => item.value === method)
    let next: number | null = null
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = (index + 1) % METHODS.length
    if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = (index - 1 + METHODS.length) % METHODS.length
    if (event.key === 'Home') next = 0
    if (event.key === 'End') next = METHODS.length - 1
    if (next === null) return
    event.preventDefault()
    const target = METHODS[next]!.value
    onMethodChange(target)
    tabRefs.current[target]?.focus()
  }

  return (
    <div className="flex flex-col gap-5">
      <div role="tablist" aria-label="Forma de pagamento" onKeyDown={handleKeyDown} className="grid grid-cols-2 gap-3">
        {METHODS.map((item) => {
          const selected = item.value === method
          return (
            <button
              key={item.value}
              ref={(node) => {
                tabRefs.current[item.value] = node
              }}
              id={tabId(item.value)}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls={panelId}
              tabIndex={selected ? 0 : -1}
              onClick={() => onMethodChange(item.value)}
              className={`inline-flex items-center justify-center gap-2 rounded-lg border-[1.5px] px-3 py-3 text-[13px] font-semibold text-navy transition-[transform,background-color,border-color] duration-150 ease-out-strong active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                selected ? 'border-primary bg-primary-soft' : 'border-border bg-surface hover:border-navy/40'
              }`}
            >
              {item.icon}
              {item.label}
            </button>
          )
        })}
      </div>

      <div id={panelId} role="tabpanel" aria-labelledby={tabId(method)} className="flex flex-col gap-5">
        {children}
      </div>
    </div>
  )
}
