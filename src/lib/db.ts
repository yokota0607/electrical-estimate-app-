import { neon } from '@neondatabase/serverless'

const url = process.env.DATABASE_URL || process.env.POSTGRES_URL
if (!url) throw new Error('DATABASE_URL or POSTGRES_URL environment variable is required')

const sql = neon(url)

export default sql
