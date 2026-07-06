export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import sql from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const ledgerId = searchParams.get('ledger_id')
    const month = searchParams.get('month')
    const supplier = searchParams.get('supplier')

    let rows
    if (ledgerId) {
      rows = await sql`
        SELECT po.*, cl.project_name as ledger_project_name
        FROM purchase_orders po
        LEFT JOIN construction_ledger cl ON po.ledger_id = cl.id
        WHERE po.ledger_id = ${ledgerId}
        ORDER BY po.order_date DESC, po.created_at DESC
      `
    } else if (month && supplier) {
      rows = await sql`
        SELECT po.*, cl.project_name as ledger_project_name
        FROM purchase_orders po
        LEFT JOIN construction_ledger cl ON po.ledger_id = cl.id
        WHERE po.order_date LIKE ${month + '%'} AND po.supplier = ${supplier}
        ORDER BY po.order_date DESC, po.created_at DESC
      `
    } else if (month) {
      rows = await sql`
        SELECT po.*, cl.project_name as ledger_project_name
        FROM purchase_orders po
        LEFT JOIN construction_ledger cl ON po.ledger_id = cl.id
        WHERE po.order_date LIKE ${month + '%'}
        ORDER BY po.order_date DESC, po.created_at DESC
      `
    } else if (supplier) {
      rows = await sql`
        SELECT po.*, cl.project_name as ledger_project_name
        FROM purchase_orders po
        LEFT JOIN construction_ledger cl ON po.ledger_id = cl.id
        WHERE po.supplier = ${supplier}
        ORDER BY po.order_date DESC, po.created_at DESC
      `
    } else {
      rows = await sql`
        SELECT po.*, cl.project_name as ledger_project_name
        FROM purchase_orders po
        LEFT JOIN construction_ledger cl ON po.ledger_id = cl.id
        ORDER BY po.order_date DESC, po.created_at DESC
      `
    }
    return NextResponse.json(rows)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'データ取得に失敗しました' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      order_date, supplier, delivery_destination, ledger_id,
      project_name, delivery_date, notes, items
    } = body

    const today = order_date || new Date().toISOString().slice(0, 10)
    const countRows = await sql`SELECT COUNT(*) as cnt FROM purchase_orders WHERE order_date = ${today}`
    const seq = Number((countRows[0] as { cnt: string }).cnt) + 1
    const order_number = `PO-${today.replace(/-/g, '')}-${String(seq).padStart(3, '0')}`

    const total_amount = Array.isArray(items)
      ? items.reduce((s: number, i: { amount?: number; quantity?: number; unit_price?: number }) => s + (i.amount || (Number(i.quantity) || 0) * (Number(i.unit_price) || 0)), 0)
      : 0

    const [order] = await sql`
      INSERT INTO purchase_orders (order_number, order_date, supplier, delivery_destination, ledger_id, project_name, delivery_date, notes, total_amount)
      VALUES (
        ${order_number},
        ${today},
        ${supplier || 'たけでん'},
        ${delivery_destination || ''},
        ${ledger_id || null},
        ${project_name || ''},
        ${delivery_date || ''},
        ${notes || ''},
        ${total_amount}
      )
      RETURNING *
    `

    if (Array.isArray(items)) {
      for (let i = 0; i < items.length; i++) {
        const it = items[i]
        await sql`
          INSERT INTO purchase_order_items (order_id, unit_price_id, part_number, name, maker, unit, quantity, unit_price, amount, sort_order)
          VALUES (
            ${(order as { id: number }).id},
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

    return NextResponse.json(order, { status: 201 })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: '発注登録に失敗しました', detail: String(error) }, { status: 500 })
  }
}
