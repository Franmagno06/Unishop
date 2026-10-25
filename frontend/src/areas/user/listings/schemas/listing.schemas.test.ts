import { describe, expect, it } from 'vitest'
import { listingSchema, validateImageFile, type ListingFormValues } from './listing.schemas'

const image = () => new File(['x'], 'capa.png', { type: 'image/png' })

const valid: ListingFormValues = {
  title: 'Cálculo I',
  categoryId: '1',
  description: 'Livro em bom estado.',
  price: '45,00',
  quantity: '1',
  whatsapp: '(85) 9 9999-0000',
  images: [image()],
}

function messageFor(changes: Partial<ListingFormValues>, field: keyof ListingFormValues) {
  const result = listingSchema.safeParse({ ...valid, ...changes })
  if (result.success) return null
  return result.error.issues.find((issue) => issue.path[0] === field)?.message ?? null
}

describe('listingSchema · limites das Regras §9', () => {
  it('aceita um anúncio completo', () => {
    expect(listingSchema.safeParse(valid).success).toBe(true)
  })

  it('nome: de 3 a 150 caracteres, ignorando espaços nas pontas', () => {
    expect(messageFor({ title: '' }, 'title')).toBe('Informe o nome do item.')
    expect(messageFor({ title: ' ab ' }, 'title')).toMatch(/pelo menos 3/)
    expect(messageFor({ title: 'abc' }, 'title')).toBeNull()
    expect(messageFor({ title: 'a'.repeat(150) }, 'title')).toBeNull()
    expect(messageFor({ title: 'a'.repeat(151) }, 'title')).toMatch(/no máximo 150/)
  })

  it('categoria é obrigatória', () => {
    expect(messageFor({ categoryId: '' }, 'categoryId')).toBe('Escolha uma categoria.')
  })

  it('descrição: de 10 a 2.000 caracteres e sem HTML', () => {
    expect(messageFor({ description: '' }, 'description')).toBe('Informe a descrição.')
    expect(messageFor({ description: 'curta' }, 'description')).toMatch(/pelo menos 10/)
    expect(messageFor({ description: 'a'.repeat(10) }, 'description')).toBeNull()
    expect(messageFor({ description: 'a'.repeat(2000) }, 'description')).toBeNull()
    expect(messageFor({ description: 'a'.repeat(2001) }, 'description')).toMatch(/no máximo 2000/)
    expect(messageFor({ description: 'Veja <b>isto</b> agora' }, 'description')).toMatch(/sem códigos HTML/)
    expect(messageFor({ description: 'Preço < 50 e > 30 reais' }, 'description')).toBeNull()
  })

  it('preço: de R$ 0,01 a R$ 99.999,99', () => {
    expect(messageFor({ price: '' }, 'price')).toBe('Informe o preço.')
    expect(messageFor({ price: 'abc' }, 'price')).toMatch(/preço válido/)
    expect(messageFor({ price: '0' }, 'price')).toMatch(/maior que zero/)
    expect(messageFor({ price: '0,00' }, 'price')).toMatch(/maior que zero/)
    expect(messageFor({ price: '0,01' }, 'price')).toBeNull()
    expect(messageFor({ price: '99.999,99' }, 'price')).toBeNull()
    expect(messageFor({ price: '100000,00' }, 'price')).toMatch(/no máximo R\$ 99\.999,99/)
  })

  it('quantidade: inteiro de 1 a 999', () => {
    expect(messageFor({ quantity: '' }, 'quantity')).toBe('Informe a quantidade.')
    expect(messageFor({ quantity: '1,5' }, 'quantity')).toMatch(/inteiros/)
    expect(messageFor({ quantity: '0' }, 'quantity')).toMatch(/de 1 a 999/)
    expect(messageFor({ quantity: '1' }, 'quantity')).toBeNull()
    expect(messageFor({ quantity: '999' }, 'quantity')).toBeNull()
    expect(messageFor({ quantity: '1000' }, 'quantity')).toMatch(/de 1 a 999/)
  })

  it('WhatsApp: 10 ou 11 dígitos com DDD', () => {
    expect(messageFor({ whatsapp: '' }, 'whatsapp')).toBe('Informe o WhatsApp.')
    expect(messageFor({ whatsapp: '(85) 9999-000' }, 'whatsapp')).toMatch(/10 ou 11 dígitos/)
    expect(messageFor({ whatsapp: '(85) 9999-0000' }, 'whatsapp')).toBeNull()
    expect(messageFor({ whatsapp: '(85) 9 9999-0000' }, 'whatsapp')).toBeNull()
  })

  it('imagens: de 1 a 5', () => {
    expect(messageFor({ images: [] }, 'images')).toBe('Envie pelo menos 1 foto.')
    expect(messageFor({ images: Array.from({ length: 5 }, image) }, 'images')).toBeNull()
    expect(messageFor({ images: Array.from({ length: 6 }, image) }, 'images')).toMatch(/no máximo 5/)
  })
})

describe('validateImageFile · RN-ANU-03', () => {
  const file = (name: string, type: string, size = 10) => {
    const f = new File(['x'], name, { type })
    Object.defineProperty(f, 'size', { value: size })
    return f
  }

  it('aceita JPG e PNG de até 4 MB', () => {
    expect(validateImageFile(file('a.jpg', 'image/jpeg'))).toBeNull()
    expect(validateImageFile(file('a.png', 'image/png', 4 * 1024 * 1024))).toBeNull()
  })

  it('recusa outros tipos', () => {
    expect(validateImageFile(file('a.gif', 'image/gif'))).toMatch(/não é JPG nem PNG/)
    expect(validateImageFile(file('a.pdf', 'application/pdf'))).toMatch(/não é JPG nem PNG/)
  })

  it('recusa acima de 4 MB (1 byte a mais já recusa)', () => {
    expect(validateImageFile(file('grande.png', 'image/png', 4 * 1024 * 1024 + 1))).toMatch(/passa de 4 MB/)
  })
})
