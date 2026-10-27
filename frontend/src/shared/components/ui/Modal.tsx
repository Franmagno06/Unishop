import { useEffect, useId, useRef, type ReactNode, type RefObject } from 'react'
import { createPortal } from 'react-dom'

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

type ModalProps = {
  // Duas formas de uso: `title` (+ `description` e `icon`) monta o cabeçalho; sem `title`, o
  // conteúdo é livre e `labelledBy` aponta o id do título que ele mesmo desenha.
  title?: string
  labelledBy?: string
  // Padrão `true`: quem monta o pop-up só quando precisa não passa nada; o pop-up sempre montado
  // (ex.: anúncio publicado) controla por aqui.
  open?: boolean
  description?: string
  // Ícone redondo do topo (o "!" e o "✓" do Figma): decorativo.
  icon?: ReactNode
  onClose: () => void
  // Quem recebe o foco ao abrir; sem isso, o primeiro elemento focável.
  initialFocusRef?: RefObject<HTMLElement | null>
  // Com a ação em andamento, Esc e clique fora não fecham.
  busy?: boolean
  children?: ReactNode
}

// Pop-up de confirmação (Figma: "Pop-up · ..."). Foco preso dentro do cartão, Esc fecha e devolve
// o foco a quem abriu, a rolagem da página trava e o clique fora fecha (frontend.md, qualidade).
export function Modal({
  title,
  labelledBy,
  open = true,
  description,
  icon,
  onClose,
  initialFocusRef,
  busy = false,
  children,
}: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const titleId = useId()
  const descriptionId = useId()
  const onCloseRef = useRef(onClose)
  const busyRef = useRef(busy)
  useEffect(() => {
    onCloseRef.current = onClose
    busyRef.current = busy
  })

  useEffect(() => {
    if (!open) return
    const opener = document.activeElement as HTMLElement | null
    const dialog = dialogRef.current
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const firstFocusable = dialog?.querySelector<HTMLElement>(FOCUSABLE)
    const target = initialFocusRef?.current ?? firstFocusable ?? dialog
    target?.focus()

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && !busyRef.current) {
        event.stopPropagation()
        onCloseRef.current()
        return
      }
      if (event.key !== 'Tab' || !dialog) return
      const items = Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE))
      if (items.length === 0) {
        event.preventDefault()
        return
      }
      const first = items[0]!
      const last = items[items.length - 1]!
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      } else if (!dialog.contains(document.activeElement)) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousOverflow
      opener?.focus()
    }
    // O foco inicial só vale na abertura.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  if (!open) return null

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto overscroll-contain bg-navy/45 p-4 transition-opacity duration-150 ease-out-strong starting:opacity-0 motion-reduce:transition-opacity"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busyRef.current) onCloseRef.current()
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : labelledBy}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
        className="flex w-full max-w-[480px] flex-col gap-4 rounded-[20px] bg-surface p-6 shadow-[0_16px_48px_rgba(13,26,51,0.25)] transition-[opacity,translate,scale] duration-200 ease-out-strong focus:outline-none starting:translate-y-2 starting:scale-[0.98] starting:opacity-0 motion-reduce:transition-opacity sm:p-8"
      >
        {icon ? <div aria-hidden="true">{icon}</div> : null}
        {title ? (
          <h2 id={titleId} className="font-display text-[26px] font-bold leading-tight text-navy">
            {title}
          </h2>
        ) : null}
        {description ? (
          <p id={descriptionId} className="break-words text-[15px] text-text-muted">
            {description}
          </p>
        ) : null}
        {children}
      </div>
    </div>,
    document.body,
  )
}
