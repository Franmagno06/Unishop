import { v2 } from 'cloudinary'
import { detectImageType } from '../../utils/image-type'
import type { StorageProvider } from './storage.provider'

export type CloudinaryClient = {
  upload(
    buffer: Buffer,
    options: { folder: string; resource_type: 'image' },
  ): Promise<{ public_id: string; secure_url: string }>
  destroy(publicId: string): Promise<{ result: string }>
}

export function parseCloudinaryUrl(url: string) {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    throw new Error('CLOUDINARY_URL inválida.')
  }
  if (
    parsed.protocol !== 'cloudinary:' ||
    !parsed.username ||
    !parsed.password ||
    !parsed.hostname
  ) {
    throw new Error('CLOUDINARY_URL inválida.')
  }
  return {
    cloud_name: parsed.hostname,
    api_key: decodeURIComponent(parsed.username),
    api_secret: decodeURIComponent(parsed.password),
  }
}

// Cliente real, configurado a partir do CLOUDINARY_URL (lido à mão: o SDK só o lê ao ser importado).
export function createCloudinaryClient(url: string): CloudinaryClient {
  v2.config({ ...parseCloudinaryUrl(url), secure: true })
  return {
    upload: (buffer, options) =>
      new Promise((resolve, reject) => {
        const stream = v2.uploader.upload_stream({ ...options, timeout: 20_000 }, (err, result) =>
          err || !result ? reject(toError(err)) : resolve(result),
        )
        stream.end(buffer)
      }),
    destroy: (publicId) =>
      v2.uploader
        .destroy(publicId, { resource_type: 'image', invalidate: true })
        .catch((err: unknown) => Promise.reject(toError(err))),
  }
}

// O SDK rejeita com objeto simples { message, http_code }; vira Error para o log mostrar a causa.
export function toError(err: unknown): Error {
  if (err instanceof Error) return err
  const e = err as { message?: unknown; http_code?: unknown } | undefined
  const message = typeof e?.message === 'string' ? e.message : 'resposta inesperada'
  const code = typeof e?.http_code === 'number' ? ` (HTTP ${e.http_code})` : ''
  return new Error(`Cloudinary: ${message}${code}`)
}

// Imagens no Cloudinary, em pasta por ambiente (CLOUDINARY_UPLOAD_FOLDER). Só JPG e PNG, conferidos pelo conteúdo.
export function createCloudinaryStorageProvider(config: {
  rootFolder: string
  client: CloudinaryClient
}): StorageProvider {
  return {
    async upload({ buffer, folder }) {
      const type = await detectImageType(buffer)
      if (!type) throw new Error('Tipo de imagem não suportado.')
      const result = await config.client.upload(buffer, {
        folder: `${config.rootFolder}/${folder}`,
        resource_type: 'image',
      })
      return { publicId: result.public_id, url: result.secure_url }
    },

    async remove(publicId) {
      const { result } = await config.client.destroy(publicId)
      if (result !== 'ok' && result !== 'not found') throw new Error('Falha ao remover a imagem.')
    },
  }
}
