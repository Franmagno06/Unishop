export const ROUTES = {
  home: '/',
  login: '/login',
  adminLogin: '/admin/login',
  register: '/cadastro',
  forgotPassword: '/recuperar-senha',
  forgotPasswordSent: '/recuperar-senha/enviado',
  resetPassword: '/redefinir-senha',
  passwordReset: '/senha-redefinida',
  terms: '/termos',
  privacy: '/privacidade',
  categories: '/categorias',
  profile: '/perfil',
  editProfile: '/perfil/editar',
  myOrders: '/meus-pedidos',
  createListing: '/anunciar',
  adminUsers: '/admin/usuarios',
} as const

// Rotas com parâmetro (anúncios do próprio aluno).
export const listingRoutes = {
  manage: (id: number) => `/anuncios/${id}/gerenciar`,
  edit: (id: number) => `/anuncios/${id}/editar`,
} as const
