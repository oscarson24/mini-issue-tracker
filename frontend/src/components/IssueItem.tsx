import { useState } from 'react'
import { ApiError } from '../services/apiClient'
import type { Issue } from '../types/issue'
import { formatDate } from '../utils/formatDate'
import { StatusBadge } from './StatusBadge'

interface IssueItemProps {
  issue: Issue
  onResolve: (id: number) => Promise<unknown>
}

export function IssueItem({ issue, onResolve }: IssueItemProps) {
  const [resolving, setResolving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleResolve() {
    setResolving(true)
    setError(null)
    try {
      await onResolve(issue.id)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not resolve this issue.')
      setResolving(false)
    }
    // On success the item re-renders as Resolved (or leaves the "Open" view), so no reset is needed.
  }

  return (
    <li>
      <article
        aria-labelledby={`issue-${issue.id}-title`}
        className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"
      >
        <div className="flex items-start justify-between gap-3">
          <h3 id={`issue-${issue.id}-title`} className="font-semibold break-words text-slate-900">
            {issue.title}
          </h3>
          <StatusBadge status={issue.status} />
        </div>

        {issue.description ? (
          <p className="mt-2 text-sm whitespace-pre-wrap break-words text-slate-600">{issue.description}</p>
        ) : (
          <p className="mt-2 text-sm text-slate-400 italic">No description</p>
        )}

        <dl className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-500">
          <div className="flex gap-1">
            <dt>Created</dt>
            <dd>
              <time dateTime={issue.createdAt}>{formatDate(issue.createdAt)}</time>
            </dd>
          </div>
          <div className="flex gap-1">
            <dt>Updated</dt>
            <dd>
              <time dateTime={issue.updatedAt}>{formatDate(issue.updatedAt)}</time>
            </dd>
          </div>
          {issue.resolvedAt && (
            <div className="flex gap-1">
              <dt>Resolved</dt>
              <dd>
                <time dateTime={issue.resolvedAt}>{formatDate(issue.resolvedAt)}</time>
              </dd>
            </div>
          )}
        </dl>

        {issue.status === 'Open' && (
          <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={handleResolve}
              disabled={resolving}
              className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-emerald-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {resolving ? 'Resolving…' : 'Mark as resolved'}
            </button>
            {error && (
              <p role="alert" className="text-sm text-red-600">
                {error}
              </p>
            )}
          </div>
        )}
      </article>
    </li>
  )
}
