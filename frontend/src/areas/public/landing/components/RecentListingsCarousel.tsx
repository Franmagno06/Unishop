import { useCallback, useEffect, useRef, useState } from 'react'
import arrowLeft from '../../../../assets/arrow-left.svg'
import arrowRight from '../../../../assets/arrow-right.svg'
import { formatCurrency } from '../../../../shared/utils/format-currency'
import { recentListings } from '../data/recent-listings'

const CARDS_PER_PAGE = 2
const pageCount = Math.ceil(recentListings.length / CARDS_PER_PAGE)

const arrowButton =
  'flex size-10 items-center justify-center rounded-full bg-navy transition-[transform,opacity] duration-150 ease-out-strong active:scale-[0.95] aria-disabled:pointer-events-none aria-disabled:opacity-30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary'

// Carrossel do protótipo: 2 anúncios por página com uma prévia do próximo. Usa rolagem nativa com
// encaixe (scroll-snap), então arrastar e o toque funcionam sem biblioteca. Visível ao visitante (RF001).
export function RecentListingsCarousel() {
  const trackRef = useRef<HTMLUListElement>(null)
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
        className="flex snap-x snap-mandatory gap-4 overflow-x-auto overscroll-x-contain pb-1 scrollbar-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary [&::-webkit-scrollbar]:hidden"
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
