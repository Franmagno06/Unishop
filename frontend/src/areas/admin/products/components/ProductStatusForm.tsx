import { useState } from 'react'
import { Link } from 'react-router'
import { ErrorAlert } from '../../../../shared/components/ui/Alert'
import { Badge } from '../../../../shared/components/ui/Badge'
import { Button, ButtonLink } from '../../../../shared/components/ui/Button'
import { Card } from '../../../../shared/components/ui/Card'
import { SelectField } from '../../../../shared/components/ui/SelectField'
import { adminPaths } from '../../../../shared/constants/routes'
import { ApiError } from '../../../../shared/lib/api'
import { formatCurrency } from '../../../../shared/utils/format-currency'
import type { ListingStatus } from '../../shared/types'
import { useUpdateProduct } from '../hooks/use-admin-products'
import type { AdminProduct } from '../types/product.types'

function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.code === 'NETWORK_ERROR') return 'Sem conexão com o servidor. Confira a internet e tente de novo.'
    if (error.status === 404) return 'Este produto não existe mais. Volte à lista e atualize a página.'
  }
  return 'Não foi possível salvar agora. Tente de novo em instantes.'
}

type ProductStatusFormProps = { product: AdminProduct; onSaved: () => void }

// RF024 (Figma A05, simplificado em 26/10/2026): os dados do anúncio aparecem só para consulta e o
// admin altera apenas o status, Ativo ou Pausado. Quem já está Vendido também pode voltar a
// Ativo ou Pausado: só o admin reverte (Regras §3).
export function ProductStatusForm({ product, onSaved }: ProductStatusFormProps) {
  const save = useUpdateProduct(product.id)
  const [status, setStatus] = useState<ListingStatus>(product.status)

  return (
    <div className="grid items-start gap-5 lg:grid-cols-[1fr_420px]">
      <Card className="flex flex-col gap-4 p-5 sm:p-7">
        <h2 className="text-lg font-semibold text-navy">Dados do produto</h2>
        <div className="flex flex-wrap gap-2">
          <Badge tone="neutral">{product.categoryName}</Badge>
        </div>
        <p className="break-words font-display text-2xl font-bold text-navy">{product.title}</p>
        <p className="font-display text-2xl font-bold text-navy">{formatCurrency(product.priceInCents)}</p>
        <p className="whitespace-pre-line break-words text-[15px] text-text">{product.description}</p>
        <p className="text-sm text-text-muted">
          Vendedor:{' '}
          <Link
            to={adminPaths.userDetail(product.seller.id)}
            className="rounded font-semibold text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            {product.seller.name}
          </Link>
        </p>
      </Card>

      <Card className="flex flex-col gap-5 p-5 sm:p-6">
        <h2 className="text-lg font-semibold text-navy">Status do anúncio</h2>
        <form
          noValidate
          onSubmit={(event) => {
            event.preventDefault()
            save.mutate({ status }, { onSuccess: onSaved })
          }}
          className="flex flex-col gap-4"
        >
          {save.isError ? <ErrorAlert title="Não foi possível salvar">{errorMessage(save.error)}</ErrorAlert> : null}
          <SelectField
            label="Status"
            value={status}
            onChange={(event) => setStatus(event.target.value as ListingStatus)}
          >
            <option value="active">Ativo</option>
            <option value="paused">Pausado</option>
            {product.status === 'sold' ? <option value="sold">Vendido</option> : null}
          </SelectField>
          <p className="-mt-2 text-[13px] text-text-muted">
            Anúncio pausado deixa de aparecer nas listas para os alunos, sem apagar nenhum dado.
          </p>
          <div className="flex gap-3">
            <ButtonLink to={adminPaths.productDetail(product.id)} variant="secondary" className="flex-1">
              Cancelar
            </ButtonLink>
            <Button type="submit" className="flex-1" disabled={save.isPending}>
              {save.isPending ? 'Salvando…' : 'Salvar'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
