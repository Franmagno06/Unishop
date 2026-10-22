// Máscaras e conferências do cartão. Tudo roda no navegador (RN-PAG-02 e 03).
const digitsOf = (text: string) => text.replace(/\D/g, '')

// "4111111111111111" → "4111 1111 1111 1111" (até 19 dígitos).
export function formatCardNumber(text: string): string {
  return (digitsOf(text).slice(0, 19).match(/.{1,4}/g) ?? []).join(' ')
}

// "1228" → "12/28". A barra só entra depois do 3º dígito, para dar para apagar com Backspace.
export function formatExpiry(text: string): string {
  const digits = digitsOf(text).slice(0, 4)
  return digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits
}

// Algoritmo de Luhn: pega erro de digitação no número do cartão.
export function isLuhnValid(text: string): boolean {
  const digits = digitsOf(text)
  let sum = 0
  let double = false
  for (let i = digits.length - 1; i >= 0; i--) {
    let digit = Number(digits[i])
    if (double) {
      digit *= 2
      if (digit > 9) digit -= 9
    }
    sum += digit
    double = !double
  }
  return digits.length > 0 && sum % 10 === 0
}

// Cartão vale até o último dia do mês de validade ("12/28" vale até 31/12/2028).
export function isExpiryInFuture(text: string, now: Date = new Date()): boolean {
  const match = /^(0[1-9]|1[0-2])\/(\d{2})$/.exec(text)
  if (!match) return false
  const year = 2000 + Number(match[2])
  const month = Number(match[1])
  return year > now.getFullYear() || (year === now.getFullYear() && month >= now.getMonth() + 1)
}

// "03:07" para o contador do Pix.
export function formatCountdown(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds))
  const minutes = String(Math.floor(safe / 60)).padStart(2, '0')
  const seconds = String(safe % 60).padStart(2, '0')
  return `${minutes}:${seconds}`
}
