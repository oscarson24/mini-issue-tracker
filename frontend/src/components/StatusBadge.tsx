import type { IssueStatus } from '../types/issue'

const styles: Record<IssueStatus, string> = {
  Open: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  Resolved: 'bg-slate-100 text-slate-600 ring-slate-500/20',
}

export function StatusBadge({ status }: { status: IssueStatus }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${styles[status]}`}
    >
      <span
        aria-hidden="true"
        className={`size-1.5 rounded-full ${status === 'Open' ? 'bg-emerald-500' : 'bg-slate-400'}`}
      />
      {status}
    </span>
  )
}
