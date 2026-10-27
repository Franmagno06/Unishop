import { useId, type ComponentProps } from 'react'
import { inputClasses } from '../../../../shared/components/ui/field-styles'
import { SEARCH_MAX_LENGTH } from '../../../../shared/constants/search'

// Busca da lista (Figma: campo largo com texto de apoio). O rótulo existe para leitores de tela.
export function AdminSearch({ label, ...props }: Omit<ComponentProps<'input'>, 'type' | 'id'> & { label: string }) {
  const id = useId()
  return (
    <div className="w-full md:w-[360px]">
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <input
        id={id}
        type="search"
        autoComplete="off"
        spellCheck={false}
        maxLength={SEARCH_MAX_LENGTH}
        className={inputClasses()}
        {...props}
      />
    </div>
  )
}
