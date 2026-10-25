import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { ImageUploader } from './ImageUploader'

function file(name: string, type = 'image/png', size = 10) {
  const f = new File(['x'], name, { type })
  Object.defineProperty(f, 'size', { value: size })
  return f
}

function Harness({ initial = [], error }: { initial?: File[]; error?: string }) {
  const [files, setFiles] = useState<File[]>(initial)
  return <ImageUploader files={files} onChange={setFiles} error={error} />
}

const input = () => screen.getByLabelText(/Arraste fotos/)
// applyAccept: false deixa chegar arquivos que o seletor do navegador já filtraria (arrastar e soltar).
const user = () => userEvent.setup({ applyAccept: false })

describe('ImageUploader', () => {
  it('explica o limite e mostra 0 de 5 fotos', () => {
    render(<Harness />)
    expect(screen.getByText(/JPG ou PNG, até 4 MB cada, de 1 a 5 fotos/)).toBeInTheDocument()
    expect(screen.getByText('0 de 5 fotos. A primeira é a capa do anúncio.')).toBeInTheDocument()
    expect(input()).toHaveAttribute('accept', 'image/jpeg,image/png')
  })

  it('adiciona fotos, mostra miniaturas e marca a primeira como capa', async () => {
    render(<Harness />)
    await user().upload(input(), [file('a.png'), file('b.jpg', 'image/jpeg')])

    expect(screen.getByRole('list', { name: 'Fotos escolhidas' }).children).toHaveLength(2)
    expect(screen.getAllByText('Capa')).toHaveLength(1)
    expect(screen.getByText('2 de 5 fotos. A primeira é a capa do anúncio.')).toBeInTheDocument()
  })

  it('recusa tipo errado e arquivo acima de 4 MB, dizendo o motivo, sem adicionar', async () => {
    render(<Harness />)
    await user().upload(input(), [file('a.gif', 'image/gif'), file('grande.png', 'image/png', 4 * 1024 * 1024 + 1)])

    expect(screen.getByText('“a.gif” não é JPG nem PNG.')).toBeInTheDocument()
    expect(screen.getByText('“grande.png” passa de 4 MB.')).toBeInTheDocument()
    expect(screen.queryByRole('list', { name: 'Fotos escolhidas' })).not.toBeInTheDocument()
  })

  it('aceita exatamente 4 MB', async () => {
    render(<Harness />)
    await user().upload(input(), file('limite.png', 'image/png', 4 * 1024 * 1024))
    expect(screen.getByRole('list', { name: 'Fotos escolhidas' }).children).toHaveLength(1)
  })

  it('aceita no máximo 5: a sexta não entra e o campo é desativado', async () => {
    render(<Harness />)
    const files = Array.from({ length: 6 }, (_, i) => file(`f${i}.png`))
    await user().upload(input(), files)

    expect(screen.getByRole('list', { name: 'Fotos escolhidas' }).children).toHaveLength(5)
    expect(screen.getByText('“f5.png” não entrou: o máximo é 5 fotos.')).toBeInTheDocument()
    expect(input()).toBeDisabled()
  })

  it('remover uma foto libera o espaço e a próxima vira capa', async () => {
    render(<Harness initial={[file('a.png'), file('b.png')]} />)
    await userEvent.click(screen.getByRole('button', { name: 'Remover foto a.png' }))

    expect(screen.getByRole('list', { name: 'Fotos escolhidas' }).children).toHaveLength(1)
    expect(screen.getByRole('button', { name: 'Remover foto b.png' })).toBeInTheDocument()
    expect(screen.getByText('Capa')).toBeInTheDocument()
  })

  it('aceita arrastar e soltar', () => {
    render(<Harness />)
    const zone = input().closest('label')!
    fireEvent.drop(zone, { dataTransfer: { files: [file('solta.png')] } })

    expect(screen.getByRole('list', { name: 'Fotos escolhidas' }).children).toHaveLength(1)
  })

  it('mostra o erro de envio vindo do formulário', () => {
    render(<Harness error="Envie pelo menos 1 foto." />)
    expect(screen.getByText('Envie pelo menos 1 foto.')).toBeInTheDocument()
  })

  it('pode escolher o mesmo arquivo de novo depois de remover', async () => {
    render(<Harness />)
    const u = user()
    const same = file('a.png')
    await u.upload(input(), same)
    await u.click(screen.getByRole('button', { name: 'Remover foto a.png' }))
    await u.upload(input(), same)
    expect(screen.getByRole('list', { name: 'Fotos escolhidas' }).children).toHaveLength(1)
  })
})
