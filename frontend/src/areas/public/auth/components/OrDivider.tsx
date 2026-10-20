export function OrDivider() {
  return (
    <div className="flex items-center gap-3" role="separator" aria-label="ou">
      <span className="h-px flex-1 bg-border" />
      <span className="text-[13px] text-text-muted" aria-hidden="true">
        ou
      </span>
      <span className="h-px flex-1 bg-border" />
    </div>
  )
}
