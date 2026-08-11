import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

import { cn } from '@/lib/utils'

const WEEKDAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

function startOfDay(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function addMonths(date: Date, count: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + count, 1)
}

interface CalendarProps {
  selectedDate: Date | null
  onSelectDate: (date: Date) => void
  minDate?: Date
  maxDate?: Date
  /** Days that already have something scheduled on them (e.g. other posts) — shown with a dot. */
  markedDates?: Date[]
  className?: string
}

export function Calendar({ selectedDate, onSelectDate, minDate, maxDate, markedDates, className }: CalendarProps) {
  const today = startOfDay(new Date())
  const min = minDate ? startOfDay(minDate) : today
  const max = maxDate ? startOfDay(maxDate) : undefined
  const [viewMonth, setViewMonth] = useState(() => startOfMonth(selectedDate ?? min))

  const marked = (markedDates ?? []).map(startOfDay)

  const monthStart = startOfMonth(viewMonth)
  const firstWeekday = monthStart.getDay()
  const daysInMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 0).getDate()

  const cells: (Date | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => new Date(viewMonth.getFullYear(), viewMonth.getMonth(), i + 1)),
  ]

  const prevDisabled = startOfMonth(addMonths(viewMonth, 0)) <= startOfMonth(min) && viewMonth.getMonth() === min.getMonth() && viewMonth.getFullYear() === min.getFullYear()
  const nextDisabled = !!max && addMonths(viewMonth, 1) > startOfMonth(max) && !(addMonths(viewMonth, 1).getMonth() === max.getMonth() && addMonths(viewMonth, 1).getFullYear() === max.getFullYear())

  return (
    <div className={cn('rounded-md border border-border-default bg-bg-surface p-3', className)}>
      <div className="mb-2 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setViewMonth((m) => addMonths(m, -1))}
          disabled={prevDisabled}
          className="rounded-md p-1 text-text-muted transition-colors hover:bg-bg-tertiary hover:text-text-primary disabled:pointer-events-none disabled:opacity-30"
        >
          <ChevronLeft size={14} />
        </button>
        <span className="text-caption font-medium text-text-primary">
          {viewMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </span>
        <button
          type="button"
          onClick={() => setViewMonth((m) => addMonths(m, 1))}
          disabled={nextDisabled}
          className="rounded-md p-1 text-text-muted transition-colors hover:bg-bg-tertiary hover:text-text-primary disabled:pointer-events-none disabled:opacity-30"
        >
          <ChevronRight size={14} />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {WEEKDAY_LABELS.map((label, i) => (
          <div key={i} className="flex h-6 items-center justify-center text-caption text-text-muted">
            {label}
          </div>
        ))}
        {cells.map((date, i) => {
          if (!date) return <div key={i} />
          const disabled = date < min || (!!max && date > max)
          const isSelected = !!selectedDate && isSameDay(date, selectedDate)
          const isToday = isSameDay(date, today)
          const isMarked = marked.some((d) => isSameDay(d, date))
          return (
            <button
              key={i}
              type="button"
              disabled={disabled}
              onClick={() => onSelectDate(date)}
              title={isMarked ? 'Another post is already scheduled this day' : undefined}
              className={cn(
                'relative flex h-8 items-center justify-center rounded-md text-caption transition-colors',
                disabled
                  ? 'cursor-not-allowed text-text-muted/40'
                  : 'text-text-secondary hover:bg-bg-tertiary hover:text-text-primary',
                isSelected && 'bg-accent-red text-white hover:bg-accent-red hover:text-white',
                isToday && !isSelected && 'font-semibold text-accent-blue'
              )}
            >
              {date.getDate()}
              {isMarked && (
                <span
                  className={cn(
                    'absolute bottom-0.5 h-1 w-1 rounded-full',
                    isSelected ? 'bg-white' : 'bg-accent-yellow'
                  )}
                />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
