export function FormError({ children }: { children: string }) {
  return (
    <p
      role="alert"
      className="rounded-lg border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger"
    >
      {children}
    </p>
  )
}
