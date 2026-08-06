export function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-border-default bg-bg-tertiary/80 px-3 py-1 text-caption font-semibold uppercase tracking-wider text-text-muted backdrop-blur-sm">
      <span className="h-1.5 w-1.5 rounded-full bg-accent-red shadow-[0_0_6px_rgba(229,72,77,0.6)]" />
      {children}
    </p>
  )
}
