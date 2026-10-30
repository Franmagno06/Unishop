import { randomUUID } from 'node:crypto'
import { mkdir, unlink, writeFile } from 'node:fs/promises'
import { dirname, resolve, sep } from 'node:path'
import { detectImageType } from '../../utils/image-type'
import type { StorageProvider } from './storage.provider'

// Driver local: grava em disco (pasta `uploads/`, fora do Git). Proibido em produção (api.md §6.4).
export function createLocalStorageProvider(config: {
  dir: string
  baseUrl: string
}): StorageProvider {
  const root = resolve(config.dir)

  // O publicId vem do banco, mas a conferência impede que um valor estranho apague arquivo fora da pasta.
  function pathOf(publicId: string) {
    const path = resolve(root, publicId)
    if (!path.startsWith(root + sep)) throw new Error('publicId fora da pasta de uploads.')
    return path
  }

  return {
    async upload({ buffer, folder }) {
      const type = await detectImageType(buffer)
      if (!type) throw new Error('Tipo de imagem não suportado.')
      const publicId = `${folder}/${randomUUID()}.${type.ext}`
      const path = pathOf(publicId)
      await mkdir(dirname(path), { recursive: true })
      await writeFile(path, buffer)
      return { publicId, url: `${config.baseUrl}/${publicId}` }
    },

    async remove(publicId) {
      try {
        await unlink(pathOf(publicId))
      } catch (err) {
        if ((err as { code?: string }).code !== 'ENOENT') throw err
      }
    },
  }
}
