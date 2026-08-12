export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import sql from '@/lib/db'

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string; rid: string }> }) {
  try {
    const { rid } = await params
    const body = await request.json()
    const { report_date, work_content, worker_name, work_hours } = body
    const [row] = await sql`
      UPDATE daily_reports
      SET report_date = ${report_date || ''}, work_content = ${work_content || ''},
          worker_name = ${worker_name || ''}, work_hours = ${Number(work_hours) || 0}
      WHERE id = ${Number(rid)} RETURNING *
    `
    return NextResponse.json(row)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: '更新に失敗しました' }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string; rid: string }> }) {
  try {
    const { rid } = await params
    await sql`DELETE FROM daily_reports WHERE id = ${Number(rid)}`
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: '削除に失敗しました' }, { status: 500 })
  }
}
