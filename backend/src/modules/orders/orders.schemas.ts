import { z } from 'zod'

const id = z.coerce.number().int().positive()

// Quantidade de 1 a 999 (RN-EST-01). Quem decide se cabe no estoque é o service (RN-EST-02).
export const newOrderBodySchema = z.object({
  listingId: id,
  quantity: z.number().int().min(1).max(999),
})

export const orderIdParamSchema = z.object({ id })

export const receivedQuerySchema = z.object({ listingId: id.optional() })
