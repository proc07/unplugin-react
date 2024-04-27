export interface ReactQuery {
  react?: boolean
  src?: string
  type?: 'script' | 'template' | 'style' | 'custom'
  index?: number
  lang?: string
  raw?: boolean
  url?: boolean
  scoped?: boolean
  id?: string
}

export function parseReactRequest(id: string): {
  filename: string
  query: ReactQuery
} {
  const [filename, rawQuery] = id.split(`?`, 2)
  const query = Object.fromEntries(new URLSearchParams(rawQuery)) as ReactQuery
  if (query.react != null)
    query.react = true

  if (query.index != null)
    query.index = Number(query.index)

  if (query.raw != null)
    query.raw = true

  if (query.url != null)
    query.url = true

  if (query.scoped != null)
    query.scoped = true

  return {
    filename,
    query,
  }
}
