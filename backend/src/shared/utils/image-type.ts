// Tipo real da imagem pelo conteúdo (file-type), nunca pela extensão nem pelo Content-Type
// enviado pelo cliente (RN-ANU-03, backend.md §16). Só JPG e PNG são aceitos.
export type ImageType = { ext: 'jpg' | 'png'; mime: 'image/jpeg' | 'image/png' }

export async function detectImageType(buffer: Buffer): Promise<ImageType | null> {
  const { fileTypeFromBuffer } = await import('file-type') // pacote só ESM: import dinâmico
  const type = await fileTypeFromBuffer(buffer)
  if (type?.mime === 'image/jpeg') return { ext: 'jpg', mime: 'image/jpeg' }
  if (type?.mime === 'image/png') return { ext: 'png', mime: 'image/png' }
  return null
}
