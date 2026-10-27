import { describe, expect, it } from 'vitest'
import { getInitials } from './initials'

describe('getInitials', () => {
  it('usa a primeira letra do primeiro e do último nome', () => {
    expect(getInitials('Aluno Teste')).toBe('AT')
  })

  it('nome único vira uma letra só', () => {
    expect(getInitials('Madonna')).toBe('M')
  })

  it('nome vazio ou só espaços vira "?"', () => {
    expect(getInitials('  ')).toBe('?')
  })

  it('não quebra o acento decomposto', () => {
    expect(getInitials('Ângela Souza')).toBe('ÂS')
  })

  it('não quebra o emoji ao meio', () => {
    const result = getInitials('😀Ana Lima')
    expect(result).toBe('😀L')
    expect(result).not.toContain('�')
  })

  it('põe em maiúsculas', () => {
    expect(getInitials('ana lima')).toBe('AL')
  })
})
