import { useId } from 'react'
import { formatRating, MAX_STARS, nextRating, starFill } from '../utils/rating'

const STAR_PATH = 'M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5L2.5 9.4l6.6-.9z'
const stars = Array.from({ length: MAX_STARS }, (_, index) => index + 1)

function StarShape({ fill, className }: { fill: 0 | 0.5 | 1; className: string }) {
  return (
    <span aria-hidden="true" className={`relative inline-block shrink-0 ${className}`}>
      <svg viewBox="0 0 24 24" className="absolute inset-0 size-full text-border" fill="currentColor">
        <path d={STAR_PATH} />
      </svg>
      <span className="absolute inset-y-0 left-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
        <svg viewBox="0 0 24 24" className={`${className} max-w-none text-[#c27c0e]`} fill="currentColor">
          <path d={STAR_PATH} />
        </svg>
      </span>
    </span>
  )
}

// Só leitura: leitores de tela ouvem a nota por extenso em vez de cinco estrelas.
export function StarRating({ rating, className = 'size-4' }: { rating: number; className?: string }) {
  return (
    <span role="img" aria-label={`Nota ${formatRating(rating)} de ${MAX_STARS}`} className="inline-flex gap-0.5">
      {stars.map((star) => (
        <StarShape key={star} fill={starFill(rating, star)} className={className} />
      ))}
    </span>
  )
}

type StarRatingInputProps = { value: number; onChange: (value: number) => void; disabled?: boolean }

// Nota de 0 a 5 em meias estrelas: 1º clique na estrela marca inteira, 2º meia, 3º tira.
export function StarRatingInput({ value, onChange, disabled }: StarRatingInputProps) {
  const statusId = useId()
  return (
    <div className="flex flex-col gap-1.5">
      <div role="group" aria-label="Sua nota" aria-describedby={statusId} className="flex gap-1">
        {stars.map((star) => (
          <button
            key={star}
            type="button"
            disabled={disabled}
            aria-label={`Estrela ${star}`}
            onClick={() => onChange(nextRating(value, star))}
            className="inline-flex size-10 items-center justify-center rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-60"
          >
            <StarShape fill={starFill(value, star)} className="size-7" />
          </button>
        ))}
      </div>
      <p id={statusId} aria-live="polite" className="text-xs text-text-muted">
        Nota {formatRating(value)} de {MAX_STARS}. Clique de novo na estrela para meia estrela e mais uma vez para tirar.
      </p>
    </div>
  )
}
