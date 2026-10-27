import { Link } from 'react-router'
import { Skeleton } from '../../../../shared/components/ui/Skeleton'
import { adminPaths } from '../../../../shared/constants/routes'
import { formatCurrency } from '../../../../shared/utils/format-currency'
import { ListingStatusBadge } from '../../shared/components/ListingStatusBadge'
import { rowDanger, rowLink, tableCell, tableHead, tableRow } from '../../shared/components/table-styles'
import type { AdminProduct } from '../types/product.types'

type ProductsTableProps = {
  // undefined = carregando (esqueleto das linhas)
  products: AdminProduct[] | undefined
  onDelete: (product: AdminProduct) => void
}

// Tabela de produtos (Figma A03). "Ver" abre os detalhes; "Excluir" abre o pop-up de confirmação.
export function ProductsTable({ products, onDelete }: ProductsTableProps) {
  return (
    <div className="overflow-x-auto overscroll-x-contain">
      <table className="w-full min-w-[900px] border-collapse">
        <caption className="sr-only">Produtos anunciados</caption>
        <thead>
          <tr>
            <th scope="col" className={tableHead}>Produto</th>
            <th scope="col" className={tableHead}>Categoria</th>
            <th scope="col" className={tableHead}>Preço</th>
            <th scope="col" className={tableHead}>Vendedor</th>
            <th scope="col" className={tableHead}>Status</th>
            <th scope="col" className={tableHead}>Ações</th>
          </tr>
        </thead>
        <tbody>
          {products
            ? products.map((product) => (
                <tr key={product.id} className={tableRow}>
                  <td className={`${tableCell} max-w-[340px]`}>
                    {/* Imagem e nome abrem os detalhes do produto. */}
                    <Link
                      to={adminPaths.productDetail(product.id)}
                      aria-label={`Abrir ${product.title}`}
                      className="group flex items-center gap-4 rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                    >
                      <span
                        aria-hidden="true"
                        className="size-16 shrink-0 overflow-hidden rounded-lg bg-primary-soft"
                      >
                        {product.images[0]?.url ? (
                          <img src={product.images[0].url} alt="" className="size-full object-cover" />
                        ) : null}
                      </span>
                      <span className="flex min-w-0 flex-col leading-snug">
                        <span className="font-semibold text-text group-hover:text-primary group-hover:underline">
                          {product.title}
                        </span>
                        <span className="line-clamp-2 text-xs text-text-muted">{product.description}</span>
                      </span>
                    </Link>
                  </td>
                  <td className={tableCell}>{product.categoryName}</td>
                  <td className={`${tableCell} whitespace-nowrap font-semibold`}>
                    {formatCurrency(product.priceInCents)}
                  </td>
                  <td className={tableCell}>{product.seller.name}</td>
                  <td className={tableCell}>
                    <ListingStatusBadge status={product.status} />
                  </td>
                  <td className={tableCell}>
                    <div className="flex items-center gap-4">
                      <Link
                        to={adminPaths.productDetail(product.id)}
                        aria-label={`Ver ${product.title}`}
                        className={rowLink}
                      >
                        Ver
                      </Link>
                      <button
                        type="button"
                        aria-label={`Excluir ${product.title}`}
                        onClick={() => onDelete(product)}
                        className={rowDanger}
                      >
                        Excluir
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            : Array.from({ length: 6 }, (_, index) => (
                <tr key={index} className={tableRow} aria-hidden="true">
                  <td className={tableCell} colSpan={6}>
                    <Skeleton className="h-14" />
                  </td>
                </tr>
              ))}
        </tbody>
      </table>
    </div>
  )
}
