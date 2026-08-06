import { Link } from 'react-router-dom'
import { Zap } from 'lucide-react'

export function Logo({ className, expanded = false }: { className?: string; expanded?: boolean }) {
  return (
    <Link to="/" className={`group flex items-center gap-2.5 ${className ?? ''}`}>
      <div className="hexagon flex h-9 w-9 shrink-0 items-center justify-center bg-gradient-to-br from-accent-red to-accent-red/70 shadow-sm shadow-accent-red/25 transition-shadow group-hover:shadow-md group-hover:shadow-accent-red/30">
        <Zap size={16} className="text-white" fill="currentColor" />
      </div>
      <div className="flex flex-col justify-center">
        <span className="flex items-center gap-2 text-[15px] font-semibold leading-tight tracking-tight text-text-primary">
          AI Traffic Engine
          {expanded && (
            <span className="rounded-full border border-accent-red/40 bg-accent-red/10 px-1.5 py-0.5 text-[9px] font-bold uppercase leading-none tracking-wider text-accent-red">
              New
            </span>
          )}
        </span>
        {expanded && (
          <span className="text-[11px] leading-tight text-text-muted">Auto-managed traffic, powered by AI</span>
        )}
      </div>
    </Link>
  )
}
