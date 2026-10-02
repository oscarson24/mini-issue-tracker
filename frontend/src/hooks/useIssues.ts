import { useCallback, useEffect, useState } from 'react'
import { ApiError } from '../services/apiClient'
import { issueService } from '../services/issueService'
import type { CreateIssueRequest, Issue, StatusFilter } from '../types/issue'

interface LoadResult {
  /** Which request produced this result; loading is "the latest result is for an older request". */
  key: string
  issues: Issue[]
  error: string | null
}

function errorMessage(error: unknown): string {
  return error instanceof ApiError ? error.message : 'Something went wrong while loading issues.'
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
      .then((issues) => setResult({ key: requestKey, issues, error: null }))
      .catch((err: unknown) => {
        if (!controller.signal.aborted) {
          setResult({ key: requestKey, issues: [], error: errorMessage(err) })
        }
      })

    return () => controller.abort()
  }, [filter, requestKey])

  const loading = result?.key !== requestKey

  const updateIssues = useCallback((update: (issues: Issue[]) => Issue[]) => {
    setResult((current) => current && { ...current, issues: update(current.issues) })
  }, [])

  const refresh = useCallback(() => setReloadCount((count) => count + 1), [])

  /** Creates an issue; throws ApiError so the form can show validation messages. */
  const createIssue = useCallback(
    async (data: CreateIssueRequest) => {
      const created = await issueService.create(data)
      // New issues are Open, so they belong in the "All" and "Open" views (newest first).
      if (filter !== 'Resolved') {
        updateIssues((issues) => [created, ...issues])
      }
      return created
    },
    [filter, updateIssues],
  )

  /** Resolves an issue; throws ApiError so the item can show what went wrong. */
  const resolveIssue = useCallback(
    async (id: number) => {
      const resolved = await issueService.resolve(id)
      updateIssues((issues) =>
        filter === 'Open'
          ? issues.filter((issue) => issue.id !== id)
          : issues.map((issue) => (issue.id === id ? resolved : issue)),
      )
      return resolved
    },
    [filter, updateIssues],
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
