import { useId, type ComponentProps } from 'react'
import { inputClasses } from '../../../../shared/components/ui/field-styles'

// Busca por categoria (RN-CAT-03). O rótulo existe para leitores de tela; a dica visual é o placeholder.
export function CategorySearch(props: Omit<ComponentProps<'input'>, 'type' | 'id'>) {
  const id = useId()

  return (
    <div className="w-full md:w-[360px]">
      <label htmlFor={id} className="sr-only">
        Buscar item ou categoria
      </label>
      <input
        id={id}
        type="search"
        name="q"
        autoComplete="off"
        placeholder="Buscar item ou categoria…"
        className={inputClasses()}
        {...props}
      />
    </div>
  )
}
