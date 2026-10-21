// Contas de teste do modo de demonstração. Não são segredo: só existem com a API simulada.
export const TEST_ACCOUNTS = {
  student: { email: 'aluno.teste@edu.unifor.br', password: 'Senha1234', name: 'Aluno Teste' },
  admin: { email: 'admin.teste@unishop.local', password: 'Admin1234', name: 'Admin Teste' },
  suspendedEmail: 'suspenso@edu.unifor.br',
} as const
