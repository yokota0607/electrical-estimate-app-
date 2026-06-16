import { NextRequest, NextResponse } from 'next/server'
import sql from '@/lib/db'

export async function GET() {
  try {
    const estimates = await sql`
      SELECT e.*,
        COUNT(i.id) as item_count
      FROM estimates e
      LEFT JOIN estimate_items i ON i.estimate_id = e.id
      GROUP BY e.id
      ORDER BY e.created_at DESC
    `
    return NextResponse.json(estimates)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'データ取得に失敗しました' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { title, project_name, customer_name, pdf_filename, notes, created_by, items, tax_rate } = body

    if (!title) {
      return NextResponse.json({ error: '見積もりタイトルは必須です' }, { status: 400 })
    }

    const [estimate] = await sql`
      INSERT INTO estimates (title, project_name, customer_name, pdf_filename, notes, created_by, tax_rate, status)
      VALUES (${title}, ${project_name || ''}, ${customer_name || ''}, ${pdf_filename || ''},
              ${notes || ''}, ${created_by || ''}, ${tax_rate ?? 0.1}, 'draft')
      RETURNING *
    `

    let total = 0
    if (items && Array.isArray(items)) {
      for (let idx = 0; idx < items.length; idx++) {
        const item = items[idx]
        const amount = Number(item.quantity) * Number(item.unit_price)
        await sql`
          INSERT INTO estimate_items (estimate_id, name, category, quantity, unit, unit_price, amount, notes, sort_order)
          VALUES (${estimate.id}, ${item.name}, ${item.category || ''}, ${Number(item.quantity)},
                  ${item.unit}, ${Number(item.unit_price)}, ${amount}, ${item.notes || ''}, ${idx})
        `
        total += amount
      }
    }

    const [updated] = await sql`
      UPDATE estimates SET total_amount = ${total}, updated_at = NOW() WHERE id = ${estimate.id} RETURNING *
    `
    const estimateItems = await sql`SELECT * FROM estimate_items WHERE estimate_id = ${estimate.id} ORDER BY sort_order`

    return NextResponse.json({ estimate: updated, items: estimateItems }, { status: 201 })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: '保存に失敗しました' }, { status: 500 })
  }
}
