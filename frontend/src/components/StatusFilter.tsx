import type { StatusFilter as StatusFilterValue } from '../types/issue'

const OPTIONS: StatusFilterValue[] = ['All', 'Open', 'Resolved']

interface StatusFilterProps {
  value: StatusFilterValue
  onChange: (value: StatusFilterValue) => void
}

export function StatusFilter({ value, onChange }: StatusFilterProps) {
  return (
    <div role="group" aria-label="Filter issues by status" className="inline-flex rounded-lg bg-slate-100 p-1">
      {OPTIONS.map((option) => {
        const selected = option === value
        return (
          <button
            key={option}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(option)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 ${
              selected ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {option}
          </button>
        )
      })}
    </div>
  )
}
