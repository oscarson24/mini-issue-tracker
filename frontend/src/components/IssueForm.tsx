import { useState, type FormEvent } from 'react'
import { ApiError, type FieldErrors } from '../services/apiClient'
import { DESCRIPTION_MAX_LENGTH, TITLE_MAX_LENGTH, type CreateIssueRequest } from '../types/issue'

interface IssueFormProps {
  onCreate: (data: CreateIssueRequest) => Promise<unknown>
}

interface FormErrors {
  title?: string
  description?: string
  form?: string
}

function validate(title: string, description: string): FormErrors {
  const errors: FormErrors = {}
  if (!title.trim()) {
    errors.title = 'Title is required.'
  } else if (title.trim().length > TITLE_MAX_LENGTH) {
    errors.title = `Title must be ${TITLE_MAX_LENGTH} characters or fewer.`
  }
  if (description.trim().length > DESCRIPTION_MAX_LENGTH) {
    errors.description = `Description must be ${DESCRIPTION_MAX_LENGTH} characters or fewer.`
  }
  return errors
}

function fromServer(fieldErrors: FieldErrors, fallback: string): FormErrors {
  const errors: FormErrors = {
    title: fieldErrors.title?.[0],
    description: fieldErrors.description?.[0],
  }
  if (!errors.title && !errors.description) {
    errors.form = fallback
  }
  return errors
}

const inputClass =
  'mt-1 block w-full rounded-lg border-0 px-3 py-2 text-sm text-slate-900 shadow-sm ring-1 ring-inset placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:outline-none'

export function IssueForm({ onCreate }: IssueFormProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [errors, setErrors] = useState<FormErrors>({})
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const validationErrors = validate(title, description)
    setErrors(validationErrors)
    if (Object.keys(validationErrors).length > 0) {
      return
    }

    setSubmitting(true)
    try {
      await onCreate({ title: title.trim(), description: description.trim() || undefined })
      setTitle('')
      setDescription('')
    } catch (err) {
      setErrors(
        err instanceof ApiError
          ? fromServer(err.fieldErrors, err.message)
          : { form: 'Could not create the issue. Please try again.' },
      )
    } finally {
      setSubmitting(false)
    }
  }

  const ringFor = (hasError: boolean) =>
    hasError ? 'ring-red-300 focus:ring-red-500' : 'ring-slate-300 focus:ring-indigo-600'

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      aria-labelledby="new-issue-heading"
      className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"
    >
      <h2 id="new-issue-heading" className="text-base font-semibold text-slate-900">
        New issue
      </h2>

      <div className="mt-4">
        <label htmlFor="issue-title" className="block text-sm font-medium text-slate-700">
          Title <span className="text-red-500">*</span>
        </label>
        <input
          id="issue-title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={TITLE_MAX_LENGTH}
          placeholder="Short summary of the problem"
          aria-invalid={Boolean(errors.title)}
          aria-describedby={errors.title ? 'issue-title-error' : undefined}
          className={`${inputClass} ${ringFor(Boolean(errors.title))}`}
        />
        {errors.title && (
          <p id="issue-title-error" className="mt-1 text-sm text-red-600">
            {errors.title}
          </p>
        )}
      </div>

      <div className="mt-4">
        <div className="flex items-baseline justify-between">
          <label htmlFor="issue-description" className="block text-sm font-medium text-slate-700">
            Description
          </label>
          <span className="text-xs text-slate-400">
            {description.length}/{DESCRIPTION_MAX_LENGTH}
          </span>
        </div>
        <textarea
          id="issue-description"
          rows={4}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={DESCRIPTION_MAX_LENGTH}
          placeholder="Steps to reproduce, expected vs. actual behaviour…"
          aria-invalid={Boolean(errors.description)}
          aria-describedby={errors.description ? 'issue-description-error' : undefined}
          className={`${inputClass} resize-y ${ringFor(Boolean(errors.description))}`}
        />
        {errors.description && (
          <p id="issue-description-error" className="mt-1 text-sm text-red-600">
            {errors.description}
          </p>
        )}
      </div>

      {errors.form && (
        <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {errors.form}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="mt-5 w-full rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitting ? 'Adding…' : 'Add issue'}
      </button>
    </form>
  )
}
