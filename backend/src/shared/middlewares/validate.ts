import type { RequestHandler } from 'express'
import type { z } from 'zod'

// Valida e substitui o corpo pela versão já tratada (trim etc.). Falha vira 400 VALIDATION_ERROR.
export const validateBody =
  (schema: z.ZodType): RequestHandler =>
  (req, _res, next) => {
    const result = schema.safeParse(req.body ?? {})
    if (!result.success) return next(result.error)
    req.body = result.data
    next()
  }

// Valida a query string. Express 5 deixa `req.query` somente leitura, então o resultado tratado
// fica em `req.validatedQuery`.
export const validateQuery =
  (schema: z.ZodType): RequestHandler =>
  (req, _res, next) => {
    const result = schema.safeParse(req.query)
    if (!result.success) return next(result.error)
    req.validatedQuery = result.data
    next()
  }
