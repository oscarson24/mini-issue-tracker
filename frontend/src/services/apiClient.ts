const API_BASE_URL: string = import.meta.env.VITE_API_BASE_URL ?? '/api'

/** Field name (camelCase) → validation messages, from an ASP.NET ValidationProblemDetails body. */
export type FieldErrors = Record<string, string[]>

/** Any failed request. `status` is 0 when the server could not be reached. */
export class ApiError extends Error {
  readonly status: number
  readonly fieldErrors: FieldErrors

  constructor(status: number, message: string, fieldErrors: FieldErrors = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.fieldErrors = fieldErrors
  }
}

interface ProblemDetails {
  title?: string
  detail?: string
  errors?: Record<string, string[]>
}

// ASP.NET reports "Title" for model errors and "$.title" for JSON errors; normalize both to "title".
function normalizeFieldName(key: string): string {
  const name = key.replace(/^\$\./, '')
  return name.charAt(0).toLowerCase() + name.slice(1)
}

async function toApiError(response: Response): Promise<ApiError> {
  let problem: ProblemDetails = {}
  try {
    problem = (await response.json()) as ProblemDetails
  } catch {
    // Body is empty or not JSON; fall back to a generic message.
  }

  const fieldErrors: FieldErrors = {}
  for (const [key, messages] of Object.entries(problem.errors ?? {})) {
    fieldErrors[normalizeFieldName(key)] = messages
  }

  const message = problem.detail ?? problem.title ?? `Request failed with status ${response.status}.`
  return new ApiError(response.status, message, fieldErrors)
}

/** Sends a JSON request to the API and returns the parsed body, or throws an ApiError. */
export async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers)
  headers.set('Accept', 'application/json')
  if (init.body !== undefined && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  let response: Response
  try {
    response = await fetch(`${API_BASE_URL}${path}`, { ...init, headers })
  } catch (error) {
    if (init.signal?.aborted) {
      throw error
    }
    throw new ApiError(0, 'Unable to reach the server. Check your connection and try again.')
  }

  if (!response.ok) {
    throw await toApiError(response)
  }

  if (response.status === 204) {
    return undefined as T
  }

  return (await response.json()) as T
}

export const apiClient = {
  get: <T>(path: string, options: { signal?: AbortSignal } = {}) =>
    request<T>(path, { method: 'GET', signal: options.signal }),

  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body) }),

  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PATCH', body: body === undefined ? undefined : JSON.stringify(body) }),
}
