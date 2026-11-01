// Anti-bot (Turnstile) entra depois do MVP (api.md, ADR-006). Até lá o driver é `noop`.
export interface AntiBotProvider {
  verify(token: string | undefined, remoteIp?: string): Promise<boolean>
}

export const noopAntiBot: AntiBotProvider = {
  async verify() {
    return true
  },
}
