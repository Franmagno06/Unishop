import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { ArrowLink } from '../../../../shared/components/ui/ArrowLink'
import { Avatar } from '../../../../shared/components/ui/Avatar'
import { Badge } from '../../../../shared/components/ui/Badge'
import { Button, ButtonLink } from '../../../../shared/components/ui/Button'
import { Card } from '../../../../shared/components/ui/Card'
import { EmptyState } from '../../../../shared/components/ui/EmptyState'
import { Skeleton } from '../../../../shared/components/ui/Skeleton'
import { adminPaths, ROUTES } from '../../../../shared/constants/routes'
import { useDocumentTitle } from '../../../../shared/hooks/use-document-title'
import { formatCurrency } from '../../../../shared/utils/format-currency'
import { formatDate } from '../../../../shared/utils/format-date'
import { formatWhatsapp } from '../../../../shared/utils/whatsapp'
import { AdminPageHeading } from '../../shared/components/AdminPageHeading'
import { ListingStatusBadge } from '../../shared/components/ListingStatusBadge'
import { DeleteProductModal } from '../components/DeleteProductModal'
import { ProductGallery } from '../components/ProductGallery'
import { useProductDetail } from '../hooks/use-admin-products'

const number = new Intl.NumberFormat('pt-BR')

// RF023 · RN-ADM-09 (Figma A04). Galeria, dados do anúncio, vendedor e indicadores; daqui o admin
// edita ou exclui o produto. Dados de exemplo; sem API até o backend existir.
export function AdminProductDetailPage() {
  const id = Number(useParams().id)
  const navigate = useNavigate()
  const detail = useProductDetail(id)
  const [deleting, setDeleting] = useState(false)
  useDocumentTitle(detail.data ? `${detail.data.title} · Admin` : 'Produto · Admin')

  const back = <ArrowLink to={ROUTES.adminProducts}>Voltar para produtos</ArrowLink>

  if (detail.isPending && detail.fetchStatus !== 'idle') {
    return (
      <>
        {back}
        <p role="status" className="sr-only">
          Carregando produto…
        </p>
        <div className="grid gap-5 lg:grid-cols-[1fr_1.4fr]">
          <Skeleton className="aspect-[4/3] rounded-2xl" />
          <Skeleton className="h-[420px] rounded-2xl" />
        </div>
      </>
    )
  }
  if (detail.isError) {
    return (
      <>
        {back}
        <div role="alert">
          <EmptyState
            title="Não foi possível carregar o produto"
            action={<Button onClick={() => void detail.refetch()}>Tentar de novo</Button>}
          >
            Confira sua conexão e tente de novo.
          </EmptyState>
        </div>
      </>
    )
  }
  if (!detail.data) {
    return (
      <>
        {back}
        <EmptyState
          title="Produto não encontrado"
          action={<ButtonLink to={ROUTES.adminProducts}>Ver produtos</ButtonLink>}
        >
          Ele pode ter sido excluído ou o endereço está errado.
        </EmptyState>
      </>
    )
  }

  const product = detail.data

  return (
    <>
      {back}
      <AdminPageHeading
        title="Detalhes do produto"
        actions={
          <>
            <Button variant="danger-outline" onClick={() => setDeleting(true)}>
              Excluir produto
            </Button>
            <ButtonLink to={adminPaths.productEdit(product.id)}>Editar produto</ButtonLink>
          </>
        }
      />

      <div className="grid items-start gap-5 lg:grid-cols-[1fr_1.45fr]">
        <ProductGallery images={product.images} title={product.title} />

        <Card className="flex flex-col gap-5 p-5 sm:p-7">
          <div className="flex flex-wrap gap-2">
            <ListingStatusBadge status={product.status} />
            <Badge tone="neutral">{product.categoryName}</Badge>
          </div>
          <h2 className="break-words font-display text-3xl font-bold text-navy">{product.title}</h2>
          <p className="font-display text-3xl font-bold text-navy">{formatCurrency(product.priceInCents)}</p>

          <div className="flex flex-col gap-1">
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">Descrição</h3>
            <p className="whitespace-pre-line break-words text-[15px] text-text">{product.description}</p>
          </div>

          <div className="flex flex-wrap items-center gap-4 border-t border-border pt-5">
            <Avatar name={product.seller.name} className="size-11 text-[15px]" />
            <div className="flex min-w-0 flex-1 flex-col leading-snug">
              <span className="font-semibold text-text">{product.seller.name}</span>
              <span className="break-all text-[13px] text-text-muted">
                {product.seller.email} · WhatsApp {formatWhatsapp(product.whatsapp)}
              </span>
            </div>
            <Link
              to={adminPaths.userDetail(product.seller.id)}
              className="rounded text-[13px] font-semibold text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              Ver usuário →
            </Link>
          </div>

          <dl className="grid gap-3 sm:grid-cols-3">
            {[
              { label: 'Visualizações', value: number.format(product.views) },
              { label: 'Contatos', value: number.format(product.whatsappContacts) },
              { label: 'Publicado em', value: formatDate(product.publishedAt) },
            ].map((item) => (
              <div key={item.label} className="rounded-xl bg-background px-4 py-3">
                <dd className="text-lg font-bold text-navy">{item.value}</dd>
                <dt className="text-xs text-text-muted">{item.label}</dt>
              </div>
            ))}
          </dl>
        </Card>
      </div>

      {deleting ? (
        <DeleteProductModal
          product={product}
          onClose={() => setDeleting(false)}
          onDeleted={() => void navigate(ROUTES.adminProducts, { replace: true })}
        />
      ) : null}
    </>
  )
}
