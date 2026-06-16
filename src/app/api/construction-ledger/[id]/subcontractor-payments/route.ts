export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import sql from '@/lib/db'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const rows = await sql`
      SELECT * FROM subcontractor_payments WHERE ledger_id = ${Number(id)} ORDER BY payment_date ASC, created_at ASC
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
    const { company_name, amount, payment_date, description } = body

    if (!company_name?.trim()) {
      return NextResponse.json({ error: '外注先会社名は必須です' }, { status: 400 })
    }

    const [row] = await sql`
      INSERT INTO subcontractor_payments (ledger_id, company_name, amount, payment_date, description)
      VALUES (${Number(id)}, ${company_name.trim()}, ${Number(amount) || 0}, ${payment_date || ''}, ${description || ''})
      RETURNING *
    `
    return NextResponse.json(row, { status: 201 })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: '保存に失敗しました' }, { status: 500 })
  }
}
