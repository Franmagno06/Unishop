import { useState } from 'react'
import { useParams } from 'react-router'
import { ArrowLink } from '../../../../shared/components/ui/ArrowLink'
import { Button, ButtonLink } from '../../../../shared/components/ui/Button'
import { EmptyState } from '../../../../shared/components/ui/EmptyState'
import { Skeleton } from '../../../../shared/components/ui/Skeleton'
import { ROUTES } from '../../../../shared/constants/routes'
import { useDocumentTitle } from '../../../../shared/hooks/use-document-title'
import { useSession } from '../../../../shared/hooks/use-session'
import { formatCurrency } from '../../../../shared/utils/format-currency'
import { useCategory } from '../hooks/use-category'
import { useListing } from '../hooks/use-listing'
import { parseListingId } from '../utils/listing-params'
import { AdminOrderNotice, OrderPanel, OwnListingNotice } from '../components/OrderPanel'
import { ImageGallery } from '../components/ImageGallery'
import { OrderChoiceDialog } from '../components/OrderChoiceDialog'
import { SellerCard } from '../components/SellerCard'

const sectionClasses = 'mx-auto flex max-w-[1440px] flex-col gap-6 px-4 pb-24 pt-8 sm:px-5 md:px-12 lg:px-[100px] lg:pt-12'

function ProductSkeleton() {
  return (
    <div className="flex flex-col gap-8 lg:flex-row lg:gap-12" aria-busy="true">
      <Skeleton className="aspect-[620/460] w-full rounded-2xl lg:w-[620px] lg:shrink-0" />
      <div className="flex flex-1 flex-col gap-4">
        <Skeleton className="h-7 w-40 rounded-full" />
        <Skeleton className="h-10 w-full max-w-lg" />
        <Skeleton className="h-9 w-40" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-16 w-full rounded-xl" />
        <Skeleton className="h-48 w-full rounded-2xl" />
      </div>
    </div>
  )
}

// RF008 · RF009 · RN-ANU-03, 05 e 10. Página do produto (Figma 08a) com o pop-up "Fazer pedido"
// (08d). Hoje usa dados de exemplo; o pop-up ainda não leva ao pagamento nem ao WhatsApp.
export function ProductPage() {
  const { id } = useParams()
  const listingId = parseListingId(id)
  const { role } = useSession()
  const listing = useListing(listingId)
  const category = useCategory(listing.data?.categoryId ?? null)
  const [ordering, setOrdering] = useState(false)
  useDocumentTitle(listing.data?.title ?? 'Produto')

  const notFound = listingId === null || (listing.isSuccess && listing.data === null)
  const data = listing.data

  return (
    <section className={sectionClasses}>
      {data ? (
        <ArrowLink to={`${ROUTES.categories}/${data.categoryId}`}>{category.data?.name ?? 'Categoria'}</ArrowLink>
      ) : (
        <ArrowLink to={ROUTES.categories}>Categorias</ArrowLink>
      )}

      {notFound ? (
        <EmptyState
          title="Anúncio indisponível"
          action={<ButtonLink to={ROUTES.categories}>Ver categorias</ButtonLink>}
        >
          Este anúncio não existe mais, foi pausado ou o endereço está incorreto.
        </EmptyState>
      ) : listing.isError ? (
        <div role="alert">
          <EmptyState
            title="Não foi possível carregar o anúncio"
            action={<Button onClick={() => void listing.refetch()}>Tentar de novo</Button>}
          >
            Confira sua conexão e tente de novo.
          </EmptyState>
        </div>
      ) : !data ? (
        <>
          <p role="status" className="sr-only">
            Carregando anúncio…
          </p>
          <ProductSkeleton />
        </>
      ) : (
        <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:gap-12">
          <div className="min-w-0 lg:w-[620px] lg:shrink-0">
            <ImageGallery key={data.id} images={data.images} title={data.title} />
          </div>

          <div className="flex min-w-0 flex-1 flex-col gap-[18px]">
            {category.data ? (
              <span className="self-start rounded-full bg-primary-soft px-3 py-1.5 text-xs font-semibold uppercase text-navy">
                {category.data.name}
              </span>
            ) : null}
            <h1 className="break-words font-display text-3xl font-bold text-navy lg:text-4xl">{data.title}</h1>
            <p className="font-display text-[32px] font-bold text-navy">{formatCurrency(data.priceInCents)}</p>

            <div className="flex flex-col gap-1.5">
              <h2 className="text-[15px] font-semibold text-text">Descrição</h2>
              <p className="whitespace-pre-line break-words text-[15px] text-text-muted">{data.description}</p>
            </div>

            <SellerCard seller={data.seller} />

            {role === 'admin' ? (
              <AdminOrderNotice />
            ) : data.isOwn ? (
              <OwnListingNotice />
            ) : (
              <OrderPanel
                priceInCents={data.priceInCents}
                quantity={data.quantity}
                onOrder={() => setOrdering(true)}
              />
            )}
          </div>

          <OrderChoiceDialog open={ordering} listing={data} onClose={() => setOrdering(false)} />
        </div>
      )}
    </section>
  )
}
