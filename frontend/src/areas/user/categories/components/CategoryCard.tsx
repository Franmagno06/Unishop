import { Link } from 'react-router'
import { cardClasses } from '../../../../shared/components/ui/card-styles'
import type { Category } from '../services/categories.service'
import { formatListingCount } from '../utils/format-listing-count'

// A imagem representativa de cada categoria ainda não está definida: bloco azul-claro, como no Figma.
export function CategoryCard({ category }: { category: Category }) {
  return (
    <Link
      to={`/categorias/${category.id}`}
      className={`${cardClasses} flex flex-col gap-3.5 p-5 transition-[scale,border-color,box-shadow] duration-150 ease-out-strong hover:border-primary/40 hover:shadow-sm active:scale-[0.99] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary`}
    >
      <div className="h-35 rounded-[10px] bg-primary-soft" aria-hidden="true" />
      <h2 className="break-words text-lg font-semibold text-navy">{category.name}</h2>
      <p className="text-sm text-text-muted">{formatListingCount(category.activeListingCount)}</p>
    </Link>
  )
}
