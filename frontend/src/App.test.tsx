import { render, screen } from '@testing-library/react'
import { expect, it } from 'vitest'
import App from './App'

it('mostra o título do Unishop', () => {
  render(<App />)
  expect(screen.getByRole('heading', { name: 'Unishop' })).toBeInTheDocument()
})
