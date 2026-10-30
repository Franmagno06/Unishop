// Dinheiro em centavos inteiros no código e numeric(10,2) no banco (CLAUDE.md, RN-ANU-02).
// A conversão usa o texto do número, nunca multiplicação em ponto flutuante.
type DecimalLike = string | number | { toString(): string }

export function decimalToCents(value: DecimalLike): number {
  const [whole = '0', fraction = ''] = (
    typeof value === 'number' ? value.toFixed(2) : String(value)
  )
    .trim()
    .split('.')
  return Number(whole) * 100 + Number(fraction.padEnd(2, '0').slice(0, 2))
}

export function centsToDecimal(cents: number): string {
  if (!Number.isInteger(cents) || cents < 0) throw new Error('Centavos devem ser um inteiro >= 0.')
  return `${Math.floor(cents / 100)}.${String(cents % 100).padStart(2, '0')}`
}
