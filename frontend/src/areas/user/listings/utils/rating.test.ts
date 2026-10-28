import { describe, expect, it } from 'vitest'
import { averageRating, formatRating, nextRating, starFill } from './rating'

describe('nextRating', () => {
  it('1º clique marca a estrela, 2º deixa meia, 3º tira', () => {
    const first = nextRating(0, 1)
    const second = nextRating(first, 1)
    const third = nextRating(second, 1)
    expect([first, second, third]).toEqual([1, 0.5, 0])
  })

  it('clicar numa estrela mais à frente marca até ela; na 3ª com nota 3 vai a 2,5 e depois a 2', () => {
    expect(nextRating(0, 3)).toBe(3)
    expect(nextRating(3, 3)).toBe(2.5)
    expect(nextRating(2.5, 3)).toBe(2)
    expect(nextRating(2, 5)).toBe(5)
  })
})

describe('starFill', () => {
  it('preenche inteira, meia ou vazia', () => {
    expect([1, 2, 3].map((star) => starFill(2.5, star))).toEqual([1, 1, 0.5])
    expect(starFill(0, 1)).toBe(0)
  })
})

describe('averageRating e formatRating', () => {
  it('calcula a média e formata com vírgula', () => {
    expect(averageRating([])).toBe(0)
    expect(averageRating([5, 4])).toBe(4.5)
    expect(formatRating(4)).toBe('4,0')
    expect(formatRating(4.5)).toBe('4,5')
  })
})
