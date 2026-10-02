import type { Issue } from '../types/issue'

export function makeIssue(overrides: Partial<Issue> = {}): Issue {
  return {
    id: 1,
    title: 'Login button not working',
    description: 'Clicking login does nothing on Safari.',
    status: 'Open',
    createdAt: '2026-10-01T12:00:00+00:00',
    updatedAt: '2026-10-01T12:00:00+00:00',
    resolvedAt: null,
    ...overrides,
  }
}

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}
