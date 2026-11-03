import { z } from 'zod'

// RN-AVA-03: nota de 0 a 5 em passos de 0,5. RN-AVA-04: comentário opcional de até 500 caracteres.
export const reviewBodySchema = z
  .object({
    rating: z
      .number()
      .min(0)
      .max(5)
      .refine((value) => Number.isInteger(value * 2), 'A nota vai de 0 a 5, em passos de 0,5.'),
    comment: z.string().trim().max(500).default(''),
  })
  .strict()

export const idParamSchema = z.object({ id: z.coerce.number().int().positive() })
