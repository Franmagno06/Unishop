import type { ListingDetail } from '../types/listing.types'

// "Ana Lima" -> "AL"; nome único -> uma letra.
function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  const first = parts[0]?.[0] ?? '?'
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : ''
  return `${first}${last}`.toUpperCase()
}

// Vendedor do anúncio (Figma 08a). O selo é "Aluno(a) verificado(a)": a API devolve o selo de aluno
// verificado e não o gênero (backend.md §9.4). O curso só aparece quando a pessoa informou.
export function SellerCard({ seller }: { seller: ListingDetail['seller'] }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3.5">
      <span
        aria-hidden="true"
        className="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-primary-soft text-sm font-bold text-navy"
      >
        {initialsOf(seller.name)}
      </span>
      <div className="flex min-w-0 flex-col gap-0.5">
        <p className="break-words text-[15px] font-semibold text-text">{seller.name}</p>
        <p className="break-words text-[13px] text-text-muted">
          Aluno(a) verificado(a){seller.course ? ` · ${seller.course}` : ''}
        </p>
      </div>
    </div>
  )
}
