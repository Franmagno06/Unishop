import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import arrowLeft from '../../../../assets/arrow-left.svg'
import arrowRight from '../../../../assets/arrow-right.svg'
import { formatCurrency } from '../../../../shared/utils/format-currency'
import { recentListings } from '../data/recent-listings'

const CARDS_PER_PAGE = 2
const pageCount = Math.ceil(recentListings.length / CARDS_PER_PAGE)
// Arrasto com o mouse: só vira arrasto depois de 5 px (um clique parado continua clique) e, acima de
// 0,11 px/ms, conta como gesto rápido e avança uma página mesmo curto.
const DRAG_THRESHOLD_PX = 5
const FLICK_VELOCITY_PX_PER_MS = 0.11

type DragState = {
  pointerId: number
  startX: number
  startScrollLeft: number
  startTime: number
  dragging: boolean
}

const arrowButton =
  'flex size-10 items-center justify-center rounded-full bg-navy transition-[scale,opacity] duration-150 ease-out-strong active:scale-[0.95] aria-disabled:pointer-events-none aria-disabled:opacity-30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary'

// Carrossel do protótipo: 2 anúncios por página com uma prévia do próximo. Usa rolagem nativa com
// encaixe (scroll-snap), então o toque funciona sem biblioteca; o mouse arrasta pelos handlers de
// ponteiro abaixo (estado em ref, sem renderizar a cada quadro). Visível ao visitante (RF001).
export function RecentListingsCarousel() {
  const trackRef = useRef<HTMLUListElement>(null)
  const dragRef = useRef<DragState | null>(null)
  const [page, setPage] = useState(0)

  const pageWidth = useCallback(() => {
    const track = trackRef.current
    const first = track?.firstElementChild as HTMLElement | undefined
    if (!track || !first) return 0
    const gap = parseFloat(getComputedStyle(track).columnGap) || 0
    return (first.offsetWidth + gap) * CARDS_PER_PAGE
  }, [])

  useEffect(() => {
    const track = trackRef.current
    if (!track) return

    let frame = 0
    const onScroll = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const width = pageWidth()
        if (!width) return
        setPage(Math.min(pageCount - 1, Math.round(track.scrollLeft / width)))
      })
    }

    track.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      cancelAnimationFrame(frame)
      track.removeEventListener('scroll', onScroll)
    }
  }, [pageWidth])

  function goTo(target: number) {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    trackRef.current?.scrollTo({
      left: target * pageWidth(),
      behavior: reduceMotion ? 'auto' : 'smooth',
    })
  }

  // Toque e caneta seguem com a rolagem nativa; só o botão principal do mouse arrasta.
  function handlePointerDown(event: ReactPointerEvent<HTMLUListElement>) {
    if (event.pointerType !== 'mouse' || event.button !== 0) return
    // Defesa: limpa o que um arrasto anterior possa ter deixado.
    event.currentTarget.style.scrollSnapType = ''
    delete event.currentTarget.dataset.dragging
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startScrollLeft: event.currentTarget.scrollLeft,
      startTime: event.timeStamp,
      dragging: false,
    }
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLUListElement>) {
    const drag = dragRef.current
    if (!drag || event.pointerId !== drag.pointerId) return
    const track = event.currentTarget

    // Botão solto fora do carrossel antes do limiar (sem captura, o pointerup não chegou aqui):
    // encerra o arrasto em vez de seguir o mouse só com o hover.
    if ((event.buttons & 1) === 0) {
      dragRef.current = null
      if (drag.dragging) {
        track.style.scrollSnapType = ''
        delete track.dataset.dragging
      }
      return
    }

    const delta = event.clientX - drag.startX

    if (!drag.dragging) {
      if (Math.abs(delta) < DRAG_THRESHOLD_PX) return
      drag.dragging = true
      track.setPointerCapture(event.pointerId)
      track.style.scrollSnapType = 'none'
      track.dataset.dragging = ''
      window.getSelection()?.removeAllRanges()
    }

    track.scrollLeft = drag.startScrollLeft - delta
  }

  function handlePointerEnd(event: ReactPointerEvent<HTMLUListElement>) {
    const drag = dragRef.current
    if (!drag || event.pointerId !== drag.pointerId) return
    dragRef.current = null
    if (!drag.dragging) return

    const track = event.currentTarget
    track.style.scrollSnapType = ''
    delete track.dataset.dragging
    if (track.hasPointerCapture(event.pointerId)) track.releasePointerCapture(event.pointerId)

    const width = pageWidth()
    if (!width) return
    const delta = event.clientX - drag.startX
    const elapsed = Math.max(1, event.timeStamp - drag.startTime)
    const startPage = Math.round(drag.startScrollLeft / width)
    const target =
      Math.abs(delta) / elapsed > FLICK_VELOCITY_PX_PER_MS
        ? startPage + (delta < 0 ? 1 : -1)
        : Math.round(track.scrollLeft / width)
    goTo(Math.min(pageCount - 1, Math.max(0, target)))
  }

  return (
    <section aria-labelledby="recentes-titulo" className="flex w-full flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-col gap-0.5">
          <h2 id="recentes-titulo" className="font-display text-2xl font-bold text-navy">
            Anúncios recentes
          </h2>
          <p className="text-[13px] text-text-muted">Arraste ou use as setas para ver mais</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            aria-label="Anúncios anteriores"
            aria-disabled={page === 0}
            onClick={() => page > 0 && goTo(page - 1)}
            className={arrowButton}
          >
            <img src={arrowLeft} alt="" width={18} height={18} />
          </button>
          <button
            type="button"
            aria-label="Próximos anúncios"
            aria-disabled={page === pageCount - 1}
            onClick={() => page < pageCount - 1 && goTo(page + 1)}
            className={arrowButton}
          >
            <img src={arrowRight} alt="" width={18} height={18} />
          </button>
        </div>
      </div>

      <ul
        ref={trackRef}
        tabIndex={0}
        aria-label="Lista de anúncios recentes"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onPointerCancel={handlePointerEnd}
        onLostPointerCapture={handlePointerEnd}
        className="flex snap-x snap-mandatory gap-4 overflow-x-auto overscroll-x-contain pb-1 scrollbar-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary [&::-webkit-scrollbar]:hidden [@media(hover:hover)_and_(pointer:fine)]:cursor-grab data-dragging:cursor-grabbing data-dragging:select-none"
      >
        {recentListings.map((listing) => (
          <li
            key={listing.id}
            className="flex w-60 shrink-0 snap-start flex-col gap-2.5 rounded-[14px] border border-border bg-surface px-4 pb-5 pt-4"
          >
            <div className="h-45 rounded-[10px] bg-primary-soft" aria-hidden="true" />
            <h3 className="line-clamp-2 break-words text-base font-semibold text-navy">{listing.title}</h3>
            <p className="font-display text-[22px] font-bold text-navy">
              {formatCurrency(listing.priceInCents)}
            </p>
            <p className="text-[13px] text-text-muted">{listing.category}</p>
          </li>
        ))}
      </ul>

      <div className="flex gap-1.5" aria-hidden="true">
        {Array.from({ length: pageCount }, (_, index) => (
          <span
            key={index}
            className={`h-2 rounded transition-[width,background-color] duration-200 ease-out-strong motion-reduce:transition-none ${
              index === page ? 'w-6 bg-primary' : 'w-2 bg-border'
            }`}
          />
        ))}
      </div>
    </section>
  )
}
