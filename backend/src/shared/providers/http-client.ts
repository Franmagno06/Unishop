// Cliente HTTP único dos providers: timeout de 10 s e uma nova tentativa só em falha de rede
// ou 5xx, e apenas para chamadas idempotentes (api.md, resiliência).
export const DEFAULT_TIMEOUT_MS = 10_000

export type HttpOptions = RequestInit & { timeoutMs?: number; retries?: number }

export async function httpRequest(url: string, options: HttpOptions = {}): Promise<Response> {
  const { timeoutMs = DEFAULT_TIMEOUT_MS, retries = 0, ...init } = options
  let lastError: unknown
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const response = await fetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs) })
      if (response.status >= 500 && attempt < retries) continue
      return response
    } catch (error) {
      lastError = error
    }
  }
  throw lastError
}
