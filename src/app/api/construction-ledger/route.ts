export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import sql from '@/lib/db'

export async function GET() {
  try {
    const rows = await sql`
      SELECT cl.*,
        e.title as estimate_title,
        COALESCE((SELECT SUM(amount) FROM payment_history WHERE ledger_id = cl.id), 0) as paid_amount
      FROM construction_ledger cl
      LEFT JOIN estimates e ON e.id = cl.estimate_id
      ORDER BY cl.created_at DESC
    `
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
      project_name, client_name, location, contract_amount,
      advance_payment, advance_payment_date, advance_payment_payer,
      interim_payment, interim_payment_date, interim_payment_payer,
      final_payment, final_payment_date, final_payment_payer,
      total_amount,
      start_date, completion_date, completion_date_type, description,
      material_cost, labor_cost, subcontract_cost, site_misc_cost, purchase_cost,
      status, assigned_to,
      payment_status, partial_payment_date, notes, estimate_id,
    } = body

    if (!project_name) {
      return NextResponse.json({ error: '工事名は必須です' }, { status: 400 })
    }

    const now = new Date()
    const yyyymm = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`
    const [countRow] = await sql`
      SELECT COUNT(*) as cnt FROM construction_ledger WHERE construction_number LIKE ${`K-${yyyymm}-%`}
    `
    const seq = String(Number(countRow.cnt) + 1).padStart(3, '0')
    const construction_number = `K-${yyyymm}-${seq}`

    const [row] = await sql`
      INSERT INTO construction_ledger
        (construction_number, project_name, client_name, location, contract_amount,
         advance_payment, advance_payment_date, advance_payment_payer,
         interim_payment, interim_payment_date, interim_payment_payer,
         final_payment, final_payment_date, final_payment_payer,
         total_amount,
         start_date, completion_date, completion_date_type, description,
         material_cost, labor_cost, subcontract_cost, site_misc_cost, purchase_cost,
         status, assigned_to,
         payment_status, partial_payment_date, notes, estimate_id)
      VALUES (
        ${construction_number}, ${project_name}, ${client_name || ''}, ${location || ''}, ${Number(contract_amount) || 0},
        ${Number(advance_payment) || 0}, ${advance_payment_date || ''}, ${advance_payment_payer || ''},
        ${Number(interim_payment) || 0}, ${interim_payment_date || ''}, ${interim_payment_payer || ''},
        ${Number(final_payment) || 0}, ${final_payment_date || ''}, ${final_payment_payer || ''},
        ${Number(total_amount) || 0},
        ${start_date || ''}, ${completion_date || ''}, ${completion_date_type || '予定'}, ${description || ''},
        ${Number(material_cost) || 0}, ${Number(labor_cost) || 0}, ${Number(subcontract_cost) || 0},
        ${Number(site_misc_cost) || 0}, ${Number(purchase_cost) || 0},
        ${status || '未着工'}, ${assigned_to || ''},
        ${payment_status || '未入金'}, ${partial_payment_date || ''}, ${notes || ''},
        ${estimate_id || null}
      )
      RETURNING *
    `
    return NextResponse.json(row, { status: 201 })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: '保存に失敗しました' }, { status: 500 })
  }
}
