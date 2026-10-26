// Quem está logado no painel. Hoje é a conta de teste do modo de demonstração; vem de
// GET /auth/me quando a API existir (só este arquivo muda). O e-mail de teste só existe em
// desenvolvimento: o build de produção não leva a conta de teste (roteiro-telas.md §5.4).
export const ADMIN_PROFILE = {
  name: 'Administrador',
  initials: 'AD',
  email: import.meta.env.DEV ? 'administrador.teste@edu.unifor.br' : '',
}
