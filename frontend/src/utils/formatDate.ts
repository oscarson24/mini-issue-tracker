const formatter = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' })

/** Formats an ISO timestamp in the viewer's locale and time zone. */
export function formatDate(iso: string): string {
  return formatter.format(new Date(iso))
}
