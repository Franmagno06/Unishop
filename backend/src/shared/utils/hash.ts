import bcrypt from 'bcrypt'
import { createHash, randomBytes } from 'node:crypto'
import { BCRYPT_COST } from '../../config/constants'

export const hashPassword = (plain: string) => bcrypt.hash(plain, BCRYPT_COST)
export const verifyPassword = (plain: string, hash: string) => bcrypt.compare(plain, hash)

// Hash fixo para comparar mesmo quando o e-mail não existe (tempo de resposta parecido).
export const DUMMY_HASH = bcrypt.hashSync('dummy-password', BCRYPT_COST)

// Token de link: o valor em claro vai por e-mail, só o hash SHA-256 vai ao banco (RN-ACE-10).
export const generateToken = () => randomBytes(32).toString('hex')
export const hashToken = (token: string) => createHash('sha256').update(token).digest('hex')
