// Google Identity Services (RN-ACE-14): o navegador recebe um ID token do Google e o envia ao
// backend, que confere assinatura, domínio e e-mail verificado. Nenhum segredo passa por aqui:
// o Client ID é público.
export type GoogleCredentialResponse = { credential: string }

export type GoogleIdentity = {
  initialize: (config: {
    client_id: string
    callback: (response: GoogleCredentialResponse) => void
  }) => void
  renderButton: (
    element: HTMLElement,
    options: {
      type: 'standard'
      theme: 'outline'
      size: 'large'
      text: 'continue_with'
      shape: 'rectangular'
      logo_alignment: 'left'
      width: number
      locale: 'pt-BR'
    },
  ) => void
}

declare global {
  interface Window {
    google?: { accounts?: { id?: GoogleIdentity } }
  }
}

const SCRIPT_SRC = 'https://accounts.google.com/gsi/client'
let loading: Promise<GoogleIdentity> | null = null

// Carrega o script uma única vez, mesmo com o botão montado em duas telas.
export function loadGoogleIdentity(): Promise<GoogleIdentity> {
  if (loading) return loading
  loading = new Promise<GoogleIdentity>((resolve, reject) => {
    const ready = () => window.google?.accounts?.id
    const fail = (message: string) => {
      loading = null // permite tentar de novo depois
      reject(new Error(message))
    }
    const existing = ready()
    if (existing) return resolve(existing)
    const script = document.createElement('script')
    script.src = SCRIPT_SRC
    script.async = true
    script.defer = true
    script.onload = () => {
      const google = ready()
      if (google) resolve(google)
      else fail('Google Identity indisponível')
    }
    script.onerror = () => fail('Não foi possível carregar o Google')
    document.head.appendChild(script)
  })
  return loading
}
