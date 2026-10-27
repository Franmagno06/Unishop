import { useState } from 'react'
import { ErrorAlert } from '../../../../shared/components/ui/Alert'
import { Avatar } from '../../../../shared/components/ui/Avatar'
import { Button, ButtonLink } from '../../../../shared/components/ui/Button'
import { Card } from '../../../../shared/components/ui/Card'
import { SelectField } from '../../../../shared/components/ui/SelectField'
import { adminPaths } from '../../../../shared/constants/routes'
import { ApiError } from '../../../../shared/lib/api'
import { formatWhatsapp } from '../../../../shared/utils/whatsapp'
import { useUpdateUser } from '../hooks/use-admin-users'
import type { AccountStatus, AdminUser } from '../types/user.types'

function Info({ label, children }: { label: string; children: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">{label}</dt>
      <dd className="break-words text-[15px] text-text">{children}</dd>
    </div>
  )
}

function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.code === 'NETWORK_ERROR') return 'Sem conexão com o servidor. Confira a internet e tente de novo.'
    if (error.status === 404) return 'Este usuário não existe mais. Volte à lista e atualize a página.'
  }
  return 'Não foi possível salvar agora. Tente de novo em instantes.'
}

// RF021 · RN-ADM-05 (Figma A02b, simplificado em 26/10/2026): os dados do aluno aparecem só para
// consulta e o admin altera apenas o status da conta, Ativa ou Suspensa.
export function UserStatusForm({ user, onSaved }: { user: AdminUser; onSaved: () => void }) {
  const save = useUpdateUser(user.id)
  const [status, setStatus] = useState<AccountStatus>(user.status)

  return (
    <Card className="flex flex-col gap-5 p-5 sm:p-7">
      <h2 className="text-lg font-semibold text-navy">Conta</h2>
      <div className="flex items-center gap-4">
        <Avatar name={user.name} imageUrl={user.avatarUrl} className="size-[72px] text-2xl" />
        <p className="break-words font-display text-2xl font-bold text-navy">{user.name}</p>
      </div>
      <dl className="grid gap-4 sm:grid-cols-2">
        <Info label="E-mail">{user.email}</Info>
        <Info label="Curso">{user.course || 'Não informado'}</Info>
        <Info label="WhatsApp">{user.whatsapp ? formatWhatsapp(user.whatsapp) : 'Não informado'}</Info>
      </dl>

      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault()
          save.mutate({ status }, { onSuccess: onSaved })
        }}
        className="flex flex-col gap-4 border-t border-border pt-5"
      >
        {save.isError ? <ErrorAlert title="Não foi possível salvar">{errorMessage(save.error)}</ErrorAlert> : null}
        <SelectField
          label="Status da conta"
          value={status}
          onChange={(event) => setStatus(event.target.value as AccountStatus)}
        >
          <option value="active">Ativa</option>
          <option value="suspended">Suspensa</option>
        </SelectField>
        <p className="-mt-2 text-[13px] text-text-muted">
          Conta suspensa não consegue entrar e tem os anúncios ocultos, sem apagar nenhum dado.
        </p>
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <ButtonLink to={adminPaths.userDetail(user.id)} variant="secondary">
            Cancelar
          </ButtonLink>
          <Button type="submit" disabled={save.isPending}>
            {save.isPending ? 'Salvando…' : 'Salvar'}
          </Button>
        </div>
      </form>
    </Card>
  )
}
