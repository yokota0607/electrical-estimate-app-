import { neon } from '@neondatabase/serverless'

// Lazy initialization: don't throw at module load time (causes Vercel build failure)
// The error will surface at query time if DATABASE_URL is missing
const getUrl = () =>
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  'postgresql://placeholder:placeholder@placeholder.neon.tech/neondb'

const sql = neon(getUrl())

export default sql
