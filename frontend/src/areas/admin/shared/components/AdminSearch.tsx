import { useId, type ComponentProps } from 'react'
import { inputClasses } from '../../../../shared/components/ui/field-styles'

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
        className={inputClasses()}
        {...props}
      />
    </div>
  )
}
