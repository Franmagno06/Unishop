import { Link } from 'react-router'
import { cardClasses } from '../../../../shared/components/ui/card-styles'
import { formatCurrency } from '../../../../shared/utils/format-currency'
import type { ListingSummary } from '../types/listing.types'
import { ContactLine } from './ContactLine'

// Card de produto (Figma 8:135). Leva à página do produto. Sem foto ainda: bloco azul-claro.
// `content-visibility: auto` faz o navegador pular o desenho dos cards fora da tela (listas longas).
export function ListingCard({ listing }: { listing: ListingSummary }) {
  return (
    <Link
      to={`/produtos/${listing.id}`}
      className={`${cardClasses} flex flex-1 flex-col gap-2.5 rounded-[14px] px-4 pb-5 pt-4 transition-[transform,border-color,box-shadow] duration-150 ease-out-strong [contain-intrinsic-size:auto_315px] [content-visibility:auto] hover:border-primary/40 hover:shadow-sm active:scale-[0.99] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary`}
    >
      {listing.imageUrl ? (
        <img
          src={listing.imageUrl}
          alt=""
          width={258}
          height={180}
          loading="lazy"
          decoding="async"
          className="h-45 w-full rounded-[10px] object-cover"
        />
      ) : (
        <div className="h-45 rounded-[10px] bg-primary-soft" aria-hidden="true" />
      )}
      <h2 className="line-clamp-2 break-words text-base font-semibold text-navy">{listing.title}</h2>
      <p className="font-display text-[22px] font-bold text-navy">{formatCurrency(listing.priceInCents)}</p>
      <ContactLine contact={listing.contact} />
    </Link>
  )
}
