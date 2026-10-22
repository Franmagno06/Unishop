import { describe, expect, it } from 'vitest'
import { parseCategoryId, parseContact, parseSort, sortToParam } from './listing-params'

describe('parseCategoryId', () => {
  it.each([
    ['1', 1],
    ['6', 6],
    ['123456789', 123456789],
  ])('"%s" é a categoria %i', (raw, expected) => {
    expect(parseCategoryId(raw)).toBe(expected)
  })

  it.each([undefined, '', '0', '-1', '1.5', 'abc', '1abc', ' 1', '01', '1234567890', '1e3'])(
    '%j não é uma categoria',
    (raw) => {
      expect(parseCategoryId(raw)).toBeNull()
    },
  )
})

describe('parseContact', () => {
  it('aceita só as três formas de contato', () => {
    expect(parseContact('site')).toBe('site')
    expect(parseContact('campus')).toBe('campus')
    expect(parseContact('whatsapp')).toBe('whatsapp')
  })

  it.each([null, '', 'todos', 'SITE', 'telefone'])('%j vira "todos" (sem filtro)', (raw) => {
    expect(parseContact(raw)).toBeUndefined()
  })
})

describe('parseSort e sortToParam', () => {
  it('o padrão é "mais recentes" e não aparece na URL', () => {
    expect(parseSort(null)).toBe('recent')
    expect(sortToParam('recent')).toBeNull()
  })

  it('ida e volta entre o valor da URL e a ordem', () => {
    expect(parseSort('menor-preco')).toBe('price_asc')
    expect(parseSort('maior-preco')).toBe('price_desc')
    expect(sortToParam('price_asc')).toBe('menor-preco')
    expect(sortToParam('price_desc')).toBe('maior-preco')
  })

  it.each(['', 'recent', 'price_asc', 'MENOR-PRECO', 'preco'])('valor inválido %j volta ao padrão', (raw) => {
    expect(parseSort(raw)).toBe('recent')
  })
})
