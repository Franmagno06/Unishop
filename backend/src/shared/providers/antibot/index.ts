import { env } from '../../../config/env'
import { noopAntiBot, type AntiBotProvider } from './antibot.provider'

export type { AntiBotProvider } from './antibot.provider'

export function buildAntiBot(driver: string = env.ANTIBOT_DRIVER): AntiBotProvider {
  if (driver === 'noop') return noopAntiBot
  throw new Error(`ANTIBOT_DRIVER=${driver} ainda não foi implementado (depois do MVP).`)
}
