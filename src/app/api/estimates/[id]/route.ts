export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import sql from '@/lib/db'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const [estimate] = await sql`SELECT * FROM estimates WHERE id = ${id}`
    if (!estimate) {
      return NextResponse.json({ error: '見積もりが見つかりません' }, { status: 404 })
    }
    const items = await sql`SELECT * FROM estimate_items WHERE estimate_id = ${id} ORDER BY sort_order`
    return NextResponse.json({ estimate, items })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'データ取得に失敗しました' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { title, project_name, customer_name, notes, status, tax_rate, items } = body

    await sql`DELETE FROM estimate_items WHERE estimate_id = ${id}`

    let total = 0
    if (items && Array.isArray(items)) {
      for (let idx = 0; idx < items.length; idx++) {
        const item = items[idx]
        const amount = Number(item.quantity) * Number(item.unit_price)
        await sql`
          INSERT INTO estimate_items (estimate_id, name, category, quantity, unit, unit_price, amount, notes, sort_order)
          VALUES (${id}, ${item.name}, ${item.category || ''}, ${Number(item.quantity)},
                  ${item.unit}, ${Number(item.unit_price)}, ${amount}, ${item.notes || ''}, ${idx})
        `
        total += amount
      }
    }

    const [estimate] = await sql`
      UPDATE estimates
      SET title = ${title}, project_name = ${project_name || ''}, customer_name = ${customer_name || ''},
          notes = ${notes || ''}, status = ${status || 'draft'}, tax_rate = ${tax_rate ?? 0.1},
          total_amount = ${total}, updated_at = NOW()
      WHERE id = ${id}
      RETURNING *
    `
    const updatedItems = await sql`SELECT * FROM estimate_items WHERE estimate_id = ${id} ORDER BY sort_order`
    return NextResponse.json({ estimate, items: updatedItems })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: '更新に失敗しました' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await sql`DELETE FROM estimates WHERE id = ${id}`
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: '削除に失敗しました' }, { status: 500 })
  }
}
