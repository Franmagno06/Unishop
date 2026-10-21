import { useId, type ComponentProps, type ReactNode } from 'react'
import { FieldError } from './FieldError'

type CheckboxProps = Omit<ComponentProps<'input'>, 'type'> & {
  children: ReactNode
  error?: string
}

export function Checkbox({ children, error, className, ...props }: CheckboxProps) {
  const id = useId()
  const errorId = `${id}-error`

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-start gap-2.5">
        <input
          id={id}
          type="checkbox"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className={`mt-0.5 size-5 shrink-0 cursor-pointer rounded-[5px] accent-primary ${
            error ? 'outline-2 outline-offset-1 outline-danger' : ''
          } ${className ?? ''}`}
          {...props}
        />
        <label htmlFor={id} className="cursor-pointer text-[13px] leading-snug text-text">
          {children}
        </label>
      </div>
      {error ? <FieldError id={errorId}>{error}</FieldError> : null}
    </div>
  )
}
