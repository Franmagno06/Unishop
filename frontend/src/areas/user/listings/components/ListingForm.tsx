import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm } from 'react-hook-form'
import { useCategories } from '../../categories/hooks/use-categories'
import { ErrorAlert } from '../../../../shared/components/ui/Alert'
import { Button } from '../../../../shared/components/ui/Button'
import { Field } from '../../../../shared/components/ui/Field'
import { SelectField } from '../../../../shared/components/ui/SelectField'
import { TextAreaField } from '../../../../shared/components/ui/TextAreaField'
import { ApiError } from '../../../../shared/lib/api'
import { useCreateListing } from '../hooks/use-create-listing'
import { listingSchema, LISTING_LIMITS, type ListingFormValues } from '../schemas/listing.schemas'
import type { CreatedListing } from '../types/listing.types'
import { parsePriceToCents } from '../utils/price'
import { formatWhatsapp, onlyDigits } from '../utils/whatsapp'
import { ImageUploader } from './ImageUploader'

const cardClasses = 'flex flex-col gap-5 rounded-2xl border border-border bg-surface p-5 sm:p-8'

function submitErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.code === 'NETWORK_ERROR') return 'Sem conexão com o servidor. Confira sua internet e tente de novo.'
    if (error.status === 403) return 'Sua conta não pode publicar anúncios.'
    if (error.status === 400) return error.message
  }
  return 'Não foi possível publicar o anúncio agora. Tente de novo em instantes.'
}

type ListingFormProps = {
  // WhatsApp do perfil: o campo nasce preenchido com ele e pode ser editado (RN-ANU-01).
  profileWhatsapp: string
  onPublished: (listing: CreatedListing) => void
}

// RF015 · RN-ANU-01 a 03 e 12. Formulário de anúncio novo: valida no navegador para responder
// rápido; o backend valida de novo (Regras §9).
export function ListingForm({ profileWhatsapp, onPublished }: ListingFormProps) {
  const categories = useCategories('')
  const create = useCreateListing()

  const emptyValues: ListingFormValues = {
    title: '',
    categoryId: '',
    description: '',
    price: '',
    quantity: '1',
    whatsapp: formatWhatsapp(profileWhatsapp),
    images: [],
  }
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ListingFormValues>({
    resolver: zodResolver(listingSchema),
    defaultValues: emptyValues,
  })

  function onSubmit(values: ListingFormValues) {
    create.mutate(
      {
        title: values.title.trim(),
        categoryId: Number(values.categoryId),
        description: values.description.trim(),
        priceInCents: parsePriceToCents(values.price) ?? 0,
        quantity: Number(values.quantity),
        whatsapp: onlyDigits(values.whatsapp),
        images: values.images,
      },
      {
        onSuccess: (listing) => {
          reset({ ...emptyValues, whatsapp: values.whatsapp })
          onPublished(listing)
        },
      },
    )
  }

  return (
    <form
      noValidate
      onSubmit={(event) => void handleSubmit(onSubmit)(event)}
      className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-8"
    >
      <section aria-labelledby="item-data" className={`${cardClasses} min-w-0 flex-1`}>
        <h2 id="item-data" className="text-lg font-semibold text-navy">
          Dados do item
        </h2>
        <Field
          label="Nome do item *"
          placeholder="Ex: Cálculo I — Guidorizzi, vol. 1"
          autoComplete="off"
          maxLength={LISTING_LIMITS.titleMax + 20}
          error={errors.title?.message}
          {...register('title')}
        />
        <SelectField label="Categoria *" error={errors.categoryId?.message} {...register('categoryId')}>
          <option value="">
            {categories.isPending ? 'Carregando categorias…' : 'Selecione uma categoria'}
          </option>
          {categories.data?.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </SelectField>
        <TextAreaField
          label="Descrição *"
          placeholder="Estado de conservação, edição, detalhes importantes…"
          hint="Itens proibidos pelos Termos de uso (armas, drogas, produtos falsificados…) não podem ser anunciados."
          error={errors.description?.message}
          {...register('description')}
        />
        <div className="grid gap-5 sm:grid-cols-[1fr_9rem]">
          <Field
            label="Preço (R$) *"
            placeholder="R$ 0,00"
            inputMode="decimal"
            autoComplete="off"
            error={errors.price?.message}
            {...register('price')}
          />
          <Field
            label="Quantidade *"
            inputMode="numeric"
            autoComplete="off"
            error={errors.quantity?.message}
            {...register('quantity')}
          />
        </div>
        <Controller
          control={control}
          name="images"
          render={({ field }) => (
            <ImageUploader files={field.value} onChange={field.onChange} error={errors.images?.message} />
          )}
        />
      </section>

      <section aria-labelledby="contact" className={`${cardClasses} lg:w-[460px] lg:shrink-0`}>
        <h2 id="contact" className="text-lg font-semibold text-navy">
          Contato
        </h2>
        <p className="text-sm text-text-muted">
          Os compradores vão falar com você pelo WhatsApp para combinar pagamento e entrega.
        </p>
        <Controller
          control={control}
          name="whatsapp"
          render={({ field }) => (
            <Field
              label="WhatsApp *"
              type="tel"
              inputMode="tel"
              autoComplete="tel-national"
              placeholder="(85) 9 0000-0000"
              hint="Obrigatório. O número só aparece para alunos logados no Unishop."
              error={errors.whatsapp?.message}
              name={field.name}
              ref={field.ref}
              onBlur={field.onBlur}
              value={field.value}
              onChange={(event) => field.onChange(formatWhatsapp(event.target.value))}
            />
          )}
        />
        {create.isError ? <ErrorAlert>{submitErrorMessage(create.error)}</ErrorAlert> : null}
        <Button type="submit" fullWidth disabled={create.isPending}>
          {create.isPending ? 'Publicando…' : 'Publicar anúncio'}
        </Button>
        <p className="text-[13px] text-text-muted">* Campos obrigatórios</p>
      </section>
    </form>
  )
}
