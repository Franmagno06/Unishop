import { DAY, DEMO_NOW, MINUTE } from '../../shared/services/mock-utils'
import type { AdminUser } from '../types/user.types'

// Dados de exemplo da área admin (Figma A01 a A02b). Os 7 primeiros são os do Figma; os outros são
// gerados de forma fixa até fechar os 1.412 alunos da tela. Tudo fica em memória e some ao
// recarregar a página. Quando a API existir, só os arquivos de `services/` mudam.
export const TOTAL_USERS = 1412
const ONLINE_WINDOW_MS = 5 * MINUTE // "logado agora" = atividade nos últimos 5 minutos (RN-ADM-03)

const at = (ms: number) => new Date(ms).toISOString()
const online = (lastAccessAt: string) => Date.parse(lastAccessAt) >= DEMO_NOW - ONLINE_WINDOW_MS

type Seed = Pick<AdminUser, 'id' | 'name' | 'email' | 'course' | 'whatsapp' | 'createdAt'> & {
  minutesAgo: number
}

const FIGMA_USERS: Seed[] = [
  { id: 1, name: 'Francisco Magno', email: 'franmagno06@edu.unifor.br', course: 'Ciência da Computação', whatsapp: '85991110001', createdAt: '2026-08-12T12:00:00Z', minutesAgo: 1 },
  { id: 2, name: 'Ana Lima', email: 'ana.lima@edu.unifor.br', course: 'Engenharia Civil', whatsapp: '85991234567', createdAt: '2026-08-03T12:00:00Z', minutesAgo: 2 },
  { id: 3, name: 'Bruno Sales', email: 'bruno.sales@edu.unifor.br', course: 'Engenharia Elétrica', whatsapp: '85991110003', createdAt: '2026-08-21T12:00:00Z', minutesAgo: 3 },
  { id: 4, name: 'Carla Mendes', email: 'carla.mendes@edu.unifor.br', course: 'Medicina', whatsapp: '85991110004', createdAt: '2026-07-28T12:00:00Z', minutesAgo: 2 * 60 },
  { id: 5, name: 'João Pereira', email: 'joao.pereira@edu.unifor.br', course: 'Direito', whatsapp: '85988887777', createdAt: '2026-09-15T12:00:00Z', minutesAgo: 24 * 60 },
  { id: 6, name: 'Larissa Moura', email: 'larissa.moura@edu.unifor.br', course: 'Psicologia', whatsapp: '85977776666', createdAt: '2026-09-19T12:00:00Z', minutesAgo: 4 },
  { id: 7, name: 'Pedro Alves', email: 'pedro.alves@edu.unifor.br', course: 'Administração', whatsapp: '85991110007', createdAt: '2026-09-01T12:00:00Z', minutesAgo: 5 * 24 * 60 },
]

const FIRST_NAMES = ['Mariana', 'Lucas', 'Beatriz', 'Rafael', 'Camila', 'Gabriel', 'Juliana', 'Mateus', 'Isabela', 'Thiago', 'Letícia', 'Felipe', 'Natália', 'Diego', 'Vitória', 'André']
const LAST_NAMES = ['Souza', 'Oliveira', 'Costa', 'Ferreira', 'Rocha', 'Almeida', 'Barros', 'Cavalcante', 'Nogueira', 'Pinto', 'Teixeira', 'Araújo', 'Gomes', 'Ribeiro', 'Martins']
const COURSES = ['Ciência da Computação', 'Engenharia Civil', 'Direito', 'Medicina', 'Psicologia', 'Administração', 'Arquitetura', 'Odontologia', 'Nutrição', 'Design']

const slug = (text: string) =>
  text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()

function build(): AdminUser[] {
  const users: AdminUser[] = FIGMA_USERS.map(({ minutesAgo, ...seed }) => {
    const lastAccessAt = at(DEMO_NOW - minutesAgo * MINUTE)
    return { ...seed, avatarUrl: null, status: 'active', lastAccessAt, isOnline: online(lastAccessAt) }
  })

  for (let id = FIGMA_USERS.length + 1; id <= TOTAL_USERS; id += 1) {
    const first = FIRST_NAMES[id % FIRST_NAMES.length]!
    const last = LAST_NAMES[(id * 7) % LAST_NAMES.length]!
    // 1 em cada 16 está logado agora; os outros foram vistos entre 6 minutos e 30 dias atrás.
    const minutesAgo = id % 16 === 0 ? id % 5 : 6 + ((id * 977) % (30 * 24 * 60))
    const lastAccessAt = at(DEMO_NOW - minutesAgo * MINUTE)
    users.push({
      id,
      name: `${first} ${last}`,
      email: `${slug(first)}.${slug(last)}${id}@edu.unifor.br`,
      course: COURSES[id % COURSES.length]!,
      whatsapp: `859${String(10_000_000 + ((id * 7919) % 89_999_999))}`,
      avatarUrl: null,
      // Cerca de 34 contas novas na última semana (RN-ADM-02).
      createdAt: at(DEMO_NOW - ((id * 7919) % 290) * DAY - (id % 24) * 60 * MINUTE),
      status: id % 97 === 0 ? 'suspended' : 'active',
      lastAccessAt,
      isOnline: id % 97 === 0 ? false : online(lastAccessAt),
    })
  }
  return users
}

// Contas com pedido Pago ou em Retirada combinada em aberto: não podem ser excluídas (RN-ADM-06).
// A Ana vende o Cálculo I que o João já pagou (pedido 9001 do aluno de teste).
export const USERS_WITH_OPEN_PAID_ORDERS: ReadonlySet<number> = new Set([2, 5])

let users: AdminUser[] = build()
const deletedIds = new Set<number>()

// Excluídas (anonimizadas) saem do painel e dos indicadores (RN-ADM-02).
export const getAllUsers = (): AdminUser[] => users.filter((user) => !deletedIds.has(user.id))
export const findUser = (id: number): AdminUser | undefined => getAllUsers().find((user) => user.id === id)
export const isUserDeleted = (id: number): boolean => deletedIds.has(id)
export const markUserDeleted = (id: number): void => void deletedIds.add(id)
export const saveUser = (changed: AdminUser): void => {
  users = users.map((user) => (user.id === changed.id ? changed : user))
}

// Só para os testes: volta ao estado inicial.
export function resetUsersData(): void {
  users = build()
  deletedIds.clear()
}
