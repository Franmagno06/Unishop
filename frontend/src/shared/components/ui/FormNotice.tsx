export function FormNotice({ children }: { children: string }) {
  return (
    <p role="status" className="rounded-lg bg-primary-soft px-4 py-3 text-sm text-navy">
      {children}
    </p>
  )
}
