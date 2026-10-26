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
  products: '/produtos',
  payment: '/pagamento',
  orderConfirmed: '/pedido-confirmado',
  adminUsers: '/admin/usuarios',
  adminProducts: '/admin/produtos',
} as const

// Rotas com parâmetro (anúncios do próprio aluno).
export const listingRoutes = {
  manage: (id: number) => `/anuncios/${id}/gerenciar`,
  edit: (id: number) => `/anuncios/${id}/editar`,
} as const

// Rotas com parâmetro da área admin (frontend.md §7).
export const adminPaths = {
  userDetail: (id: number) => `/admin/usuarios/${id}`,
  userEdit: (id: number) => `/admin/usuarios/${id}/editar`,
  productDetail: (id: number) => `/admin/produtos/${id}`,
  productEdit: (id: number) => `/admin/produtos/${id}/editar`,
} as const
