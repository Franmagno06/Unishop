import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { BackLink } from '../../../../shared/components/ui/BackLink'
import { ButtonLink } from '../../../../shared/components/ui/Button'
import { EmptyState } from '../../../../shared/components/ui/EmptyState'
import { Skeleton } from '../../../../shared/components/ui/Skeleton'
import { ROUTES } from '../../../../shared/constants/routes'
import { useDocumentTitle } from '../../../../shared/hooks/use-document-title'
import { useSession } from '../../../../shared/hooks/use-session'
import { ListingForm } from '../components/ListingForm'
import { PublishedListingDialog } from '../components/PublishedListingDialog'
import { getProfileWhatsapp } from '../services/listings.service'
import type { CreatedListing } from '../types/listing.types'

// RF015 · RN-ANU-01. Tela "Anunciar item" (Figma 06) e o pop-up "Anúncio publicado!". Hoje grava
// em memória (modo de demonstração); sem guard de login até a API existir.
export function CreateListingPage() {
  useDocumentTitle('Anunciar item')
  const { role } = useSession()
  const profile = useQuery({ queryKey: ['profile-whatsapp'], queryFn: getProfileWhatsapp })
  const [published, setPublished] = useState<CreatedListing | null>(null)

  return (
    <section className="mx-auto flex max-w-[1440px] flex-col gap-6 px-4 pb-24 pt-8 sm:px-5 md:px-12 lg:px-[100px] lg:pt-12">
      <BackLink fallbackTo={ROUTES.profile}>Voltar ao perfil</BackLink>
      <h1 className="font-display text-4xl font-bold text-navy lg:text-[40px]">Anunciar item</h1>

      {role === 'admin' ? (
        <EmptyState
          title="Administradores não anunciam"
          action={<ButtonLink to={ROUTES.adminUsers}>Painel</ButtonLink>}
        >
          A conta de administrador só modera o Unishop: não compra, não paga e não anuncia.
        </EmptyState>
      ) : profile.data === undefined ? (
        <div className="flex flex-col gap-6 lg:flex-row" aria-busy="true">
          <Skeleton className="h-[640px] flex-1 rounded-2xl" />
          <Skeleton className="h-80 rounded-2xl lg:w-[460px]" />
        </div>
      ) : (
        <ListingForm profileWhatsapp={profile.data} onPublished={setPublished} />
      )}

      <PublishedListingDialog listing={published} onClose={() => setPublished(null)} />
    </section>
  )
}
