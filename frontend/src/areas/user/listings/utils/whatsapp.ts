// WhatsApp com DDD: 10 ou 11 dígitos (RN-PER-07). Mostra "(85) 9 0000-0000" enquanto digita.
export function onlyDigits(text: string): string {
  return text.replace(/\D/g, '')
}

export function formatWhatsapp(text: string): string {
  const digits = onlyDigits(text).slice(0, 11)
  if (digits.length === 0) return ''
  if (digits.length <= 2) return `(${digits}`
  const area = digits.slice(0, 2)
  const rest = digits.slice(2)
  if (digits.length === 11) return `(${area}) ${rest[0]} ${rest.slice(1, 5)}-${rest.slice(5)}`
  return rest.length > 4 ? `(${area}) ${rest.slice(0, 4)}-${rest.slice(4)}` : `(${area}) ${rest}`
}
