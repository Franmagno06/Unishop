import type { ComponentProps } from 'react'
import { cardClasses } from './card-styles'

export function Card({ className, ...props }: ComponentProps<'div'>) {
  return <div className={`${cardClasses} ${className ?? ''}`} {...props} />
}
