import { InfoAlert } from '../../../../shared/components/ui/Alert'

// RN-PAG-15: a tela de pagamento avisa que o ambiente é de demonstração (RN-PAG-10). O Figma não
// desenha este aviso; ele vem da regra.
export function DemoEnvironmentNotice() {
  return (
    <InfoAlert title="Ambiente de demonstração">
      Nenhum valor é cobrado de verdade. O pagamento usa as credenciais de teste do gateway.
    </InfoAlert>
  )
}
