import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ApiError } from '../services/apiClient'
import { IssueForm } from './IssueForm'

describe('IssueForm', () => {
  it('requires a title and does not submit without one', async () => {
    const onCreate = vi.fn()
    render(<IssueForm onCreate={onCreate} />)

    await userEvent.type(screen.getByLabelText(/title/i), '   ')
    await userEvent.click(screen.getByRole('button', { name: /add issue/i }))

    expect(screen.getByText('Title is required.')).toBeInTheDocument()
    expect(screen.getByLabelText(/title/i)).toHaveAttribute('aria-invalid', 'true')
    expect(onCreate).not.toHaveBeenCalled()
  })

  it('submits trimmed values and clears the form on success', async () => {
    const onCreate = vi.fn().mockResolvedValue(undefined)
    render(<IssueForm onCreate={onCreate} />)

    await userEvent.type(screen.getByLabelText(/title/i), '  Broken link  ')
    await userEvent.type(screen.getByLabelText(/description/i), '  Footer link 404s  ')
    await userEvent.click(screen.getByRole('button', { name: /add issue/i }))

    expect(onCreate).toHaveBeenCalledWith({ title: 'Broken link', description: 'Footer link 404s' })
    expect(screen.getByLabelText(/title/i)).toHaveValue('')
    expect(screen.getByLabelText(/description/i)).toHaveValue('')
  })

  it('omits an empty description', async () => {
    const onCreate = vi.fn().mockResolvedValue(undefined)
    render(<IssueForm onCreate={onCreate} />)

    await userEvent.type(screen.getByLabelText(/title/i), 'Only a title')
    await userEvent.click(screen.getByRole('button', { name: /add issue/i }))

    expect(onCreate).toHaveBeenCalledWith({ title: 'Only a title', description: undefined })
  })

  it('shows server validation errors next to the field and keeps the input', async () => {
    const onCreate = vi
      .fn()
      .mockRejectedValue(new ApiError(400, 'Validation failed', { title: ['Title is already taken.'] }))
    render(<IssueForm onCreate={onCreate} />)

    await userEvent.type(screen.getByLabelText(/title/i), 'Duplicate')
    await userEvent.click(screen.getByRole('button', { name: /add issue/i }))

    expect(await screen.findByText('Title is already taken.')).toBeInTheDocument()
    expect(screen.getByLabelText(/title/i)).toHaveValue('Duplicate')
  })

  it('shows a general error when the server is unreachable', async () => {
    const onCreate = vi.fn().mockRejectedValue(new ApiError(0, 'Unable to reach the server.'))
    render(<IssueForm onCreate={onCreate} />)

    await userEvent.type(screen.getByLabelText(/title/i), 'Anything')
    await userEvent.click(screen.getByRole('button', { name: /add issue/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Unable to reach the server.')
  })
})
