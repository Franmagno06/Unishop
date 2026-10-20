import type { ComponentProps } from 'react'
import { Link } from 'react-router'
import { buttonClasses, type ButtonVariant } from './button-styles'

type Extra = { variant?: ButtonVariant; fullWidth?: boolean }

export function Button({
  variant,
  fullWidth,
  className,
  type = 'button',
  ...props
}: ComponentProps<'button'> & Extra) {
  return (
    <button
      type={type}
      className={`${buttonClasses(variant, fullWidth)} ${className ?? ''}`}
      {...props}
    />
  )
}

export function ButtonLink({
  variant,
  fullWidth,
  className,
  ...props
}: ComponentProps<typeof Link> & Extra) {
  return <Link className={`${buttonClasses(variant, fullWidth)} ${className ?? ''}`} {...props} />
}
