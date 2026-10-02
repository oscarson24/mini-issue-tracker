export const ISSUE_STATUSES = ['Open', 'Resolved'] as const

export type IssueStatus = (typeof ISSUE_STATUSES)[number]

/** Filter options in the UI: a specific status, or everything. */
export type StatusFilter = IssueStatus | 'All'

/** Mirrors the API's IssueResponse. Timestamps are ISO 8601 strings. */
export interface Issue {
  id: number
  title: string
  description: string | null
  status: IssueStatus
  createdAt: string
  updatedAt: string
  resolvedAt: string | null
}

export interface CreateIssueRequest {
  title: string
  description?: string
}

/** Limits enforced by the API; the form validates against the same values. */
export const TITLE_MAX_LENGTH = 200
export const DESCRIPTION_MAX_LENGTH = 2000
