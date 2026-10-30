import { mkdtemp, readFile, rm, stat } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createLocalStorageProvider } from '../../src/shared/providers/storage/local.provider'

// Cabeçalhos mínimos de PNG e JPEG: o provider descobre a extensão pelo conteúdo.
const PNG = Buffer.from('89504e470d0a1a0a0000000d49484452', 'hex')
const JPG = Buffer.from('ffd8ffe000104a46494600010100000100010000', 'hex')

let dir: string
beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'unishop-storage-'))
})
afterEach(() => rm(dir, { recursive: true, force: true }))

const exists = (path: string) =>
  stat(path).then(
    () => true,
    () => false,
  )

describe('local.provider (StorageProvider, api.md §6)', () => {
  it('RN-ANU-03: grava o arquivo com nome gerado e devolve publicId e URL', async () => {
    const storage = createLocalStorageProvider({ dir, baseUrl: 'http://localhost:3000/uploads' })
    const { publicId, url } = await storage.upload({ buffer: PNG, folder: 'listings/7' })

    expect(publicId).toMatch(/^listings\/7\/[0-9a-f-]{36}\.png$/)
    expect(url).toBe(`http://localhost:3000/uploads/${publicId}`)
    expect(await readFile(join(dir, publicId))).toEqual(PNG)
  })

  it('usa a extensão do conteúdo real (JPEG vira .jpg)', async () => {
    const storage = createLocalStorageProvider({ dir, baseUrl: 'http://x/uploads' })
    const { publicId } = await storage.upload({ buffer: JPG, folder: 'avatars' })
    expect(publicId).toMatch(/\.jpg$/)
  })

  it('remove o arquivo e ignora quem já não existe', async () => {
    const storage = createLocalStorageProvider({ dir, baseUrl: 'http://x/uploads' })
    const { publicId } = await storage.upload({ buffer: PNG, folder: 'listings/1' })

    await storage.remove(publicId)
    expect(await exists(join(dir, publicId))).toBe(false)
    await expect(storage.remove(publicId)).resolves.toBeUndefined()
  })

  it('recusa publicId que sai da pasta de uploads (path traversal)', async () => {
    const storage = createLocalStorageProvider({ dir, baseUrl: 'http://x/uploads' })
    await expect(storage.remove('../fora.txt')).rejects.toThrow()
  })
})
