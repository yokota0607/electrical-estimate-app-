export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import sql from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    if (!Array.isArray(body) || body.length === 0) {
      return NextResponse.json({ error: 'インポートデータが空です' }, { status: 400 })
    }

    for (const row of body) {
      await sql`
        INSERT INTO business_cards
          (name, name_kana, company, department, title, email, phone, mobile, fax,
           address, qualifications, industry, transaction_type, notes)
        VALUES (
          ${row.name || ''}, ${row.name_kana || ''}, ${row.company || ''}, ${row.department || ''},
          ${row.title || ''}, ${row.email || ''}, ${row.phone || ''}, ${row.mobile || ''}, ${row.fax || ''},
          ${row.address || ''},
          ${JSON.stringify(Array.isArray(row.qualifications) ? row.qualifications : [])},
          ${JSON.stringify(Array.isArray(row.industry) ? row.industry : [])},
          ${row.transaction_type || ''}, ${row.notes || ''}
        )
      `
    }

    return NextResponse.json({ count: body.length }, { status: 201 })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'インポートに失敗しました' }, { status: 500 })
  }
}
