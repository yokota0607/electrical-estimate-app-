export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import sql from '@/lib/db'

export async function GET() {
  try {
    const today = new Date().toISOString().slice(0, 10)
    const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10)

    const todayOrders = await sql`
      SELECT po.*, cl.project_name as ledger_project_name
      FROM purchase_orders po
      LEFT JOIN construction_ledger cl ON po.ledger_id = cl.id
      WHERE po.delivery_date = ${today} AND po.is_received = 0
      ORDER BY po.delivery_date
    `
    const tomorrowOrders = await sql`
      SELECT po.*, cl.project_name as ledger_project_name
      FROM purchase_orders po
      LEFT JOIN construction_ledger cl ON po.ledger_id = cl.id
      WHERE po.delivery_date = ${tomorrow} AND po.is_received = 0
      ORDER BY po.delivery_date
    `
    const overdueOrders = await sql`
      SELECT po.*, cl.project_name as ledger_project_name
      FROM purchase_orders po
      LEFT JOIN construction_ledger cl ON po.ledger_id = cl.id
      WHERE po.delivery_date < ${today} AND po.delivery_date != '' AND po.is_received = 0
      ORDER BY po.delivery_date
    `

    return NextResponse.json({ today: todayOrders, tomorrow: tomorrowOrders, overdue: overdueOrders })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'データ取得に失敗しました' }, { status: 500 })
  }
}
