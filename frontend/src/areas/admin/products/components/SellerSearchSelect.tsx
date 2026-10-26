import { useId, useState, type KeyboardEvent } from 'react'
import { FieldError } from '../../../../shared/components/ui/FieldError'
import { inputClasses } from '../../../../shared/components/ui/field-styles'
import { useDebounce } from '../../../../shared/hooks/use-debounce'
import { useSellerSearch } from '../hooks/use-admin-products'
import type { SellerOption } from '../types/product.types'

type SellerSearchSelectProps = {
  label: string
  value: SellerOption | null
  onChange: (seller: SellerOption) => void
  error?: string
}

const optionText = (seller: SellerOption) => `${seller.name} — ${seller.email}`

// "Vendedor responsável" (Figma A05 · RN-ADM-08): campo de busca com lista (padrão combobox de
// ARIA). Digite parte do nome ou do e-mail, escolha com o mouse ou com as setas e Enter. Sair do
// campo sem escolher volta ao vendedor atual.
export function SellerSearchSelect({ label, value, onChange, error }: SellerSearchSelectProps) {
  const id = useId()
  const listId = `${id}-list`
  const errorId = `${id}-error`
  const [text, setText] = useState(value ? optionText(value) : '')
  const [typed, setTyped] = useState(false) // só filtra depois que a pessoa digita
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)

  const query = useDebounce(typed ? text.trim() : '', 250)
  const results = useSellerSearch(query)
  const options = results.data ?? []

  function close() {
    setOpen(false)
    setActive(-1)
    setTyped(false)
    setText(value ? optionText(value) : '')
  }

  function choose(seller: SellerOption) {
    onChange(seller)
    setText(optionText(seller))
    setTyped(false)
    setOpen(false)
    setActive(-1)
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setOpen(true)
      setActive((current) => Math.min(current + 1, options.length - 1))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActive((current) => Math.max(current - 1, 0))
    } else if (event.key === 'Enter' && open && options[active]) {
      event.preventDefault() // não envia o formulário
      choose(options[active])
    } else if (event.key === 'Escape' && open) {
      event.stopPropagation()
      close()
    }
  }

  return (
    <div className="relative flex flex-col gap-2">
      <label htmlFor={id} className="text-sm font-semibold text-text">
        {label}
      </label>
      <input
        id={id}
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={open && active >= 0 ? `${id}-option-${active}` : undefined}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        autoComplete="off"
        spellCheck={false}
        placeholder="Buscar por nome ou e-mail…"
        className={inputClasses(Boolean(error))}
        value={text}
        onFocus={() => setOpen(true)}
        onBlur={close}
        onChange={(event) => {
          setText(event.target.value)
          setTyped(true)
          setOpen(true)
          setActive(-1)
        }}
        onKeyDown={onKeyDown}
      />
      {open ? (
        <ul
          id={listId}
          role="listbox"
          aria-label={`${label}: resultados`}
          className="absolute left-0 right-0 top-full z-10 mt-1 max-h-64 overflow-y-auto rounded-xl border border-border bg-surface p-1.5 shadow-lg"
        >
          {options.map((seller, index) => (
            <li
              key={seller.id}
              id={`${id}-option-${index}`}
              role="option"
              aria-selected={seller.id === value?.id}
              // mousedown (e não click): o campo ainda não perdeu o foco, então o onBlur não fecha antes.
              onMouseDown={(event) => {
                event.preventDefault()
                choose(seller)
              }}
              className={`cursor-pointer rounded-lg px-3 py-2.5 text-sm ${
                index === active ? 'bg-primary-soft text-navy' : 'text-text hover:bg-background'
              } ${seller.id === value?.id ? 'font-semibold' : ''}`}
            >
              {optionText(seller)}
            </li>
          ))}
          {results.isPending ? (
            <li role="presentation" className="px-3 py-2.5 text-sm text-text-muted">
              Buscando…
            </li>
          ) : options.length === 0 ? (
            <li role="presentation" className="px-3 py-2.5 text-sm text-text-muted">
              Nenhum vendedor encontrado.
            </li>
          ) : null}
        </ul>
      ) : null}
      <p role="status" className="sr-only">
        {open && results.data ? `${options.length} vendedores encontrados` : ''}
      </p>
      {error ? <FieldError id={errorId}>{error}</FieldError> : null}
    </div>
  )
}
