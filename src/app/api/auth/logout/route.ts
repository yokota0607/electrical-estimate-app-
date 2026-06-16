import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { parseToken } from '@/lib/auth'
import db from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('session')?.value
    if (token) {
      const user = await parseToken(token)
      if (user) {
        const ip = request.headers.get('x-forwarded-for') || ''
        db.prepare('INSERT INTO login_logs (user_id, username, action, ip_address) VALUES (?,?,?,?)').run(
          user.userId, user.username, 'logout', ip
        )
      }
    }
    cookieStore.delete('session')
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'ログアウトに失敗しました' }, { status: 500 })
  }
}
