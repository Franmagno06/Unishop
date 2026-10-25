import { useLocation } from 'react-router'
import { InfoAlert, SuccessAlert } from '../../../../shared/components/ui/Alert'
import { Avatar } from '../../../../shared/components/ui/Avatar'
import { Button, ButtonLink } from '../../../../shared/components/ui/Button'
import { Card } from '../../../../shared/components/ui/Card'
import { EmptyState } from '../../../../shared/components/ui/EmptyState'
import { Skeleton } from '../../../../shared/components/ui/Skeleton'
import { ROUTES } from '../../../../shared/constants/routes'
import { useCurrentUser } from '../../../../shared/hooks/use-current-user'
import { useDocumentTitle } from '../../../../shared/hooks/use-document-title'
import { MyListingRow } from '../../listings/components/MyListingRow'
import { useMyListings } from '../../listings/hooks/use-my-listings'
import type { ProfileNotice } from '../hooks/use-update-profile'

type PageState = (ProfileNotice & { listingDeleted?: boolean }) | null

// RF012 (Figma 05): cartão do aluno e "Meus anúncios". É o destino do menu do avatar ("Ver perfil")
// e do link "Meus anúncios" do cabeçalho. Dados de exemplo; sem guard até a API.
export function ProfilePage() {
  useDocumentTitle('Meu perfil')
  const user = useCurrentUser()
  const listings = useMyListings()
  const state = useLocation().state as PageState

  return (
    <section className="mx-auto flex max-w-[1440px] flex-col gap-6 px-4 pb-24 pt-8 sm:px-5 md:px-12 lg:px-[100px] lg:pt-14">
      {state?.saved ? (
        <SuccessAlert title="Perfil atualizado">Suas alterações foram salvas.</SuccessAlert>
      ) : null}
      {state?.pendingEmail ? (
        <InfoAlert title="Confirme o novo e-mail">
          Enviamos um link de confirmação para {state.pendingEmail}. Até confirmar, seu e-mail atual
          continua valendo.
        </InfoAlert>
      ) : null}
      {state?.listingDeleted ? (
        <SuccessAlert title="Anúncio excluído">O anúncio foi removido e não aparece mais para os alunos.</SuccessAlert>
      ) : null}

      <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
        <Card className="flex flex-col items-center gap-5 p-8 lg:w-[380px] lg:shrink-0">
          <Avatar name={user.name} imageUrl={user.avatarUrl} className="size-24 text-[32px]" />
          <h1 className="break-words text-center font-display text-[26px] font-bold text-navy">
            {user.name}
          </h1>
          <p className="break-all text-center text-[15px] text-text-muted">{user.email}</p>
          <hr className="w-full border-border" />
          <ButtonLink to={ROUTES.createListing} fullWidth>
            + Anunciar item
          </ButtonLink>
          <ButtonLink to={ROUTES.myOrders} variant="secondary" fullWidth>
            Meus pedidos
          </ButtonLink>
          <ButtonLink to={ROUTES.editProfile} variant="secondary" fullWidth>
            Editar perfil
          </ButtonLink>
        </Card>

        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <h2 className="font-display text-[28px] font-bold text-navy">Meus anúncios</h2>

          <p role="status" className="sr-only">
            {listings.isPending
              ? 'Carregando anúncios…'
              : listings.isSuccess
                ? `${listings.data.length} anúncios`
                : ''}
          </p>

          {listings.isPending ? (
            <div className="flex flex-col gap-3">
              <Skeleton className="h-[122px] rounded-xl" />
              <Skeleton className="h-[122px] rounded-xl" />
            </div>
          ) : listings.isError ? (
            <div role="alert">
              <EmptyState
                title="Não foi possível carregar seus anúncios"
                action={<Button onClick={() => void listings.refetch()}>Tentar de novo</Button>}
              >
                Confira sua conexão e tente de novo.
              </EmptyState>
            </div>
          ) : listings.data.length === 0 ? (
            <EmptyState
              title="Você ainda não anunciou nada"
              action={<ButtonLink to={ROUTES.createListing}>+ Anunciar item</ButtonLink>}
            >
              Seus anúncios aparecem aqui para você gerenciar.
            </EmptyState>
          ) : (
            <ul className="flex flex-col gap-3">
              {listings.data.map((listing) => (
                <li key={listing.id}>
                  <MyListingRow listing={listing} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  )
}
