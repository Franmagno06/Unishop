import { describe, expect, it } from 'vitest'
import { pageFromScroll, scrollForPage } from './carousel-pages'

// Larguras de desktop (cartões de 240 px, folga de 16 px, 2 por página): página de 512 px.
const PAGE = 512

describe('pageFromScroll', () => {
  it('3 anúncios: a rolagem máxima (194 px) já é a última página, mesmo abaixo de meia página', () => {
    expect(pageFromScroll(0, PAGE, 194, 2)).toBe(0)
    expect(pageFromScroll(194, PAGE, 194, 2)).toBe(1)
  })

  it('5 anúncios: páginas 0, 1 e 2 (a última só no fim da rolagem)', () => {
    expect(pageFromScroll(0, PAGE, 706, 3)).toBe(0)
    expect(pageFromScroll(512, PAGE, 706, 3)).toBe(1)
    expect(pageFromScroll(706, PAGE, 706, 3)).toBe(2)
  })

  it('11 anúncios: o fim da rolagem (2242 px) é a página 5 de 6', () => {
    expect(pageFromScroll(2242, PAGE, 2242, 6)).toBe(5)
    expect(pageFromScroll(1536, PAGE, 2242, 6)).toBe(3)
  })

  it('sem rolagem possível (cabe tudo) fica na página 0; largura zero também', () => {
    expect(pageFromScroll(0, PAGE, 0, 1)).toBe(0)
    expect(pageFromScroll(300, 0, 500, 3)).toBe(0)
  })

  it('nunca passa de pageCount - 1', () => {
    expect(pageFromScroll(9999, PAGE, 100000, 3)).toBe(2)
  })
})

describe('scrollForPage', () => {
  it('leva ao início da página, limitado à rolagem máxima (3 anúncios: 194 px)', () => {
    expect(scrollForPage(0, PAGE, 194)).toBe(0)
    expect(scrollForPage(1, PAGE, 194)).toBe(194)
    expect(scrollForPage(1, PAGE, 706)).toBe(512)
    expect(scrollForPage(2, PAGE, 706)).toBe(706)
  })

  it('sem rolagem possível devolve 0', () => {
    expect(scrollForPage(1, PAGE, 0)).toBe(0)
  })
})
