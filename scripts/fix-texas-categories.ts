// テキサスから取り込んだ単価のカテゴリ・単位・入数を、商品区分をもとに付け直す。
// 対象：発注先が「たけでん」かつカテゴリが「電気工事材料」のままの品目だけ（手で分けた品目は触らない）。
//
// 使い方（プロジェクトのフォルダで）：
//   node --experimental-strip-types scripts/fix-texas-categories.ts          ← 確認だけ（DBは変えない）
//   node --experimental-strip-types scripts/fix-texas-categories.ts --apply  ← 実際に更新
// DATABASE_URL は環境変数か .env.local / .env から読む。
import { readFileSync, existsSync } from 'node:fs'
import { neon } from '@neondatabase/serverless'
import { texasCategory, texasUnit } from '../src/lib/texasCategory.ts'

for (const f of ['.env.local', '.env']) {
  if (!existsSync(f)) continue
  for (const line of readFileSync(f, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*"?(.*?)"?\s*$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2]
  }
}
const url = process.env.DATABASE_URL || process.env.POSTGRES_URL
if (!url) { console.error('DATABASE_URL が見つかりません（vercel env pull .env.local で取得できます）'); process.exit(1) }
const sql = neon(url)
const apply = process.argv.includes('--apply')

const items: [string, string, string, string, string][] =
  JSON.parse(readFileSync(new URL('./texas-items-2026.json', import.meta.url), 'utf8'))

const rows = await sql`SELECT id, part_number, name, category, unit, quantity_per_pack, order_supplier FROM unit_prices` as any[]
const byPn = new Map<string, any[]>(); const byName = new Map<string, any[]>()
for (const r of rows) {
  const pn = String(r.part_number || '').trim(); const nm = String(r.name || '').trim()
  if (pn) byPn.set(pn, [...(byPn.get(pn) || []), r])
  if (nm) byName.set(nm, [...(byName.get(nm) || []), r])
}

const summary = new Map<string, number>(); let changed = 0
for (const [pn, name, kubun, unitRaw, qpp] of items) {
  const targets = (pn ? byPn.get(pn) : byName.get(name)) || []
  for (const r of targets) {
    if (r.order_supplier !== 'たけでん' || r.category !== '電気工事材料') continue
    const cat = texasCategory(kubun, name)
    const unit = texasUnit(unitRaw)
    const newUnit = r.unit === '個' && unit !== '個' ? unit : r.unit
    const newQpp = r.quantity_per_pack ? r.quantity_per_pack : String(qpp || '').normalize('NFKC')
    if (cat === r.category && newUnit === r.unit && newQpp === (r.quantity_per_pack || '')) continue
    changed++
    summary.set(cat, (summary.get(cat) || 0) + 1)
    console.log(`${r.part_number || '(品番なし)'}  ${r.name}  →  ${cat}${newUnit !== r.unit ? ` / 単位 ${r.unit}→${newUnit}` : ''}`)
    if (apply) await sql`UPDATE unit_prices SET category = ${cat}, unit = ${newUnit}, quantity_per_pack = ${newQpp} WHERE id = ${r.id}`
  }
}
console.log('\n--- カテゴリ別件数 ---')
for (const [k, v] of summary) console.log(`${k}: ${v}件`)
console.log(apply ? `\n${changed}件を更新しました。` : `\n${changed}件が対象です（確認のみ。更新するには --apply を付けて実行）。`)
