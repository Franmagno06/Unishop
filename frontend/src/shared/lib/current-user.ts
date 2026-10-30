import { api } from './api'
import { MOCK_MODE } from './mock-mode'
import { getToken, hasToken, subscribe as subscribeSession } from './session'

// Dados do aluno logado, vindos de GET /users/me (backend.md §9, RF012.1). Em modo de demonstração
// (MOCK_MODE) valem os dados de exemplo. O WhatsApp é guardado só com dígitos (RN-PER-07).
export type CurrentUser = {
  name: string
  email: string
  course: string
  whatsapp: string
  avatarUrl: string | null
}

// 'loading' vale também antes do login: os dados só são buscados quando há token.
export type CurrentUserStatus = 'loading' | 'loaded' | 'error'

// Forma de GET /users/me e PATCH /users/me.
export type ProfileApiUser = {
  id: number
  name: string
  email: string
  course: string | null
  whatsapp: string | null
  avatarUrl: string | null
  role: 'student' | 'admin'
  pendingEmail: string | null
}

const demoUser: CurrentUser = {
  name: 'Aluno Teste',
  email: 'aluno.teste@edu.unifor.br',
  course: 'Ciência da Computação',
  whatsapp: '85991234567',
  avatarUrl: null,
}

const emptyUser: CurrentUser = {
  name: '',
  email: '',
  course: '',
  whatsapp: '',
  avatarUrl: null,
}

type State = { user: CurrentUser; status: CurrentUserStatus }

function initialState(): State {
  return MOCK_MODE ? { user: demoUser, status: 'loaded' } : { user: emptyUser, status: 'loading' }
}

export function fromApi(user: ProfileApiUser): CurrentUser {
  return {
    name: user.name,
    email: user.email,
    course: user.course ?? '',
    whatsapp: user.whatsapp ?? '',
    avatarUrl: user.avatarUrl,
  }
}

let state: State = initialState()
let inflight: Promise<void> | null = null
const listeners = new Set<() => void>()

function setState(next: State): void {
  state = next
  listeners.forEach((listener) => listener())
}

export function getCurrentUser(): CurrentUser {
  return state.user
}

export function getCurrentUserStatus(): CurrentUserStatus {
  return state.status
}

export function updateCurrentUser(changes: Partial<CurrentUser>): void {
  setState({ ...state, user: { ...state.user, ...changes } })
}

export function setCurrentUser(user: CurrentUser): void {
  setState({ user, status: 'loaded' })
}

export function resetCurrentUser(): void {
  inflight = null
  setState(initialState())
}

export function subscribeCurrentUser(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

// Busca o perfil do servidor. Sem token (ou em demonstração) não faz nada; se o login mudar no meio
// do caminho, a resposta antiga é descartada.
export function loadCurrentUser(): Promise<void> {
  if (MOCK_MODE || !hasToken()) return Promise.resolve()
  if (inflight) return inflight

  const forToken = getToken()
  const request = api<{ data: { user: ProfileApiUser } }>('/users/me')
    .then((response) => {
      if (getToken() === forToken) setCurrentUser(fromApi(response.data.user))
    })
    .catch(() => {
      if (getToken() === forToken) setState({ ...state, status: 'error' })
    })
    .finally(() => {
      if (inflight === request) inflight = null
    })
  inflight = request
  return request
}

export function reloadCurrentUser(): Promise<void> {
  setState({ ...state, status: 'loading' })
  return loadCurrentUser()
}

// Login, logout ou troca de senha mudam o token: os dados do usuário anterior nunca podem aparecer
// para o próximo (o "Sair" limpa o cache do TanStack Query, mas este armazenamento é separado).
let lastToken = getToken()
subscribeSession(() => {
  const token = getToken()
  if (token === lastToken) return
  lastToken = token
  resetCurrentUser()
})
