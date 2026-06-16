import { neon } from '@neondatabase/serverless'

// neon() must NEVER be called at module import time.
// Next.js imports all route modules during build — any module-level throw
// crashes the build worker ("Failed to collect page data for <first-route>").
// This lazy wrapper calls neon() only when the first SQL query runs.

let _sql: ReturnType<typeof neon> | undefined

function getSql(): ReturnType<typeof neon> {
  if (!_sql) {
    const url = process.env.DATABASE_URL || process.env.POSTGRES_URL
    if (!url) throw new Error('DATABASE_URL or POSTGRES_URL is not configured')
    _sql = neon(url)
  }
  return _sql
}

// Explicit return type avoids TypeScript resolving to the overload union
// "any[][] | Record<string,any>[] | FullQueryResults<boolean>" which
// makes numeric indexing (rows[0]) a type error.
const sql: (
  strings: TemplateStringsArray,
  ...values: unknown[]
) => Promise<Record<string, unknown>[]> = (strings, ...values) =>
  getSql()(strings, ...values) as Promise<Record<string, unknown>[]>

export default sql
