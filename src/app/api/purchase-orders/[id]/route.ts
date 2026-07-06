export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import sql from '@/lib/db'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const [order] = await sql`
      SELECT po.*, cl.project_name as ledger_project_name
      FROM purchase_orders po
      LEFT JOIN construction_ledger cl ON po.ledger_id = cl.id
      WHERE po.id = ${id}
    `
    if (!order) return NextResponse.json({ error: '発注が見つかりません' }, { status: 404 })

    const items = await sql`
      SELECT * FROM purchase_order_items WHERE order_id = ${id} ORDER BY sort_order
    `
    return NextResponse.json({ ...order, items })
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

    // Fetch existing order to merge with partial updates
    const [existing] = await sql`SELECT * FROM purchase_orders WHERE id = ${id}`
    if (!existing) return NextResponse.json({ error: '発注が見つかりません' }, { status: 404 })

    const ex = existing as Record<string, unknown>
    const supplier = body.supplier ?? ex.supplier ?? 'たけでん'
    const delivery_destination = body.delivery_destination ?? ex.delivery_destination ?? ''
    const ledger_id = 'ledger_id' in body ? (body.ledger_id || null) : ex.ledger_id
    const project_name = body.project_name ?? ex.project_name ?? ''
    const delivery_date = body.delivery_date ?? ex.delivery_date ?? ''
    const notes = body.notes ?? ex.notes ?? ''
    const is_received = 'is_received' in body ? (body.is_received ? 1 : 0) : ex.is_received
    const received_at = body.received_at ?? ex.received_at ?? ''
    const items = body.items

    const total_amount = Array.isArray(items)
      ? items.reduce((s: number, i: { amount?: number; quantity?: number; unit_price?: number }) =>
          s + (Number(i.amount) || (Number(i.quantity) || 0) * (Number(i.unit_price) || 0)), 0)
      : Number(ex.total_amount) || 0

    const [order] = await sql`
      UPDATE purchase_orders
      SET supplier = ${supplier},
          delivery_destination = ${delivery_destination},
          ledger_id = ${ledger_id},
          project_name = ${project_name},
          delivery_date = ${delivery_date},
          notes = ${notes},
          is_received = ${is_received},
          received_at = ${received_at},
          total_amount = ${total_amount},
          updated_at = NOW()
      WHERE id = ${id}
      RETURNING *
    `

    if (Array.isArray(items)) {
      await sql`DELETE FROM purchase_order_items WHERE order_id = ${id}`
      for (let i = 0; i < items.length; i++) {
        const it = items[i]
        await sql`
          INSERT INTO purchase_order_items (order_id, unit_price_id, part_number, name, maker, unit, quantity, unit_price, amount, sort_order)
          VALUES (
            ${id},
            ${it.unit_price_id || null},
            ${it.part_number || ''},
            ${it.name || ''},
            ${it.maker || ''},
            ${it.unit || '個'},
            ${Number(it.quantity) || 1},
            ${Number(it.unit_price) || 0},
            ${Number(it.amount) || (Number(it.quantity || 1) * Number(it.unit_price || 0))},
            ${i}
          )
        `
      }
    }

    return NextResponse.json(order)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: '更新に失敗しました', detail: String(error) }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await sql`DELETE FROM purchase_orders WHERE id = ${id}`
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: '削除に失敗しました' }, { status: 500 })
  }
}
