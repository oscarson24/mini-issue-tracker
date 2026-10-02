import type { CreateIssueRequest, Issue, IssueStatus } from '../types/issue'
import { apiClient } from './apiClient'

const RESOURCE = '/issues'

/** Every Issue API call goes through here; components and hooks never call fetch directly. */
export const issueService = {
  /** Lists issues, newest first, optionally filtered by status. */
  getAll(status?: IssueStatus, signal?: AbortSignal): Promise<Issue[]> {
    const query = status ? `?status=${encodeURIComponent(status)}` : ''
    return apiClient.get<Issue[]>(`${RESOURCE}${query}`, { signal })
  },

  getById(id: number): Promise<Issue> {
    return apiClient.get<Issue>(`${RESOURCE}/${id}`)
  },

  create(data: CreateIssueRequest): Promise<Issue> {
    return apiClient.post<Issue>(RESOURCE, data)
  },

  /** Marks an issue as resolved. Safe to call on an already resolved issue. */
  resolve(id: number): Promise<Issue> {
    return apiClient.patch<Issue>(`${RESOURCE}/${id}/resolve`)
  },
}
