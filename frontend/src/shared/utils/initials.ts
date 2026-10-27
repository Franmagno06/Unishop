// Iniciais do avatar: primeira letra do primeiro e do último nome ("Aluno Teste" vira "AT").
// NFC junta o acento decomposto à letra e Array.from separa por caractere (emoji não é cortado ao meio).
export function getInitials(name: string): string {
  const words = name.normalize('NFC').trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return '?'
  const first = Array.from(words[0]!)[0]!
  const last = words.length > 1 ? Array.from(words[words.length - 1]!)[0]! : ''
  return `${first}${last}`.toLocaleUpperCase('pt-BR')
}
