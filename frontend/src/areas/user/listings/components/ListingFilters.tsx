import { useId } from 'react'
import type { ContactMode, ListingSort } from '../types/listing.types'
import { CONTACT_LABELS, SORT_LABELS } from '../utils/listing-params'

type Props = {
  contact: ContactMode | undefined
  sort: ListingSort
  onContactChange: (contact: ContactMode | undefined) => void
  onSortChange: (sort: ListingSort) => void
}

const chips: { value: ContactMode | undefined; label: string }[] = [
  { value: undefined, label: 'Todos' },
  { value: 'site', label: CONTACT_LABELS.site },
  { value: 'campus', label: CONTACT_LABELS.campus },
  { value: 'whatsapp', label: CONTACT_LABELS.whatsapp },
]

const chipBase =
  'cursor-pointer rounded-full border px-3.5 py-2 text-[13px] font-semibold transition-[scale,background-color,border-color,color] duration-150 ease-out-strong active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary'

// Chips de forma de contato (Figma) e "Ordenar por" (RN-ANU-06, que o Figma ainda não desenha).
// Os chips são botões que ligam e desligam (aria-pressed); só um fica ativo por vez.
export function ListingFilters({ contact, sort, onContactChange, onSortChange }: Props) {
  const selectId = useId()

  return (
    <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-center md:gap-4">
      <div role="group" aria-label="Filtrar por forma de contato" className="flex flex-wrap gap-2">
        {chips.map((chip) => {
          const active = contact === chip.value
          return (
            <button
              key={chip.label}
              type="button"
              aria-pressed={active}
              onClick={() => onContactChange(chip.value)}
              className={`${chipBase} ${
                active
                  ? 'border-navy bg-navy text-surface'
                  : 'border-border bg-surface text-navy hover:border-navy/40'
              }`}
            >
              {chip.label}
            </button>
          )
        })}
      </div>

      <div className="flex items-center gap-2">
        <label htmlFor={selectId} className="text-[13px] font-semibold text-text-muted">
          Ordenar por
        </label>
        {/* 16 px no celular evita o zoom automático do iOS ao focar o campo */}
        <select
          id={selectId}
          value={sort}
          onChange={(event) => onSortChange(event.target.value as ListingSort)}
          className="cursor-pointer rounded-full border border-border bg-surface px-3.5 py-2 text-base font-semibold text-navy transition-[border-color] duration-150 ease-out-strong hover:border-navy/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary md:text-[13px]"
        >
          {(Object.keys(SORT_LABELS) as ListingSort[]).map((value) => (
            <option key={value} value={value}>
              {SORT_LABELS[value]}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}
