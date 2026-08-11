import * as React from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, ChevronDown, Search } from 'lucide-react'

import { cn } from '@/lib/utils'

interface OptionMeta {
  value: string
  label: React.ReactNode
  searchText: string
  disabled?: boolean
}

function optionsFromChildren(children: React.ReactNode): OptionMeta[] {
  const options: OptionMeta[] = []
  React.Children.forEach(children, (child) => {
    if (!React.isValidElement(child) || child.type !== 'option') return
    const props = child.props as { value?: string; children?: React.ReactNode; disabled?: boolean }
    options.push({
      value: String(props.value ?? ''),
      label: props.children,
      searchText: String(props.children ?? '').toLowerCase(),
      disabled: props.disabled,
    })
  })
  return options
}

export interface SelectProps {
  id?: string
  value: string
  onChange: (e: { target: { value: string } }) => void
  children: React.ReactNode
  className?: string
  disabled?: boolean
  required?: boolean
  placeholder?: string
  'aria-label'?: string
}

const Select = React.forwardRef<HTMLButtonElement, SelectProps>(
  ({ id, value, onChange, children, className, disabled, required, placeholder, ...rest }, ref) => {
    const ariaLabel = rest['aria-label']
    const [open, setOpen] = useState(false)
    const [search, setSearch] = useState('')
    const containerRef = useRef<HTMLDivElement>(null)
    const searchInputRef = useRef<HTMLInputElement>(null)

    const options = useMemo(() => optionsFromChildren(children), [children])
    const selected = options.find((o) => o.value === value)
    const isPlaceholder = !selected || selected.disabled
    const searchable = options.length > 8

    const filtered = search.trim()
      ? options.filter((o) => o.searchText.includes(search.trim().toLowerCase()))
      : options

    useEffect(() => {
      if (!open) {
        setSearch('')
        return
      }
      if (searchable) {
        // Let the panel mount before focusing so it doesn't steal scroll position.
        const t = setTimeout(() => searchInputRef.current?.focus(), 0)
        return () => clearTimeout(t)
      }
    }, [open, searchable])

    useEffect(() => {
      if (!open) return
      function handlePointerDown(e: PointerEvent) {
        if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
          setOpen(false)
        }
      }
      function handleKeyDown(e: KeyboardEvent) {
        if (e.key === 'Escape') setOpen(false)
      }
      document.addEventListener('pointerdown', handlePointerDown)
      document.addEventListener('keydown', handleKeyDown)
      return () => {
        document.removeEventListener('pointerdown', handlePointerDown)
        document.removeEventListener('keydown', handleKeyDown)
      }
    }, [open])

    function selectOption(option: OptionMeta) {
      if (option.disabled) return
      onChange({ target: { value: option.value } })
      setOpen(false)
    }

    return (
      <div ref={containerRef} className={cn('relative', className)}>
        <button
          ref={ref}
          id={id}
          type="button"
          disabled={disabled}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-required={required}
          aria-label={ariaLabel}
          onClick={() => setOpen((o) => !o)}
          className={
            'flex h-10 w-full items-center justify-between gap-2 rounded-md border border-border-default bg-bg-surface px-3 py-2 text-left text-body text-text-primary transition-colors focus-visible:outline-none focus-visible:border-border-focus disabled:cursor-not-allowed disabled:opacity-50' +
            (open ? ' border-border-focus' : '')
          }
        >
          <span className={cn('truncate', isPlaceholder && 'text-text-muted')}>
            {selected ? selected.label : (placeholder ?? 'Select…')}
          </span>
          <ChevronDown
            size={14}
            className={cn('shrink-0 text-text-muted transition-transform', open && 'rotate-180')}
          />
        </button>

        {open && (
          <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-md border border-border-default bg-bg-secondary shadow-lg">
            {searchable && (
              <div className="flex items-center gap-2 border-b border-border-default px-3 py-2">
                <Search size={13} className="shrink-0 text-text-muted" />
                <input
                  ref={searchInputRef}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search…"
                  className="w-full bg-transparent text-body-sm text-text-primary placeholder:text-text-muted focus-visible:outline-none"
                />
              </div>
            )}
            <div className="max-h-64 overflow-y-auto py-1">
              {filtered.length === 0 && (
                <p className="px-3 py-2.5 text-body-sm text-text-muted">No matches.</p>
              )}
              {filtered.map((option) => {
                const isSelected = option.value === value
                return (
                  <button
                    key={option.value}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    disabled={option.disabled}
                    onClick={() => selectOption(option)}
                    className={cn(
                      'flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-body-sm transition-colors',
                      option.disabled
                        ? 'cursor-not-allowed text-text-muted'
                        : 'text-text-primary hover:bg-bg-tertiary',
                      isSelected && !option.disabled && 'bg-bg-tertiary'
                    )}
                  >
                    <span className="truncate">{option.label}</span>
                    {isSelected && !option.disabled && (
                      <Check size={14} className="shrink-0 text-accent-red" />
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>
    )
  }
)
Select.displayName = 'Select'

export { Select }
