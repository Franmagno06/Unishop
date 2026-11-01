// Escape para texto que vai dentro de HTML (e-mails). RN-NOT-01 a 03: nome, produto e título vêm do
// usuário e nunca entram no HTML sem passar por aqui.
const ENTITIES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (ch) => ENTITIES[ch]!)
}
