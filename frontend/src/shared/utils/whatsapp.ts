// WhatsApp guardado só com dígitos, 10 ou 11 com DDD (RN-PER-07).
export function onlyDigits(value: string): string {
  return value.replace(/\D/g, '')
}

// 11 dígitos: "(85) 9 9123-4567"; 10 dígitos: "(85) 9123-4567". Outro tamanho volta como veio.
export function formatWhatsapp(digits: string): string {
  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits[2]} ${digits.slice(3, 7)}-${digits.slice(7)}`
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`
  }
  return digits
}

// Link do WhatsApp (RN-PED-09). Só se monta em telas logadas (RN-PER-04).
export function whatsappLink(digits: string): string {
  return `https://wa.me/55${digits}`
}
