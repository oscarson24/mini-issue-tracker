import { describe, expect, it, vi } from 'vitest'
import { jsonResponse } from '../test/fixtures'
import { ApiError, apiClient } from './apiClient'

describe('apiClient', () => {
  it('prefixes paths with /api and parses JSON', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ ok: true }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(apiClient.get('/issues')).resolves.toEqual({ ok: true })

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('/api/issues')
    expect(init.method).toBe('GET')
    expect(new Headers(init.headers).get('Accept')).toBe('application/json')
  })

  it('sends a JSON body with Content-Type on POST', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({}, 201))
    vi.stubGlobal('fetch', fetchMock)

    await apiClient.post('/issues', { title: 'x' })

    const [, init] = fetchMock.mock.calls[0]
    expect(init.method).toBe('POST')
    expect(init.body).toBe('{"title":"x"}')
    expect(new Headers(init.headers).get('Content-Type')).toBe('application/json')
  })

  it('turns ValidationProblemDetails into an ApiError with camelCase field errors', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        jsonResponse(
          {
            title: 'One or more validation errors occurred.',
            status: 400,
            errors: { Title: ['The Title field is required.'], '$.description': ['Invalid JSON.'] },
          },
          400,
        ),
      ),
    )

    const error = await apiClient.post('/issues', {}).catch((e: unknown) => e)

    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({
      status: 400,
      message: 'One or more validation errors occurred.',
      fieldErrors: { title: ['The Title field is required.'], description: ['Invalid JSON.'] },
    })
  })

  it('uses a generic message when the error body is not JSON', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('oops', { status: 500 })))

    await expect(apiClient.get('/issues')).rejects.toMatchObject({
      status: 500,
      message: 'Request failed with status 500.',
    })
  })

  it('reports network failures as status 0', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))

    await expect(apiClient.get('/issues')).rejects.toMatchObject({ name: 'ApiError', status: 0 })
  })

  it('rethrows aborts unchanged', async () => {
    const controller = new AbortController()
    controller.abort()
    const abortError = new DOMException('Aborted', 'AbortError')
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(abortError))

    await expect(apiClient.get('/issues', { signal: controller.signal })).rejects.toBe(abortError)
  })
})
