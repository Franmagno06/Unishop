import { useParams } from 'react-router'
import { ArrowLink } from '../../../../shared/components/ui/ArrowLink'
import { Button, ButtonLink } from '../../../../shared/components/ui/Button'
import { EmptyState } from '../../../../shared/components/ui/EmptyState'
import { Skeleton } from '../../../../shared/components/ui/Skeleton'
import { adminPaths, ROUTES } from '../../../../shared/constants/routes'
import { useDocumentTitle } from '../../../../shared/hooks/use-document-title'
import { AdminPageHeading } from '../../shared/components/AdminPageHeading'
import { ProductForm } from '../components/ProductForm'
import { useProductDetail } from '../hooks/use-admin-products'

// RF024 (Figma A05). Carrega o produto e mostra o formulário já preenchido.
export function AdminProductEditPage() {
  const id = Number(useParams().id)
  const detail = useProductDetail(id)
  useDocumentTitle('Editar produto · Admin')

  return (
    <>
      <ArrowLink to={Number.isInteger(id) ? adminPaths.productDetail(id) : ROUTES.adminProducts}>
        Voltar para o produto
      </ArrowLink>
      <AdminPageHeading title="Editar produto" />
      {detail.isPending && detail.fetchStatus !== 'idle' ? (
        <>
          <p role="status" className="sr-only">
            Carregando produto…
          </p>
          <div className="grid gap-5 lg:grid-cols-[1fr_440px]">
            <Skeleton className="h-[520px] rounded-2xl" />
            <Skeleton className="h-[420px] rounded-2xl" />
          </div>
        </>
      ) : detail.isError ? (
        <div role="alert">
          <EmptyState
            title="Não foi possível carregar o produto"
            action={<Button onClick={() => void detail.refetch()}>Tentar de novo</Button>}
          >
            Confira sua conexão e tente de novo.
          </EmptyState>
        </div>
      ) : detail.data ? (
        <ProductForm key={detail.data.id} product={detail.data} />
      ) : (
        <EmptyState
          title="Produto não encontrado"
          action={<ButtonLink to={ROUTES.adminProducts}>Ver produtos</ButtonLink>}
        >
          Ele pode ter sido excluído ou o endereço está errado.
        </EmptyState>
      )}
    </>
  )
}
