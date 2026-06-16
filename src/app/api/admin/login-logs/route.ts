import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { parseToken } from '@/lib/auth'
import sql from '@/lib/db'

export async function GET() {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('session')?.value
    const user = token ? await parseToken(token) : null
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: '権限がありません' }, { status: 403 })
    }
    const rows = await sql`SELECT * FROM login_logs ORDER BY created_at DESC LIMIT 200`
    return NextResponse.json(rows)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: '取得に失敗しました' }, { status: 500 })
  }
}
