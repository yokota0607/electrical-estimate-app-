export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import sql from '@/lib/db'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const rows = await sql`
      SELECT cl.*, e.title as estimate_title
      FROM construction_ledger cl
      LEFT JOIN estimates e ON e.id = cl.estimate_id
      WHERE cl.id = ${Number(id)}
    `
    if (rows.length === 0) return NextResponse.json({ error: '見つかりません' }, { status: 404 })
    return NextResponse.json(rows[0])
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'データ取得に失敗しました' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
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

    const [row] = await sql`
      UPDATE construction_ledger SET
        project_name = ${project_name || ''}, client_name = ${client_name || ''},
        location = ${location || ''}, contract_amount = ${Number(contract_amount) || 0},
        advance_payment = ${Number(advance_payment) || 0}, advance_payment_date = ${advance_payment_date || ''},
        advance_payment_payer = ${advance_payment_payer || ''},
        interim_payment = ${Number(interim_payment) || 0}, interim_payment_date = ${interim_payment_date || ''},
        interim_payment_payer = ${interim_payment_payer || ''},
        final_payment = ${Number(final_payment) || 0}, final_payment_date = ${final_payment_date || ''},
        final_payment_payer = ${final_payment_payer || ''},
        total_amount = ${Number(total_amount) || 0},
        start_date = ${start_date || ''}, completion_date = ${completion_date || ''},
        completion_date_type = ${completion_date_type || '予定'}, description = ${description || ''},
        material_cost = ${Number(material_cost) || 0}, labor_cost = ${Number(labor_cost) || 0},
        subcontract_cost = ${Number(subcontract_cost) || 0},
        site_misc_cost = ${Number(site_misc_cost) || 0}, purchase_cost = ${Number(purchase_cost) || 0},
        status = ${status || '未着工'}, assigned_to = ${assigned_to || ''},
        payment_status = ${payment_status || '未入金'}, partial_payment_date = ${partial_payment_date || ''},
        notes = ${notes || ''}, estimate_id = ${estimate_id || null},
        updated_at = NOW()
      WHERE id = ${Number(id)}
      RETURNING *
    `
    return NextResponse.json(row)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: '更新に失敗しました' }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    await sql`DELETE FROM construction_ledger WHERE id = ${Number(id)}`
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: '削除に失敗しました' }, { status: 500 })
  }
}
