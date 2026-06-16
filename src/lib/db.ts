import { neon } from '@neondatabase/serverless'

// neon() sets up HTTP config only — no network connection at init time.
// Placeholder URL is used when DATABASE_URL is absent (e.g., Vercel build phase).
// Actual queries will fail at runtime if no real URL is configured.
const sql = neon(
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  'postgresql://placeholder:placeholder@placeholder.neon.tech/neondb'
)

export default sql
