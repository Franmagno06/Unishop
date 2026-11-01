// Remove segredos de objetos antes de logar (backend.md §16): senha, JWT, token de cartão,
// chaves e o WhatsApp completo nunca vão para o log.
const SENSITIVE_KEYS = /^(password|senha|token|authorization|cookie|secret|api_?key|access_?token|card_?token|cvv|whatsapp)$|(_|^)(secret|password|token)$/i

export const REDACTED = '[REDACTED]'

export function redact(value: unknown, depth = 0): unknown {
  if (value === null || typeof value !== 'object') return value
  if (depth > 6) return REDACTED
  if (Array.isArray(value)) return value.map((item) => redact(item, depth + 1))
  const out: Record<string, unknown> = {}
  for (const [key, item] of Object.entries(value)) {
    out[key] = SENSITIVE_KEYS.test(key) ? REDACTED : redact(item, depth + 1)
  }
  return out
}
