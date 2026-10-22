// Preço digitado em reais ("45", "45,5", "1.234,56", "R$ 45,00") vira centavos inteiros
// (dinheiro nunca é decimal no código, CLAUDE.md). null = texto que não é um preço.
export function parsePriceToCents(text: string): number | null {
  const cleaned = text.replace(/^\s*R\$\s*/i, '').trim()
  if (!/^\d{1,3}(\.\d{3})*(,\d{1,2})?$|^\d+(,\d{1,2})?$/.test(cleaned)) return null
  const [reais = '0', cents = ''] = cleaned.replace(/\./g, '').split(',')
  return Number(reais) * 100 + Number(cents.padEnd(2, '0'))
}
