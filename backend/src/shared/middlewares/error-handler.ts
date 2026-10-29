import type { ErrorRequestHandler, RequestHandler } from 'express'
import { z } from 'zod'
import { AppError, notFound } from '../errors/app-error'

export const notFoundHandler: RequestHandler = (_req, _res, next) => next(notFound())

function body(req: { requestId?: string }, code: string, message: string, details?: unknown) {
  return { error: { code, message, details: details ?? [], requestId: req.requestId } }
}

// Formato único de erro (backend.md §15). Nunca devolve stack trace nem mensagem do banco.
// O Express só reconhece handler de erro com 4 parâmetros.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  if (err instanceof AppError) {
    if (err.extra?.retryAfter !== undefined)
      res.setHeader('Retry-After', String(err.extra.retryAfter))
    res
      .status(err.status)
      .json({ error: { ...body(req, err.code, err.message, err.details).error, ...err.extra } })
    return
  }

  if (err instanceof z.ZodError) {
    const details = err.issues.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message,
    }))
    res.status(400).json(body(req, 'VALIDATION_ERROR', 'Dados inválidos.', details))
    return
  }

  // JSON malformado enviado ao express.json()
  if (err?.type === 'entity.parse.failed') {
    res.status(400).json(body(req, 'VALIDATION_ERROR', 'JSON inválido.'))
    return
  }

  console.error({ requestId: req.requestId, err: err instanceof Error ? err.message : 'erro' })
  res.status(500).json(body(req, 'INTERNAL_ERROR', 'Erro inesperado. Tente novamente.'))
}
