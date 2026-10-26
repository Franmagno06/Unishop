import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { useNavigate } from 'react-router'
import { ErrorAlert } from '../../../../shared/components/ui/Alert'
import { Button, ButtonLink } from '../../../../shared/components/ui/Button'
import { Card } from '../../../../shared/components/ui/Card'
import { Field } from '../../../../shared/components/ui/Field'
import { SelectField } from '../../../../shared/components/ui/SelectField'
import { TextAreaField } from '../../../../shared/components/ui/TextAreaField'
import { adminPaths } from '../../../../shared/constants/routes'
import { ApiError } from '../../../../shared/lib/api'
import { parsePriceToCents } from '../../../../shared/utils/price'
import { formatWhatsapp, onlyDigits } from '../../../../shared/utils/whatsapp'
import { SavedChangesModal } from '../../shared/components/SavedChangesModal'
import { useAdminCategories, useUpdateProduct } from '../hooks/use-admin-products'
import { adminProductSchema, PRODUCT_LIMITS, type AdminProductFormValues } from '../schemas/product.schemas'
import type { AdminProduct } from '../types/product.types'
import { ProductImageEditor } from './ProductImageEditor'
import { SellerSearchSelect } from './SellerSearchSelect'

// 4500 vira "45,00" (o campo aceita "45", "45,5" e "R$ 45,00", como em Anunciar item).
const priceToField = (cents: number) => (cents / 100).toFixed(2).replace('.', ',')

function submitErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.code === 'NETWORK_ERROR') return 'Sem conexão com o servidor. Confira a internet e tente de novo.'
    if (error.status === 404) return 'Este produto não existe mais. Volte à lista e atualize a página.'
    if (error.status === 400) return error.message
  }
  return 'Não foi possível salvar agora. Tente de novo em instantes.'
}

const sectionTitle = 'text-lg font-semibold text-navy'

// RF024 · RN-ADM-08 (Figma A05). Edita os dados, o vendedor responsável, a imagem e o status
// (Ativo, Pausado, Vendido: só o admin reverte Vendido). Trocar o vendedor de um produto com pedido
// aberto é recusado pela API (HAS_OPEN_ORDERS). Depois de salvar abre o pop-up "Alterações salvas!".
export function ProductForm({ product }: { product: AdminProduct }) {
  const navigate = useNavigate()
  const categories = useAdminCategories()
  const save = useUpdateProduct(product.id)
  const [saved, setSaved] = useState(false)
  // undefined = imagem sem mudança; texto = prévia da imagem nova.
  const [image, setImage] = useState<string | undefined>(undefined)
  const [imageError, setImageError] = useState<string>()
  const shownImage = image ?? product.images[0]?.url ?? null

  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<AdminProductFormValues>({
    resolver: zodResolver(adminProductSchema),
    mode: 'onTouched',
    defaultValues: {
      title: product.title,
      categoryId: String(product.categoryId),
      price: priceToField(product.priceInCents),
      description: product.description,
      seller: { id: product.seller.id, name: product.seller.name, email: product.seller.email },
      whatsapp: formatWhatsapp(product.whatsapp),
      status: product.status,
    },
  })

  // Libera a prévia anterior da memória quando troca ou sai da tela.
  useEffect(() => {
    return () => {
      if (image) URL.revokeObjectURL(image)
    }
  }, [image])

  function onSubmit(values: AdminProductFormValues) {
    save.mutate(
      {
        title: values.title,
        categoryId: Number(values.categoryId),
        priceInCents: parsePriceToCents(values.price) ?? 0,
        description: values.description,
        sellerId: values.seller.id,
        whatsapp: onlyDigits(values.whatsapp),
        status: values.status,
        ...(image !== undefined ? { imageUrl: image } : {}),
      },
      {
        onSuccess: () => setSaved(true),
        onError: (error) => {
          if (error instanceof ApiError && error.code === 'HAS_OPEN_ORDERS') {
            setError('seller', {
              message: 'Este produto tem pedido aberto, então o vendedor não pode ser trocado agora.',
            })
          }
        },
      },
    )
  }

  const sellerBlocked = save.error instanceof ApiError && save.error.code === 'HAS_OPEN_ORDERS'

  return (
    <>
      <form
        noValidate
        onSubmit={(event) => void handleSubmit(onSubmit)(event)}
        className="grid items-start gap-5 lg:grid-cols-[1fr_440px]"
      >
        <Card className="flex flex-col gap-5 p-5 sm:p-7">
          <h2 className={sectionTitle}>Dados do produto</h2>
          {save.isError && !sellerBlocked ? (
            <ErrorAlert title="Não foi possível salvar">{submitErrorMessage(save.error)}</ErrorAlert>
          ) : null}
          <Field
            label="Nome do produto *"
            autoComplete="off"
            maxLength={PRODUCT_LIMITS.titleMax + 20}
            error={errors.title?.message}
            {...register('title')}
          />
          <div className="grid gap-5 sm:grid-cols-2">
            <SelectField label="Categoria *" error={errors.categoryId?.message} {...register('categoryId')}>
              {categories.data?.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
              {/* Enquanto a lista carrega, a categoria atual já aparece escolhida. */}
              {categories.data ? null : <option value={product.categoryId}>{product.categoryName}</option>}
            </SelectField>
            <Field
              label="Preço (R$) *"
              inputMode="decimal"
              autoComplete="off"
              placeholder="R$ 0,00"
              error={errors.price?.message}
              {...register('price')}
            />
          </div>
          <TextAreaField
            label="Descrição *"
            error={errors.description?.message}
            {...register('description')}
          />
          <div className="grid gap-5 sm:grid-cols-2">
            <Controller
              control={control}
              name="seller"
              render={({ field }) => (
                <SellerSearchSelect
                  label="Vendedor responsável *"
                  value={field.value}
                  onChange={field.onChange}
                  error={errors.seller?.message}
                />
              )}
            />
            <Field
              label="WhatsApp *"
              type="tel"
              inputMode="tel"
              autoComplete="off"
              placeholder="(85) 9 9123-4567"
              error={errors.whatsapp?.message}
              {...register('whatsapp')}
            />
          </div>
        </Card>

        <Card className="flex flex-col gap-5 p-5 sm:p-7">
          <h2 className={sectionTitle}>Imagem do produto</h2>
          <ProductImageEditor
            imageUrl={shownImage}
            error={imageError}
            onSelect={(file) => {
              setImageError(undefined)
              setImage(URL.createObjectURL(file))
            }}
            onError={setImageError}
          />
          <SelectField label="Status" {...register('status')}>
            <option value="active">Ativo</option>
            <option value="paused">Pausado</option>
            <option value="sold">Vendido</option>
          </SelectField>
          <div className="flex gap-3">
            <ButtonLink to={adminPaths.productDetail(product.id)} variant="secondary" className="flex-1">
              Cancelar
            </ButtonLink>
            <Button type="submit" className="flex-1" disabled={save.isPending}>
              {save.isPending ? 'Salvando…' : 'Salvar alterações'}
            </Button>
          </div>
        </Card>
      </form>

      {saved ? (
        <SavedChangesModal onClose={() => void navigate(adminPaths.productDetail(product.id), { replace: true })} />
      ) : null}
    </>
  )
}
