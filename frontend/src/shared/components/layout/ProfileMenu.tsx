import {
  useEffect,
  useId,
  useRef,
  useState,
  type FocusEvent,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
} from 'react'
import { Link } from 'react-router'
import { ROUTES } from '../../constants/routes'
import { useCurrentUser } from '../../hooks/use-current-user'
import { useLogout } from '../../hooks/use-logout'
import type { Role } from '../../lib/session'
import { getInitials } from '../../utils/initials'
import { DashboardIcon, LogoutIcon, UserIcon } from '../ui/icons'

// Tempo para o cursor atravessar do avatar ao cartão sem o menu fechar.
const CLOSE_DELAY_MS = 150

const itemClasses =
  'flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm font-semibold transition-colors duration-150 focus-visible:outline-2 focus-visible:-outline-offset-2'

// Avatar com um cartão no canto. Abre ao passar o mouse, ao clicar ou tocar e pelo teclado
// (Enter ou Espaço); fecha com Esc, ao clicar fora ou ao sair do menu com Tab.
// "Sair" fica em vermelho, como nos grandes sites.
export function ProfileMenu({ role }: { role: Role }) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const closeTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const lastPointer = useRef('')
  const menuId = useId()
  const logout = useLogout()
  const isAdmin = role === 'admin'
  // Iniciais (ou a foto) do aluno de exemplo; vêm de GET /auth/me quando a API existir.
  const { name, avatarUrl } = useCurrentUser()

  useEffect(() => () => clearTimeout(closeTimer.current), [])

  // Clique ou toque fora do menu fecha (no celular não existe "tirar o mouse").
  useEffect(() => {
    if (!open) return
    function onPointerDown(event: globalThis.PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open])

  function handlePointerEnter(event: PointerEvent) {
    if (event.pointerType !== 'mouse') return
    clearTimeout(closeTimer.current)
    setOpen(true)
  }

  function handlePointerLeave(event: PointerEvent) {
    if (event.pointerType !== 'mouse') return
    clearTimeout(closeTimer.current)
    closeTimer.current = setTimeout(() => setOpen(false), CLOSE_DELAY_MS)
  }

  function handleButtonClick(event: MouseEvent) {
    // Com o mouse o menu já abriu ao passar por cima: o clique o mantém aberto em vez de fechar.
    const withMouse = lastPointer.current === 'mouse' && event.detail > 0
    lastPointer.current = ''
    if (withMouse) {
      clearTimeout(closeTimer.current)
      setOpen(true)
    } else {
      setOpen((current) => !current)
    }
  }

  function handleKeyDown(event: KeyboardEvent) {
    if (event.key === 'Escape' && open) {
      event.stopPropagation()
      setOpen(false)
      buttonRef.current?.focus()
    }
  }

  function handleBlur(event: FocusEvent) {
    if (!rootRef.current?.contains(event.relatedTarget as Node | null)) setOpen(false)
  }

  return (
    <div
      ref={rootRef}
      className="relative"
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
      onKeyDown={handleKeyDown}
      onBlur={handleBlur}
    >
      <button
        ref={buttonRef}
        type="button"
        aria-label="Minha conta"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onPointerDown={(event) => {
          lastPointer.current = event.pointerType
        }}
        onClick={handleButtonClick}
        className="flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full bg-primary-soft text-[15px] font-bold text-navy transition-[scale,background-color] duration-150 ease-out-strong hover:bg-primary-soft/70 active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        {avatarUrl ? (
          <img src={avatarUrl} alt="" className="size-full rounded-full object-cover" />
        ) : (
          getInitials(name)
        )}
      </button>

      {open ? (
        // O espaço de cima (pt-2) faz parte do menu: o cursor atravessa sem sair da área.
        <div className="absolute right-0 top-full z-30 pt-2">
          <div
            id={menuId}
            role="group"
            aria-label="Minha conta"
            tabIndex={-1}
            className="w-56 rounded-xl border border-border bg-surface p-1.5 shadow-lg transition duration-150 ease-out-strong focus:outline-none starting:-translate-y-1 starting:opacity-0 motion-reduce:transition-none"
          >
            <Link
              to={isAdmin ? ROUTES.adminUsers : ROUTES.profile}
              onClick={() => setOpen(false)}
              className={`${itemClasses} text-text hover:bg-primary-soft focus-visible:outline-primary`}
            >
              {isAdmin ? <DashboardIcon className="size-[18px]" /> : <UserIcon className="size-[18px]" />}
              {isAdmin ? 'Painel admin' : 'Ver perfil'}
            </Link>
            <hr className="my-1 border-border" />
            <button
              type="button"
              onClick={() => {
                setOpen(false)
                logout()
              }}
              className={`${itemClasses} cursor-pointer text-danger hover:bg-danger-soft focus-visible:outline-danger`}
            >
              <LogoutIcon className="size-[18px]" />
              Sair
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
