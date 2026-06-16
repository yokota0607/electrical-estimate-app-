import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { parseToken } from '@/lib/auth'

export async function GET() {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('session')?.value
    if (!token) return NextResponse.json({ error: '未認証' }, { status: 401 })
    const user = await parseToken(token)
    if (!user) return NextResponse.json({ error: '無効なセッション' }, { status: 401 })
    return NextResponse.json(user)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: '取得に失敗しました' }, { status: 500 })
  }
}
