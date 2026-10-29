export type ErrorDetail = { field?: string; message: string }

// Erro previsto da API: o errorHandler transforma em { error: { code, message, details, requestId } }.
// Os códigos seguem o backend.md §15.
export class AppError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: ErrorDetail[],
    readonly extra?: Record<string, unknown>,
  ) {
    super(message)
    this.name = 'AppError'
  }
}

export const unauthenticated = (message = 'Faça login para continuar.') =>
  new AppError(401, 'UNAUTHENTICATED', message)
export const forbidden = (message = 'Você não tem permissão para isso.') =>
  new AppError(403, 'FORBIDDEN', message)
export const notFound = (message = 'Recurso não encontrado.') =>
  new AppError(404, 'NOT_FOUND', message)
