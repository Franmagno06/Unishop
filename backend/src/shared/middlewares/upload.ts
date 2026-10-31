import type { RequestHandler } from 'express'
import multer from 'multer'
import { IMAGE_LIMITS } from '../../config/constants'
import { AppError } from '../errors/app-error'
import { detectImageType } from '../utils/image-type'

// Uma imagem por requisição, em memória, até 4 MB (limite de 4,5 MB da Vercel; desvio do PDF
// confirmado em 16/10/2026). O tipo vem do conteúdo (RN-ANU-03); o nome enviado pelo cliente é
// descartado: o provider gera o nome do arquivo.
const parser = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: IMAGE_LIMITS.maxBytes, files: 1, fields: 20 },
}).single('image')

export function uploadImage({ required = true }: { required?: boolean } = {}): RequestHandler {
  return (req, res, next) => {
    parser(req, res, async (err?: unknown) => {
      try {
        if (err instanceof multer.MulterError) {
          if (err.code === 'LIMIT_FILE_SIZE') {
            throw new AppError(413, 'FILE_TOO_LARGE', 'A imagem pode ter no máximo 4 MB.')
          }
          throw new AppError(400, 'VALIDATION_ERROR', 'Envie uma única imagem no campo "image".')
        }
        if (err) throw err

        if (!req.file) {
          if (required) throw new AppError(400, 'VALIDATION_ERROR', 'Envie a imagem do anúncio.')
          return next()
        }
        if (!(await detectImageType(req.file.buffer))) {
          throw new AppError(415, 'FILE_TYPE_NOT_ALLOWED', 'Use uma imagem JPG ou PNG.')
        }
        next()
      } catch (e) {
        next(e)
      }
    })
  }
}
