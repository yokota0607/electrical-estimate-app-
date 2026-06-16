import { NextRequest, NextResponse } from 'next/server'
import sql from '@/lib/db'

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string; pid: string }> }) {
  try {
    const { pid } = await params
    const body = await request.json()
    const { payment_type, amount, payment_date, payer, notes } = body
    const [row] = await sql`
      UPDATE payment_history SET
        payment_type = ${payment_type || '着手金'}, amount = ${Number(amount) || 0},
        payment_date = ${payment_date || ''}, payer = ${payer || ''}, notes = ${notes || ''}
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
    await sql`DELETE FROM payment_history WHERE id = ${Number(pid)}`
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: '削除に失敗しました' }, { status: 500 })
  }
}
