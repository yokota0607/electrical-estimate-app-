import { NextRequest, NextResponse } from 'next/server'
import sql from '@/lib/db'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const rows = await sql`
      SELECT * FROM payment_history WHERE ledger_id = ${Number(id)} ORDER BY payment_date ASC, created_at ASC
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
    const body = await request.json()
    const { payment_type, amount, payment_date, payer, notes } = body
    const [row] = await sql`
      INSERT INTO payment_history (ledger_id, payment_type, amount, payment_date, payer, notes)
      VALUES (${Number(id)}, ${payment_type || '着手金'}, ${Number(amount) || 0}, ${payment_date || ''}, ${payer || ''}, ${notes || ''})
      RETURNING *
    `
    return NextResponse.json(row, { status: 201 })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: '保存に失敗しました' }, { status: 500 })
  }
}
