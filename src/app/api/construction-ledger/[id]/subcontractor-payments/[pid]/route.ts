import { NextRequest, NextResponse } from 'next/server'
import sql from '@/lib/db'

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string; pid: string }> }) {
  try {
    const { pid } = await params
    const body = await request.json()
    const { company_name, amount, payment_date, description } = body

    const [row] = await sql`
      UPDATE subcontractor_payments
      SET company_name = ${company_name?.trim() || ''}, amount = ${Number(amount) || 0},
          payment_date = ${payment_date || ''}, description = ${description || ''}
      WHERE id = ${Number(pid)}
      RETURNING *
    `
    return NextResponse.json(row)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: '更新に失敗しました' }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string; pid: string }> }) {
  try {
    const { pid } = await params
    await sql`DELETE FROM subcontractor_payments WHERE id = ${Number(pid)}`
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: '削除に失敗しました' }, { status: 500 })
  }
}
