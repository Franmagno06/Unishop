import { Link } from 'react-router'
import { cardClasses } from '../../../../shared/components/ui/card-styles'
import { listingRoutes } from '../../../../shared/constants/routes'
import { formatCurrency } from '../../../../shared/utils/format-currency'
import type { MyListing } from '../types/my-listing.types'
import { ListingStatusBadge } from './ListingStatusBadge'

// Linha de "Meus anúncios" (Figma 05): imagem, título, preço · categoria e contato. Leva à tela
// de gerenciar. O selo só aparece quando o anúncio não está ativo.
export function MyListingRow({ listing }: { listing: MyListing }) {
  return (
    <Link
      to={listingRoutes.manage(listing.id)}
      className={`${cardClasses} flex items-center gap-4 rounded-xl p-4 transition-[scale,border-color,box-shadow] duration-150 ease-out-strong hover:border-primary/40 hover:shadow-sm active:scale-[0.99] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:gap-5`}
    >
      {listing.imageUrl ? (
        <img
          src={listing.imageUrl}
          alt=""
          loading="lazy"
          className="size-[88px] shrink-0 rounded-lg object-cover"
        />
      ) : (
        <div aria-hidden="true" className="size-[88px] shrink-0 rounded-lg bg-primary-soft" />
      )}
      <div className="flex min-w-0 flex-col items-start gap-1">
        {listing.status !== 'active' ? <ListingStatusBadge status={listing.status} /> : null}
        <h3 className="break-words text-[17px] font-semibold text-text">{listing.title}</h3>
        <p className="text-sm text-text-muted">
          {formatCurrency(listing.priceInCents)} · {listing.categoryName}
        </p>
        <p className="break-words text-sm text-text-muted">Contato: {listing.contactLabel}</p>
      </div>
    </Link>
  )
}
