import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { ApiError } from './services/apiClient'
import { issueService } from './services/issueService'
import { makeIssue } from './test/fixtures'

vi.mock('./services/issueService', () => ({
  issueService: { getAll: vi.fn(), getById: vi.fn(), create: vi.fn(), resolve: vi.fn() },
}))

const service = vi.mocked(issueService)

const openIssue = makeIssue({ id: 1, title: 'Login button not working' })
const resolvedIssue = makeIssue({
  id: 2,
  title: 'Fix typo',
  description: null,
  status: 'Resolved',
  updatedAt: '2026-10-02T09:00:00+00:00',
  resolvedAt: '2026-10-02T09:00:00+00:00',
})

function issueCard(title: string) {
  return screen.getByRole('article', { name: title })
}

describe('App', () => {
  beforeEach(() => {
    service.getAll.mockResolvedValue([openIssue, resolvedIssue])
  })

  it('lists issues with title, description, status and timestamps', async () => {
    render(<App />)

    const open = await screen.findByRole('article', { name: 'Login button not working' })
    expect(within(open).getByText('Open')).toBeInTheDocument()
    expect(within(open).getByText('Clicking login does nothing on Safari.')).toBeInTheDocument()
    expect(within(open).getByText('Created')).toBeInTheDocument()
    expect(within(open).getByText('Updated')).toBeInTheDocument()
    expect(within(open).getByRole('button', { name: 'Mark as resolved' })).toBeInTheDocument()

    const resolved = issueCard('Fix typo')
    expect(within(resolved).getByText('Resolved', { selector: 'span' })).toBeInTheDocument()
    expect(within(resolved).getByText('Resolved', { selector: 'dt' })).toBeInTheDocument()
    expect(within(resolved).getByText('No description')).toBeInTheDocument()
    expect(within(resolved).queryByRole('button', { name: 'Mark as resolved' })).not.toBeInTheDocument()
    expect(service.getAll).toHaveBeenCalledWith(undefined, expect.any(AbortSignal))
  })

  it('requests only the selected status when filtering', async () => {
    render(<App />)
    await screen.findByRole('article', { name: 'Login button not working' })

    service.getAll.mockResolvedValue([resolvedIssue])
    await userEvent.click(screen.getByRole('button', { name: 'Resolved' }))

    expect(service.getAll).toHaveBeenLastCalledWith('Resolved', expect.any(AbortSignal))
    expect(screen.getByRole('button', { name: 'Resolved' })).toHaveAttribute('aria-pressed', 'true')
    expect(await screen.findByRole('article', { name: 'Fix typo' })).toBeInTheDocument()
    expect(screen.queryByRole('article', { name: 'Login button not working' })).not.toBeInTheDocument()

    service.getAll.mockResolvedValue([openIssue])
    await userEvent.click(screen.getByRole('button', { name: 'Open' }))
    expect(service.getAll).toHaveBeenLastCalledWith('Open', expect.any(AbortSignal))
  })

  it('marks an issue as resolved', async () => {
    service.resolve.mockResolvedValue({
      ...openIssue,
      status: 'Resolved',
      updatedAt: '2026-10-02T10:00:00+00:00',
      resolvedAt: '2026-10-02T10:00:00+00:00',
    })
    render(<App />)

    const card = await screen.findByRole('article', { name: 'Login button not working' })
    await userEvent.click(within(card).getByRole('button', { name: 'Mark as resolved' }))

    expect(service.resolve).toHaveBeenCalledWith(1)
    const updated = issueCard('Login button not working')
    expect(within(updated).getByText('Resolved', { selector: 'span' })).toBeInTheDocument()
    expect(within(updated).queryByRole('button', { name: 'Mark as resolved' })).not.toBeInTheDocument()
  })

  it('removes a resolved issue from the Open view', async () => {
    service.getAll.mockResolvedValue([openIssue])
    service.resolve.mockResolvedValue({ ...openIssue, status: 'Resolved', resolvedAt: openIssue.createdAt })
    render(<App />)
    await screen.findByRole('article', { name: 'Login button not working' })
    await userEvent.click(screen.getByRole('button', { name: 'Open' }))

    await userEvent.click(await screen.findByRole('button', { name: 'Mark as resolved' }))

    expect(await screen.findByText('No open issues. Nice work!')).toBeInTheDocument()
  })

  it('shows an error on the item when resolving fails', async () => {
    service.resolve.mockRejectedValue(new ApiError(404, 'Not Found'))
    render(<App />)

    const card = await screen.findByRole('article', { name: 'Login button not working' })
    await userEvent.click(within(card).getByRole('button', { name: 'Mark as resolved' }))

    expect(await within(card).findByRole('alert')).toHaveTextContent('Not Found')
    expect(within(card).getByRole('button', { name: 'Mark as resolved' })).toBeEnabled()
  })

  it('adds a created issue to the top of the list', async () => {
    const created = makeIssue({ id: 3, title: 'Brand new issue', description: null })
    service.create.mockResolvedValue(created)
    render(<App />)
    await screen.findByRole('article', { name: 'Login button not working' })

    await userEvent.type(screen.getByLabelText(/title/i), 'Brand new issue')
    await userEvent.click(screen.getByRole('button', { name: /add issue/i }))

    expect(service.create).toHaveBeenCalledWith({ title: 'Brand new issue', description: undefined })
    const titles = within(screen.getByRole('list', { name: 'Issues' }))
      .getAllByRole('heading')
      .map((h) => h.textContent)
    expect(titles).toEqual(['Brand new issue', 'Login button not working', 'Fix typo'])
  })

  it('shows a retryable error when loading fails', async () => {
    service.getAll.mockRejectedValueOnce(new ApiError(0, 'Unable to reach the server.'))
    render(<App />)

    expect(await screen.findByRole('alert')).toHaveTextContent('Unable to reach the server.')

    await userEvent.click(screen.getByRole('button', { name: 'Retry' }))
    expect(await screen.findByRole('article', { name: 'Login button not working' })).toBeInTheDocument()
  })

  it('shows an empty state', async () => {
    service.getAll.mockResolvedValue([])
    render(<App />)

    expect(await screen.findByText(/no issues yet/i)).toBeInTheDocument()
  })
})
