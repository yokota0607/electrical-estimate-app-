export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { parseToken } from '@/lib/auth'
import sql from '@/lib/db'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const rows = await sql`
      SELECT * FROM daily_reports WHERE ledger_id = ${Number(id)} ORDER BY report_date DESC, created_at DESC
    `
    return NextResponse.json(rows)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'データ取得に失敗しました' }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const cookieStore = await cookies()
    const token = cookieStore.get('session')?.value
    const user = token ? await parseToken(token) : null

    const body = await request.json()
    const { report_date, work_content, worker_name, work_hours } = body
    const [row] = await sql`
      INSERT INTO daily_reports (ledger_id, report_date, work_content, worker_name, work_hours, created_by)
      VALUES (${Number(id)}, ${report_date || ''}, ${work_content || ''}, ${worker_name || ''}, ${Number(work_hours) || 0}, ${user?.displayName || ''})
      RETURNING *
    `
    return NextResponse.json(row, { status: 201 })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: '保存に失敗しました' }, { status: 500 })
  }
}
