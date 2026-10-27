import { Button, ButtonLink } from '../../../../shared/components/ui/Button'
import { CheckIcon } from '../../../../shared/components/ui/icons'
import { Modal } from '../../../../shared/components/ui/Modal'
import { ROUTES } from '../../../../shared/constants/routes'
import type { CreatedListing } from '../types/listing.types'

type PublishedListingDialogProps = {
  listing: CreatedListing | null
  onClose: () => void
}

// Pop-up "Anúncio publicado!" (Figma 06). "Ver meu anúncio" leva à lista da categoria, onde o
// anúncio novo aparece no topo (RN-ANU-07); a página do produto ainda não existe.
export function PublishedListingDialog({ listing, onClose }: PublishedListingDialogProps) {
  return (
    <Modal open={listing !== null} onClose={onClose} labelledBy="published-title">
      {listing ? (
        <div className="flex flex-col items-center gap-4 text-center">
          <span className="inline-flex size-16 items-center justify-center rounded-full bg-whatsapp text-surface transition-[scale,opacity] duration-300 ease-out-strong starting:scale-90 starting:opacity-0 motion-reduce:transition-opacity">
            <CheckIcon className="size-8" />
          </span>
          <h2 id="published-title" className="font-display text-3xl font-bold text-navy">
            Anúncio publicado!
          </h2>
          <p className="text-[15px] text-text-muted">
            “{listing.title}” já está visível para os alunos na categoria {listing.categoryName}.
          </p>
          <div className="flex w-full flex-col gap-2.5">
            <ButtonLink to={`${ROUTES.categories}/${listing.categoryId}`} fullWidth>
              Meu anúncio
            </ButtonLink>
            <Button variant="secondary" fullWidth onClick={onClose}>
              Fechar
            </Button>
          </div>
        </div>
      ) : null}
    </Modal>
  )
}
