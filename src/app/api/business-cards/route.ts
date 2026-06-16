import { NextRequest, NextResponse } from 'next/server'
import sql from '@/lib/db'

function parseRow(r: Record<string, unknown>) {
  return {
    ...r,
    qualifications: (() => { try { return JSON.parse(r.qualifications as string || '[]') } catch { return [] } })(),
    industry: (() => { try { return JSON.parse(r.industry as string || '[]') } catch { return [] } })(),
  }
}

export async function GET() {
  try {
    const rows = await sql`SELECT * FROM business_cards ORDER BY company, name_kana, name`
    return NextResponse.json((rows as Record<string, unknown>[]).map(parseRow))
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'データ取得に失敗しました' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      name, name_kana, company, department, title,
      email, phone, mobile, fax, postal_code, address, website,
      qualifications, industry, transaction_type, notes,
    } = body

    const [row] = await sql`
      INSERT INTO business_cards
        (name, name_kana, company, department, title, email, phone, mobile, fax, postal_code, address, website, qualifications, industry, transaction_type, notes)
      VALUES (
        ${name || ''}, ${name_kana || ''},
        ${company || ''}, ${department || ''}, ${title || ''},
        ${email || ''}, ${phone || ''}, ${mobile || ''}, ${fax || ''},
        ${postal_code || ''}, ${address || ''}, ${website || ''},
        ${JSON.stringify(Array.isArray(qualifications) ? qualifications : [])},
        ${JSON.stringify(Array.isArray(industry) ? industry : [])},
        ${transaction_type || ''}, ${notes || ''}
      )
      RETURNING *
    `
    return NextResponse.json(parseRow(row as Record<string, unknown>), { status: 201 })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: '登録に失敗しました' }, { status: 500 })
  }
}
