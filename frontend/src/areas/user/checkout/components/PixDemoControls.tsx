import { Button } from '../../../../shared/components/ui/Button'

// Controle só da demonstração (modo de exemplo em `npm run dev`): vence o Pix na hora para ver
// o estado "pedido cancelado" (RN-PAG-04). Sai do build de produção junto com o modo de exemplo.
export function PixDemoControls({ onExpire }: { onExpire: () => void }) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-dashed border-border p-3 text-xs text-text-muted">
      <span>Demonstração:</span>
      <Button variant="secondary" onClick={onExpire} className="px-3 py-1.5 text-xs">
        Simular Pix expirado
      </Button>
    </div>
  )
}
