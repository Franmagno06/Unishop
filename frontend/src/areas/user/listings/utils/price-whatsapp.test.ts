import { describe, expect, it } from 'vitest'
import { parsePriceToCents } from './price'
import { formatWhatsapp, onlyDigits } from './whatsapp'

describe('parsePriceToCents', () => {
  it.each([
    ['45', 4500],
    ['45,5', 4550],
    ['45,50', 4550],
    ['0,01', 1],
    ['1.234,56', 123456],
    ['99999,99', 9999999],
    ['R$ 45,00', 4500],
    ['  12,30 ', 1230],
  ])('"%s" vale %i centavos', (text, cents) => {
    expect(parsePriceToCents(text)).toBe(cents)
  })

  it.each(['', 'abc', '-5', '45,555', '45.5', '1,2,3', 'R$', '12,'])('%j não é um preço', (text) => {
    expect(parsePriceToCents(text)).toBeNull()
  })
})

describe('whatsapp', () => {
  it('onlyDigits tira tudo que não é número', () => {
    expect(onlyDigits('(85) 9 9999-0000')).toBe('85999990000')
  })

  it.each([
    ['', ''],
    ['8', '(8'],
    ['85', '(85'],
    ['859', '(85) 9'],
    ['8599999', '(85) 9999-9'],
    ['8599999000', '(85) 9999-9000'],
    ['85999990000', '(85) 9 9999-0000'],
    ['859999900001234', '(85) 9 9999-0000'],
    ['(85) 9 9999-0000', '(85) 9 9999-0000'],
  ])('formata %j como %j', (typed, shown) => {
    expect(formatWhatsapp(typed)).toBe(shown)
  })
})
