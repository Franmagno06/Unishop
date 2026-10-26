import { pageItems } from './page-items'

// Paginação do Figma (A01 e A03): "‹ Anterior  1  2  3 …  Próxima ›", com o resumo à esquerda.
type PaginationProps = {
  page: number
  totalPages: number
  onChange: (page: number) => void
  // "Mostrando 7 de 1.412 usuários"
  summary: string
}

const buttonClass =
  'cursor-pointer rounded px-1.5 py-1 text-[13px] font-semibold text-navy transition-colors duration-150 hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:pointer-events-none disabled:opacity-40'

export function Pagination({ page, totalPages, onChange, summary }: PaginationProps) {
  return (
    <div className="flex flex-col gap-3 border-t border-border px-5 py-4 text-[13px] text-text-muted sm:flex-row sm:items-center sm:justify-between">
      <p>{summary}</p>
      {totalPages > 1 ? (
        <nav aria-label="Paginação" className="flex flex-wrap items-center gap-1">
          <button
            type="button"
            className={buttonClass}
            disabled={page <= 1}
            onClick={() => onChange(page - 1)}
          >
            ‹ Anterior
          </button>
          {pageItems(page, totalPages).map((item, index) =>
            item === 'gap' ? (
              <span key={`gap-${index}`} aria-hidden="true" className="px-1">
                …
              </span>
            ) : (
              <button
                key={item}
                type="button"
                aria-label={`Página ${item}`}
                aria-current={item === page ? 'page' : undefined}
                className={`${buttonClass} min-w-7 text-center aria-[current=page]:bg-primary-soft aria-[current=page]:text-navy`}
                onClick={() => onChange(item)}
              >
                {item}
              </button>
            ),
          )}
          <button
            type="button"
            className={buttonClass}
            disabled={page >= totalPages}
            onClick={() => onChange(page + 1)}
          >
            Próxima ›
          </button>
        </nav>
      ) : null}
    </div>
  )
}
