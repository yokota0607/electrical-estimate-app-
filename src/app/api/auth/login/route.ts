export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import sql from '@/lib/db'
import { verifyPassword, createToken } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json()
    if (!username || !password) {
      return NextResponse.json({ error: 'ユーザー名とパスワードを入力してください' }, { status: 400 })
    }

    const users = await sql`SELECT * FROM users WHERE username = ${username}`
    const user = users[0] as {
      id: number; username: string; password_hash: string; role: string; display_name: string
    } | undefined

    if (!user || !verifyPassword(password, user.password_hash)) {
      return NextResponse.json({ error: 'ユーザー名またはパスワードが正しくありません' }, { status: 401 })
    }

    const token = await createToken({
      userId: user.id,
      username: user.username,
      displayName: user.display_name,
      role: user.role,
    })

    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || ''
    await sql`INSERT INTO login_logs (user_id, username, action, ip_address) VALUES (${user.id}, ${user.username}, 'login', ${ip})`

    const cookieStore = await cookies()
    cookieStore.set('session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60,
      path: '/',
    })

    return NextResponse.json({ ok: true, role: user.role, displayName: user.display_name })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'ログインに失敗しました' }, { status: 500 })
  }
}
