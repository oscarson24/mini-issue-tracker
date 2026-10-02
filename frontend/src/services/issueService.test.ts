import { describe, expect, it, vi } from 'vitest'
import { jsonResponse, makeIssue } from '../test/fixtures'
import { issueService } from './issueService'

function stubFetch(body: unknown, status = 200) {
  const fetchMock = vi.fn().mockResolvedValue(jsonResponse(body, status))
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

describe('issueService', () => {
  it('getAll without a status lists every issue', async () => {
    const issues = [makeIssue()]
    const fetchMock = stubFetch(issues)

    await expect(issueService.getAll()).resolves.toEqual(issues)
    expect(fetchMock).toHaveBeenCalledWith('/api/issues', expect.objectContaining({ method: 'GET' }))
  })

  it('getAll with a status adds the query parameter', async () => {
    const fetchMock = stubFetch([])

    await issueService.getAll('Resolved')

    expect(fetchMock.mock.calls[0][0]).toBe('/api/issues?status=Resolved')
  })

  it('getById requests a single issue', async () => {
    const fetchMock = stubFetch(makeIssue({ id: 7 }))

    await expect(issueService.getById(7)).resolves.toMatchObject({ id: 7 })
    expect(fetchMock.mock.calls[0][0]).toBe('/api/issues/7')
  })

  it('create POSTs the new issue', async () => {
    const created = makeIssue({ id: 3, title: 'New' })
    const fetchMock = stubFetch(created, 201)

    await expect(issueService.create({ title: 'New', description: 'Details' })).resolves.toEqual(created)
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('/api/issues')
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body)).toEqual({ title: 'New', description: 'Details' })
  })

  it('resolve PATCHes the resolve endpoint without a body', async () => {
    const fetchMock = stubFetch(makeIssue({ id: 4, status: 'Resolved' }))

    await expect(issueService.resolve(4)).resolves.toMatchObject({ status: 'Resolved' })
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('/api/issues/4/resolve')
    expect(init.method).toBe('PATCH')
    expect(init.body).toBeUndefined()
  })
})
