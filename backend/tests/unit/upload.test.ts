import express from 'express'
import request from 'supertest'
import { describe, expect, it } from 'vitest'
import { errorHandler } from '../../src/shared/middlewares/error-handler'
import { uploadImage } from '../../src/shared/middlewares/upload'

const PNG = Buffer.from('89504e470d0a1a0a0000000d49484452', 'hex')

function build(required = true) {
  const app = express()
  app.post('/up', uploadImage({ required }), (req, res) => {
    res.json({
      size: req.file?.size ?? null,
      fields: req.body,
      name: req.file?.originalname ?? null,
    })
  })
  app.use(errorHandler)
  return app
}

describe('uploadImage (RN-ANU-03, backend.md §16)', () => {
  it('aceita PNG real e entrega o buffer e os campos de texto', async () => {
    const res = await request(build())
      .post('/up')
      .field('title', 'Livro')
      .attach('image', PNG, { filename: 'foto.png', contentType: 'image/png' })
    expect(res.status).toBe(200)
    expect(res.body.size).toBe(PNG.length)
    expect(res.body.fields).toEqual({ title: 'Livro' })
  })

  it('RN-ANU-03: arquivo de outro formato com nome .png dá 415 FILE_TYPE_NOT_ALLOWED', async () => {
    const res = await request(build())
      .post('/up')
      .attach('image', Buffer.from('%PDF-1.4 não sou imagem'), {
        filename: 'x.png',
        contentType: 'image/png',
      })
    expect(res.status).toBe(415)
    expect(res.body.error.code).toBe('FILE_TYPE_NOT_ALLOWED')
  })

  it('RN-ANU-03: imagem acima de 4 MB dá 413 FILE_TOO_LARGE', async () => {
    const big = Buffer.concat([PNG, Buffer.alloc(4 * 1024 * 1024)])
    const res = await request(build())
      .post('/up')
      .attach('image', big, { filename: 'grande.png', contentType: 'image/png' })
    expect(res.status).toBe(413)
    expect(res.body.error.code).toBe('FILE_TOO_LARGE')
  })

  it('RN-ANU-03: sem imagem dá 400 VALIDATION_ERROR quando é obrigatória', async () => {
    const res = await request(build()).post('/up').field('title', 'Livro')
    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('VALIDATION_ERROR')
  })

  it('sem imagem passa quando não é obrigatória', async () => {
    const res = await request(build(false)).post('/up').field('title', 'Livro')
    expect(res.status).toBe(200)
    expect(res.body.size).toBeNull()
  })

  it('recusa mais de um arquivo (uma imagem por requisição)', async () => {
    const res = await request(build())
      .post('/up')
      .attach('image', PNG, { filename: 'a.png', contentType: 'image/png' })
      .attach('image', PNG, { filename: 'b.png', contentType: 'image/png' })
    expect(res.status).toBe(400)
  })
})
