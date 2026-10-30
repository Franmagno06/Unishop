export type GoogleIdentity = {
  googleSub: string
  email: string
  emailVerified: boolean
  name: string
}

// Só o que está dentro do token verificado; nunca nome ou e-mail vindos do frontend.
export interface OAuthProvider {
  verifyIdToken(idToken: string): Promise<GoogleIdentity>
}
