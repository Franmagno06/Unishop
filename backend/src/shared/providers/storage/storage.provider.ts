// Interface do armazenamento de imagens (api.md §6). Cloudinary entra na Etapa 10, sem mudar service
// nem controller; em desenvolvimento e teste vale o driver local.
export interface StorageProvider {
  upload(input: { buffer: Buffer; folder: string }): Promise<{ publicId: string; url: string }>
  /** Idempotente: remover o que já não existe não é erro. */
  remove(publicId: string): Promise<void>
}
