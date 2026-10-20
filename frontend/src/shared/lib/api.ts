import { clearToken, getToken } from './session'

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api/v1'

// Formato de erro do backend.md §9: { error: { code, message, details, retryAfter } }
export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly fieldErrors: { field: string; message: string }[]
  readonly retryAfter?: number

  constructor(
    status: number,
    code: string,
    message: string,
    fieldErrors: { field: string; message: string }[] = [],
    retryAfter?: number,
  ) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.fieldErrors = fieldErrors
    this.retryAfter = retryAfter
  }
}

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  body?: unknown
  signal?: AbortSignal
}

export async function api<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, signal } = options
  const token = getToken()

  let response: Response
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method,
      signal,
      headers: {
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error
    throw new ApiError(0, 'NETWORK_ERROR', 'Não foi possível falar com o servidor.')
  }

  if (response.ok) {
    return (response.status === 204 ? undefined : await response.json()) as T
  }

  // 413 da Vercel chega sem o corpo do Unishop (frontend.md §11)
  if (response.status === 413) {
    throw new ApiError(413, 'FILE_TOO_LARGE', 'O arquivo é grande demais.')
  }

  const payload = await response.json().catch(() => null)
  const error = payload?.error
  const apiError = new ApiError(
    response.status,
    error?.code ?? 'INTERNAL_ERROR',
    error?.message ?? 'Algo deu errado. Tente de novo.',
    error?.details ?? [],
    error?.retryAfter,
  )

  // Sessão vencida (RN-ACE-11): só quando havia token. No login, 401 é "credencial inválida".
  if (response.status === 401 && token) {
    clearToken()
    window.location.assign('/login')
  }

  throw apiError
}
