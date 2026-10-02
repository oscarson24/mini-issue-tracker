import type { Issue, StatusFilter } from '../types/issue'
import { IssueItem } from './IssueItem'

interface IssueListProps {
  issues: Issue[]
  loading: boolean
  error: string | null
  filter: StatusFilter
  onResolve: (id: number) => Promise<unknown>
  onRetry: () => void
}

const EMPTY_MESSAGES: Record<StatusFilter, string> = {
  All: 'No issues yet. Create the first one with the form.',
  Open: 'No open issues. Nice work!',
  Resolved: 'No resolved issues yet.',
}

export function IssueList({ issues, loading, error, filter, onResolve, onRetry }: IssueListProps) {
  if (error) {
    return (
      <div
        role="alert"
        className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
      >
        <span>{error}</span>
        <button
          type="button"
          onClick={onRetry}
          className="rounded-lg bg-white px-3 py-1.5 font-medium text-red-700 ring-1 ring-red-200 hover:bg-red-100"
        >
          Retry
        </button>
      </div>
    )
  }

  if (loading) {
    return (
      <div aria-busy="true" aria-live="polite" className="space-y-3">
        <span className="sr-only">Loading issues…</span>
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-28 animate-pulse rounded-xl bg-slate-200/70" />
        ))}
      </div>
    )
  }

  if (issues.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
        {EMPTY_MESSAGES[filter]}
      </p>
    )
  }

  return (
    <ul aria-label="Issues" className="space-y-3">
      {issues.map((issue) => (
        <IssueItem key={issue.id} issue={issue} onResolve={onResolve} />
      ))}
    </ul>
  )
}
