// 電綜・山内商事の請求書から拾った単価を単価表（unit_prices）に登録する。
//   node --experimental-strip-types scripts/import-supplier-prices.ts          ← 確認だけ（DBは変えない）
//   node --experimental-strip-types scripts/import-supplier-prices.ts --apply  ← 新規分を登録
// ・品番（品番なしは品名）＋発注先が同じ品目がすでにあれば登録せず、単価の違いを表示するだけ。
// ・同じ品番が別の発注先（たけでん等）で登録済みなら、別の行として登録し「他社あり」と表示する。
import { readFileSync, existsSync } from 'node:fs'
import { neon } from '@neondatabase/serverless'

for (const f of ['.env.local', '.env']) {
  if (!existsSync(f)) continue
  for (const line of readFileSync(f, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*"?(.*?)"?\s*$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2]
  }
}
const url = process.env.DATABASE_URL || process.env.POSTGRES_URL
if (!url) { console.error('DATABASE_URL が見つかりません'); process.exit(1) }
const sql = neon(url)
const apply = process.argv.includes('--apply')

type Item = { part_number: string; name: string; maker: string; unit: string; price: number; category: string; order_supplier: string; notes: string }
const items: Item[] = JSON.parse(readFileSync(new URL('./supplier-prices-2026.json', import.meta.url), 'utf8'))

const rows = await sql`SELECT id, part_number, name, price, order_supplier FROM unit_prices` as any[]
const norm = (s: string) => String(s || '').normalize('NFKC').replace(/\s+/g, '').toUpperCase()

let inserted = 0, skipped = 0
for (const it of items) {
  const key = it.part_number ? norm(it.part_number) : norm(it.name)
  const same = rows.filter(r => (it.part_number ? norm(r.part_number) : norm(r.name)) === key)
  const sameSupplier = same.find(r => r.order_supplier === it.order_supplier)
  const label = `[${it.order_supplier}] ${it.part_number || '(品番なし)'} ${it.name} ¥${it.price}`
  if (sameSupplier) {
    skipped++
    const diff = Number(sameSupplier.price) !== it.price ? `  ※登録済み単価 ¥${sameSupplier.price} と違う` : ''
    console.log(`登録済みスキップ  ${label}${diff}`)
    continue
  }
  const other = same.filter(r => r.order_supplier !== it.order_supplier)
  const otherNote = other.length ? `  （他社あり: ${other.map(r => `${r.order_supplier || '不明'} ¥${r.price}`).join(', ')}）` : ''
  console.log(`新規登録          ${label} → ${it.category}${otherNote}`)
  inserted++
  if (apply) {
    await sql`
      INSERT INTO unit_prices (name, category, unit, price, supplier, notes, part_number, maker, quantity_per_pack, order_supplier, nicknames)
      VALUES (${it.name}, ${it.category}, ${it.unit}, ${it.price}, '', ${it.notes}, ${it.part_number}, ${it.maker}, '', ${it.order_supplier}, '[]')
    `
  }
}
console.log(`\n新規 ${inserted}件 / 登録済みスキップ ${skipped}件` + (apply ? '（登録しました）' : '（確認のみ。登録するには --apply）'))
