import { useCallback, useEffect, useState } from 'react'
import { ApiError } from '../services/apiClient'
import { issueService } from '../services/issueService'
import type { CreateIssueRequest, Issue, StatusFilter } from '../types/issue'

interface LoadResult {
  /** Which request produced this result; loading is "the latest result is for an older request". */
  key: string
  /** The filter this list was loaded for; local updates follow its rules, not the filter at call time. */
  filter: StatusFilter
  issues: Issue[]
  error: string | null
}

function errorMessage(error: unknown): string {
  return error instanceof ApiError ? error.message : 'Something went wrong while loading issues.'
}

/** New issues are Open, so they belong at the top of the "All" and "Open" views only. */
function withCreated(issues: Issue[], filter: StatusFilter, created: Issue): Issue[] {
  return filter === 'Resolved' ? issues : [created, ...issues]
}

/** A resolved issue leaves the "Open" view and is updated in place elsewhere. */
function withResolved(issues: Issue[], filter: StatusFilter, resolved: Issue): Issue[] {
  return filter === 'Open'
    ? issues.filter((issue) => issue.id !== resolved.id)
    : issues.map((issue) => (issue.id === resolved.id ? resolved : issue))
}

/** Loads issues for the given filter and exposes create/resolve actions that keep the list in sync. */
export function useIssues(filter: StatusFilter) {
  const [reloadCount, setReloadCount] = useState(0)
  const [result, setResult] = useState<LoadResult | null>(null)
  const requestKey = `${filter}#${reloadCount}`

  useEffect(() => {
    const controller = new AbortController()

    issueService
      .getAll(filter === 'All' ? undefined : filter, controller.signal)
      .then((issues) => setResult({ key: requestKey, filter, issues, error: null }))
      .catch((err: unknown) => {
        if (!controller.signal.aborted) {
          setResult({ key: requestKey, filter, issues: [], error: errorMessage(err) })
        }
      })

    return () => controller.abort()
  }, [filter, requestKey])

  const loading = result?.key !== requestKey

  // The user may switch filters while a create/resolve is in flight, so updates are applied
  // to whichever list is loaded when the response arrives, using that list's own filter.
  const updateIssues = useCallback((update: (issues: Issue[], filter: StatusFilter) => Issue[]) => {
    setResult((current) => current && { ...current, issues: update(current.issues, current.filter) })
  }, [])

  const refresh = useCallback(() => setReloadCount((count) => count + 1), [])

  /** Creates an issue; throws ApiError so the form can show validation messages. */
  const createIssue = useCallback(
    async (data: CreateIssueRequest) => {
      const created = await issueService.create(data)
      updateIssues((issues, listFilter) => withCreated(issues, listFilter, created))
      return created
    },
    [updateIssues],
  )

  /** Resolves an issue; throws ApiError so the item can show what went wrong. */
  const resolveIssue = useCallback(
    async (id: number) => {
      const resolved = await issueService.resolve(id)
      updateIssues((issues, listFilter) => withResolved(issues, listFilter, resolved))
      return resolved
    },
    [updateIssues],
  )

  return {
    issues: result?.issues ?? [],
    loading,
    error: loading ? null : (result?.error ?? null),
    refresh,
    createIssue,
    resolveIssue,
  }
}
