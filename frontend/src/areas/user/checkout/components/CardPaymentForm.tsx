import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { ErrorAlert } from '../../../../shared/components/ui/Alert'
import { Field } from '../../../../shared/components/ui/Field'
import { LockIcon } from '../../../../shared/components/ui/icons'
import { SelectField } from '../../../../shared/components/ui/SelectField'
import { formatCurrency } from '../../../../shared/utils/format-currency'
import { cardSchema, type CardFormValues } from '../schemas/card.schema'
import { formatCardNumber, formatExpiry } from '../utils/card'

type CardPaymentFormProps = {
  // O botão "Pagar" fica no resumo do pedido e envia este formulário pelo `id`.
  formId: string
  totalInCents: number
  onSubmit: (values: CardFormValues) => void
  // Mensagem de uma tentativa que falhou (cartão recusado, rede). A pessoa tenta de novo (RN-PAG-07).
  submitError: string | null
}

// RF010.2 · RN-PAG-02, 03 e 07 (Figma 09a). Os dados do cartão ficam só neste formulário: não vão
// para a URL, para o armazenamento do navegador nem para o cache do TanStack Query, e somem junto
// com a tela. Na API real, viram token no SDK do Mercado Pago antes de qualquer envio.
export function CardPaymentForm({ formId, totalInCents, onSubmit, submitError }: CardPaymentFormProps) {
  const {
    register,
    handleSubmit,
    setFocus,
    formState: { errors },
  } = useForm<CardFormValues>({
    resolver: zodResolver(cardSchema),
    defaultValues: { number: '', holder: '', expiry: '', cvv: '' },
  })

  // Recusado: leva o foco ao número do cartão para corrigir ou trocar de cartão.
  useEffect(() => {
    if (submitError) setFocus('number')
  }, [submitError, setFocus])

  return (
    <form id={formId} noValidate onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
      {submitError ? <ErrorAlert title="Não foi possível pagar">{submitError}</ErrorAlert> : null}

      <Field
        label="Número do cartão"
        inputMode="numeric"
        autoComplete="cc-number"
        placeholder="0000 0000 0000 0000"
        maxLength={23}
        error={errors.number?.message}
        {...register('number', {
          onChange: (event) => {
            event.target.value = formatCardNumber(event.target.value)
          },
        })}
      />
      <Field
        label="Nome impresso no cartão"
        autoComplete="cc-name"
        placeholder="Como está no cartão"
        error={errors.holder?.message}
        {...register('holder')}
      />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <Field
          label="Validade"
          inputMode="numeric"
          autoComplete="cc-exp"
          placeholder="MM/AA"
          maxLength={5}
          error={errors.expiry?.message}
          {...register('expiry', {
            onChange: (event) => {
              event.target.value = formatExpiry(event.target.value)
            },
          })}
        />
        <Field
          label="CVV"
          inputMode="numeric"
          autoComplete="cc-csc"
          placeholder="123"
          maxLength={4}
          error={errors.cvv?.message}
          {...register('cvv', {
            onChange: (event) => {
              event.target.value = event.target.value.replace(/\D/g, '')
            },
          })}
        />
        {/* Só à vista por enquanto: o parcelamento não está definido (decisão do gestor, 22/10). */}
        <div className="col-span-2 sm:col-span-1">
          <SelectField label="Parcelas" defaultValue="1">
            <option value="1">À vista · {formatCurrency(totalInCents)}</option>
          </SelectField>
        </div>
      </div>

      <p className="flex items-center gap-1.5 text-xs text-text-muted">
        <LockIcon className="size-3.5" />
        Pagamento processado por gateway seguro. O Unishop não armazena os dados do seu cartão.
      </p>
    </form>
  )
}
