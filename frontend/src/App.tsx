import { useState } from 'react'
import { IssueForm } from './components/IssueForm'
import { IssueList } from './components/IssueList'
import { StatusFilter } from './components/StatusFilter'
import { useIssues } from './hooks/useIssues'
import type { StatusFilter as StatusFilterValue } from './types/issue'

export default function App() {
  const [filter, setFilter] = useState<StatusFilterValue>('All')
  const { issues, loading, error, refresh, createIssue, resolveIssue } = useIssues(filter)

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-5xl px-4 py-5 sm:px-6">
          <h1 className="text-xl font-bold tracking-tight">Mini Issue Tracker</h1>
          <p className="mt-0.5 text-sm text-slate-500">Track issues and mark them resolved.</p>
        </div>
      </header>

      <main className="mx-auto grid max-w-5xl gap-6 px-4 py-6 sm:px-6 md:grid-cols-[minmax(0,20rem)_minmax(0,1fr)] md:items-start">
        <aside className="md:sticky md:top-6">
          <IssueForm onCreate={createIssue} />
        </aside>

        <section aria-labelledby="issues-heading">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 id="issues-heading" className="text-base font-semibold">
              Issues
            </h2>
            <StatusFilter value={filter} onChange={setFilter} />
          </div>
          <IssueList
            issues={issues}
            loading={loading}
            error={error}
            filter={filter}
            onResolve={resolveIssue}
            onRetry={refresh}
          />
        </section>
      </main>
    </div>
  )
}
