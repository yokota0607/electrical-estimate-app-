import { NextResponse } from 'next/server'
import sql from '@/lib/db'
import { scryptSync, randomBytes } from 'crypto'

function hashPw(pw: string) {
  const salt = randomBytes(16).toString('hex')
  return `${salt}:${scryptSync(pw, salt, 64).toString('hex')}`
}

export async function POST() {
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS unit_prices (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        category TEXT NOT NULL DEFAULT '電気工事材料',
        unit TEXT NOT NULL DEFAULT '個',
        price REAL NOT NULL DEFAULT 0,
        supplier TEXT DEFAULT '',
        notes TEXT DEFAULT '',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `
    await sql`
      CREATE TABLE IF NOT EXISTS estimates (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        project_name TEXT DEFAULT '',
        customer_name TEXT DEFAULT '',
        pdf_filename TEXT DEFAULT '',
        status TEXT DEFAULT 'draft',
        total_amount REAL DEFAULT 0,
        tax_rate REAL DEFAULT 0.1,
        notes TEXT DEFAULT '',
        created_by TEXT DEFAULT '',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `
    await sql`
      CREATE TABLE IF NOT EXISTS estimate_items (
        id SERIAL PRIMARY KEY,
        estimate_id INTEGER NOT NULL REFERENCES estimates(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        category TEXT DEFAULT '',
        quantity REAL NOT NULL DEFAULT 1,
        unit TEXT NOT NULL DEFAULT '個',
        unit_price REAL DEFAULT 0,
        amount REAL DEFAULT 0,
        notes TEXT DEFAULT '',
        sort_order INTEGER DEFAULT 0
      )
    `
    await sql`
      CREATE TABLE IF NOT EXISTS business_cards (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL DEFAULT '',
        name_kana TEXT DEFAULT '',
        company TEXT DEFAULT '',
        department TEXT DEFAULT '',
        title TEXT DEFAULT '',
        email TEXT DEFAULT '',
        phone TEXT DEFAULT '',
        mobile TEXT DEFAULT '',
        fax TEXT DEFAULT '',
        postal_code TEXT DEFAULT '',
        address TEXT DEFAULT '',
        website TEXT DEFAULT '',
        qualifications TEXT DEFAULT '[]',
        industry TEXT DEFAULT '[]',
        transaction_type TEXT DEFAULT '',
        notes TEXT DEFAULT '',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `
    await sql`
      CREATE TABLE IF NOT EXISTS construction_ledger (
        id SERIAL PRIMARY KEY,
        construction_number TEXT NOT NULL,
        project_name TEXT NOT NULL,
        client_name TEXT DEFAULT '',
        location TEXT DEFAULT '',
        contract_amount REAL DEFAULT 0,
        start_date TEXT DEFAULT '',
        completion_date TEXT DEFAULT '',
        completion_date_type TEXT DEFAULT '予定',
        description TEXT DEFAULT '',
        material_cost REAL DEFAULT 0,
        labor_cost REAL DEFAULT 0,
        subcontract_cost REAL DEFAULT 0,
        site_misc_cost REAL DEFAULT 0,
        purchase_cost REAL DEFAULT 0,
        payment_status TEXT DEFAULT '未入金',
        partial_payment_date TEXT DEFAULT '',
        notes TEXT DEFAULT '',
        estimate_id INTEGER DEFAULT NULL REFERENCES estimates(id) ON DELETE SET NULL,
        advance_payment REAL DEFAULT 0,
        advance_payment_date TEXT DEFAULT '',
        advance_payment_payer TEXT DEFAULT '',
        interim_payment REAL DEFAULT 0,
        interim_payment_date TEXT DEFAULT '',
        interim_payment_payer TEXT DEFAULT '',
        final_payment REAL DEFAULT 0,
        final_payment_date TEXT DEFAULT '',
        final_payment_payer TEXT DEFAULT '',
        total_amount REAL DEFAULT 0,
        status TEXT DEFAULT '未着工',
        assigned_to TEXT DEFAULT '',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `
    await sql`
      CREATE TABLE IF NOT EXISTS industry_groups (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        sort_order INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        role TEXT DEFAULT 'staff',
        display_name TEXT DEFAULT '',
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `
    await sql`
      CREATE TABLE IF NOT EXISTS login_logs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER,
        username TEXT NOT NULL,
        action TEXT DEFAULT 'login',
        ip_address TEXT DEFAULT '',
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `
    await sql`
      CREATE TABLE IF NOT EXISTS construction_files (
        id SERIAL PRIMARY KEY,
        ledger_id INTEGER NOT NULL REFERENCES construction_ledger(id) ON DELETE CASCADE,
        stored_name TEXT NOT NULL,
        original_name TEXT NOT NULL,
        file_size INTEGER DEFAULT 0,
        mime_type TEXT DEFAULT '',
        uploaded_by TEXT DEFAULT '',
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `
    await sql`
      CREATE TABLE IF NOT EXISTS subcontractor_payments (
        id SERIAL PRIMARY KEY,
        ledger_id INTEGER NOT NULL REFERENCES construction_ledger(id) ON DELETE CASCADE,
        company_name TEXT NOT NULL DEFAULT '',
        amount REAL DEFAULT 0,
        payment_date TEXT DEFAULT '',
        description TEXT DEFAULT '',
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `
    await sql`
      CREATE TABLE IF NOT EXISTS payment_history (
        id SERIAL PRIMARY KEY,
        ledger_id INTEGER NOT NULL REFERENCES construction_ledger(id) ON DELETE CASCADE,
        payment_type TEXT DEFAULT '着手金',
        amount REAL DEFAULT 0,
        payment_date TEXT DEFAULT '',
        payer TEXT DEFAULT '',
        notes TEXT DEFAULT '',
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `
    await sql`
      CREATE TABLE IF NOT EXISTS construction_processes (
        id SERIAL PRIMARY KEY,
        ledger_id INTEGER NOT NULL REFERENCES construction_ledger(id) ON DELETE CASCADE,
        name TEXT NOT NULL DEFAULT '',
        weight REAL DEFAULT 0,
        is_completed INTEGER DEFAULT 0,
        sort_order INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `

    // Seed industry groups
    const igDefaults = ['電気工事', '水道', '内装', '建築', 'リフォーム', '空調', '銀行', '保険', '不動産', 'その他']
    for (let i = 0; i < igDefaults.length; i++) {
      await sql`INSERT INTO industry_groups (name, sort_order) VALUES (${igDefaults[i]}, ${i}) ON CONFLICT (name) DO NOTHING`
    }

    // Seed default users
    const adminExists = await sql`SELECT id FROM users WHERE username = 'admin'`
    if (adminExists.length === 0) {
      await sql`INSERT INTO users (username, password_hash, role, display_name) VALUES ('admin', ${hashPw('admin1234')}, 'admin', '社長')`
    }
    const staffExists = await sql`SELECT id FROM users WHERE username = 'staff'`
    if (staffExists.length === 0) {
      await sql`INSERT INTO users (username, password_hash, role, display_name) VALUES ('staff', ${hashPw('staff1234')}, 'staff', '事務員')`
    }

    return NextResponse.json({ ok: true, message: 'データベースを初期化しました' })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: '初期化に失敗しました', detail: String(error) }, { status: 500 })
  }
}
