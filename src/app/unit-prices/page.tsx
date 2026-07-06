'use client'

import React, { useEffect, useState, useRef } from 'react'
import { Plus, Search, Trash2, Pencil, Check, X, Download, Upload, Tag, ShoppingCart, ChevronDown, ChevronUp } from 'lucide-react'

interface UnitPrice {
  id: number
  name: string
  part_number: string
  category: string
  maker: string
  unit: string
  price: number
  quantity_per_pack: string
  order_supplier: string
  nicknames: string
  supplier: string
  notes: string
  updated_at: string
}

interface CartItem {
  unitPrice: UnitPrice
  quantity: number
}

const CATEGORIES = [
  '電線・ケーブル', '配管・電線管', '照明器具', 'コンセント・スイッチ',
  '分電盤・ブレーカー', '動力設備', '通信・弱電設備', '接地工事', '電気工事材料', 'その他'
]
const UNITS = ['m', '本', '個', '台', '組', '式', 'ヶ所', 'セット', 'kg', '枚', 'ｍ']

const BLANK = {
  name: '', part_number: '', category: '電気工事材料', maker: '', unit: '個',
  price: 0, quantity_per_pack: '', order_supplier: 'たけでん', nicknames: [] as string[], supplier: '', notes: ''
}

function formatCurrency(n: number) {
  return new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(n)
}

function parseNicknames(raw: string | string[] | null | undefined): string[] {
  if (!raw) return []
  if (Array.isArray(raw)) return raw
  try { const p = JSON.parse(raw); return Array.isArray(p) ? p : [] } catch { return raw ? [raw] : [] }
}

export default function UnitPricesPage() {
  const [prices, setPrices] = useState<UnitPrice[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [editingId, setEditingId] = useState<number | 'new' | null>(null)
  const [form, setForm] = useState(BLANK)
  const [nicknameInput, setNicknameInput] = useState('')
  const [saving, setSaving] = useState(false)
  const [importLoading, setImportLoading] = useState(false)
  const [cart, setCart] = useState<CartItem[]>([])
  const [showCart, setShowCart] = useState(false)
  const [showOrderModal, setShowOrderModal] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const load = () => {
    setLoading(true)
    const q = search ? `?search=${encodeURIComponent(search)}` : ''
    fetch(`/api/unit-prices${q}`)
      .then(r => r.json())
      .then(data => setPrices(Array.isArray(data) ? data : []))
      .catch(() => setPrices([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [search])

  // カテゴリフィルター（クライアント側）
  const filtered = categoryFilter === 'all'
    ? prices
    : prices.filter(p => p.category === categoryFilter)

  // グルーピング：既知カテゴリ→不明カテゴリの順
  const grouped: Record<string, UnitPrice[]> = {}
  for (const cat of CATEGORIES) {
    const items = filtered.filter(p => p.category === cat)
    if (items.length > 0) grouped[cat] = items
  }
  // 既知カテゴリに入らなかった分はそのまま category 名でグループ
  const unknownItems = filtered.filter(p => !CATEGORIES.includes(p.category))
  if (unknownItems.length > 0) {
    // 商品区分コードごとにまとめる
    for (const item of unknownItems) {
      const key = item.category || 'その他'
      if (!grouped[key]) grouped[key] = []
      grouped[key].push(item)
    }
  }

  const groupEntries = Object.entries(grouped)

  const startEdit = (p: UnitPrice) => {
    setEditingId(p.id)
    setForm({
      name: p.name, part_number: p.part_number || '', category: p.category,
      maker: p.maker || '', unit: p.unit, price: p.price,
      quantity_per_pack: p.quantity_per_pack || '', order_supplier: p.order_supplier || 'たけでん',
      nicknames: parseNicknames(p.nicknames), supplier: p.supplier || '', notes: p.notes || ''
    })
    setNicknameInput('')
  }

  const startNew = () => { setEditingId('new'); setForm(BLANK); setNicknameInput('') }
  const cancelEdit = () => { setEditingId(null); setForm(BLANK) }

  const addNickname = () => {
    const v = nicknameInput.trim()
    if (v && !form.nicknames.includes(v)) setForm(f => ({ ...f, nicknames: [...f.nicknames, v] }))
    setNicknameInput('')
  }
  const removeNickname = (n: string) => setForm(f => ({ ...f, nicknames: f.nicknames.filter(x => x !== n) }))

  const handleSave = async () => {
    if (!form.name) { alert('材料名を入力してください'); return }
    setSaving(true)
    try {
      const payload = { ...form }
      if (editingId === 'new') {
        await fetch('/api/unit-prices', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      } else {
        await fetch(`/api/unit-prices/${editingId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      }
      setEditingId(null)
      load()
    } finally { setSaving(false) }
  }

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`「${name}」を削除しますか？`)) return
    await fetch(`/api/unit-prices/${id}`, { method: 'DELETE' })
    load()
  }

  const handleXlsxImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!confirm(`「${file.name}」からデータを取り込みます。発注先は全てたけでんとして登録します。`)) return
    setImportLoading(true)
    try {
      const XLSX = await import('xlsx')
      const buf = await file.arrayBuffer()
      const wb = XLSX.read(buf, { type: 'array' })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as unknown[][]
      let headerIdx = -1
      for (let i = 0; i < Math.min(5, data.length); i++) {
        if (data[i] && (data[i] as string[]).includes('品番')) { headerIdx = i; break }
      }
      if (headerIdx === -1) { alert('ヘッダー行（品番）が見つかりません'); return }
      const header = data[headerIdx] as string[]
      const col = (name: string) => header.findIndex(h => String(h).includes(name))
      const pnC = col('品番'), nmC = col('品名'), mkC = col('メーカー'), utC = col('単位'), qC = col('入数'), prC = col('単価'), caC = col('商品区分')
      const seen = new Set<string>()
      const items = []
      for (let i = headerIdx + 1; i < data.length; i++) {
        const row = data[i] as unknown[]
        const pn = String(row[pnC] || '').trim()
        const nm = String(row[nmC] || '').trim()
        if (!nm) continue
        if (pn && seen.has(pn)) continue
        if (pn) seen.add(pn)
        items.push({
          part_number: pn, name: nm, maker: String(row[mkC] || '').trim(),
          unit: String(row[utC] || '').trim() || '個', quantity_per_pack: String(row[qC] || '').trim(),
          price: Number(row[prC]) || 0, category: String(row[caC] || '').trim() || '電気工事材料',
          order_supplier: 'たけでん',
        })
      }
      const res = await fetch('/api/unit-prices/import', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ items }) })
      const result = await res.json()
      if (result.ok) { alert(`取り込み完了：${result.inserted}件追加、${result.skipped}件スキップ（品番重複）`); load() }
      else alert('取り込みに失敗しました: ' + result.error)
    } finally {
      setImportLoading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const exportCSV = () => {
    const header = 'ID,品番,材料名,メーカー,カテゴリ,単位,単価,入数,発注先,通称,備考\n'
    const rows = prices.map(p => {
      const nicks = parseNicknames(p.nicknames).join('/')
      return `${p.id},"${p.part_number || ''}","${p.name}","${p.maker || ''}","${p.category}","${p.unit}",${p.price},"${p.quantity_per_pack || ''}","${p.order_supplier || ''}","${nicks}","${p.notes || ''}"`
    }).join('\n')
    const blob = new Blob(['﻿' + header + rows], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = '単価表.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  const toggleCart = (p: UnitPrice) => {
    setCart(c => c.some(i => i.unitPrice.id === p.id)
      ? c.filter(i => i.unitPrice.id !== p.id)
      : [...c, { unitPrice: p, quantity: 1 }])
  }
  const isInCart = (id: number) => cart.some(i => i.unitPrice.id === id)
  const updateQty = (id: number, qty: number) => setCart(c => c.map(i => i.unitPrice.id === id ? { ...i, quantity: qty } : i))

  const cartTotal = cart.reduce((s, i) => s + i.unitPrice.price * i.quantity, 0)

  // インライン編集フォーム行
  const EditRow = () => (
    <tr className="bg-blue-50">
      <td className="px-3 py-2"></td>
      <td className="px-3 py-2">
        <input className="input text-xs w-24" placeholder="品番" value={form.part_number}
          onChange={e => setForm(f => ({ ...f, part_number: e.target.value }))} />
      </td>
      <td className="px-3 py-2">
        <input className="input text-xs" placeholder="材料名 *" value={form.name}
          onChange={e => setForm(f => ({ ...f, name: e.target.value }))} autoFocus />
      </td>
      <td className="px-3 py-2">
        <input className="input text-xs" placeholder="メーカー" value={form.maker}
          onChange={e => setForm(f => ({ ...f, maker: e.target.value }))} />
      </td>
      <td className="px-3 py-2">
        <select className="input text-xs" value={form.category}
          onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
          {CATEGORIES.map(c => <option key={c}>{c}</option>)}
        </select>
      </td>
      <td className="px-3 py-2">
        <select className="input text-xs" value={form.unit}
          onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}>
          {UNITS.map(u => <option key={u}>{u}</option>)}
        </select>
      </td>
      <td className="px-3 py-2">
        <input type="number" min="0" className="input text-xs text-right w-24" placeholder="0" value={form.price}
          onChange={e => setForm(f => ({ ...f, price: parseFloat(e.target.value) || 0 }))} />
      </td>
      <td className="px-3 py-2">
        <input className="input text-xs w-20" placeholder="入数" value={form.quantity_per_pack}
          onChange={e => setForm(f => ({ ...f, quantity_per_pack: e.target.value }))} />
      </td>
      <td className="px-3 py-2">
        <input className="input text-xs w-24" placeholder="発注先" value={form.order_supplier}
          onChange={e => setForm(f => ({ ...f, order_supplier: e.target.value }))} />
      </td>
      <td className="px-3 py-2">
        <div className="flex flex-wrap gap-1 items-center">
          {form.nicknames.map(n => (
            <span key={n} className="inline-flex items-center gap-0.5 bg-yellow-100 text-yellow-800 text-xs px-1.5 py-0.5 rounded">
              {n}<button type="button" onClick={() => removeNickname(n)}><X className="h-2.5 w-2.5" /></button>
            </span>
          ))}
          <input className="input text-xs w-20" placeholder="追加" value={nicknameInput}
            onChange={e => setNicknameInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addNickname() } }} />
          <button type="button" onClick={addNickname} className="text-xs text-blue-500 hover:text-blue-700">+</button>
        </div>
      </td>
      <td className="px-3 py-2">
        <div className="flex gap-1">
          <button onClick={handleSave} disabled={saving}
            className="p-1.5 bg-green-500 text-white rounded hover:bg-green-600">
            <Check className="h-3.5 w-3.5" />
          </button>
          <button onClick={cancelEdit} className="p-1.5 bg-gray-200 text-gray-600 rounded hover:bg-gray-300">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </td>
    </tr>
  )

  return (
    <div className="p-4 sm:p-8">
      {/* Header */}
      <div className="mb-5 sm:mb-6">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900">単価表管理</h2>
            <p className="text-gray-500 text-sm mt-1">全{prices.length}件 / 表示{filtered.length}件</p>
          </div>
          <div className="flex flex-wrap gap-2 justify-end">
            <input ref={fileInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleXlsxImport} />
            <button onClick={() => fileInputRef.current?.click()} disabled={importLoading}
              className="btn-secondary flex items-center gap-1.5 text-sm px-3">
              <Upload className="h-4 w-4" />{importLoading ? '取込中...' : 'xlsx取込'}
            </button>
            <button onClick={exportCSV} className="btn-secondary flex items-center gap-1.5 text-sm px-3">
              <Download className="h-4 w-4" /><span className="hidden sm:inline">CSV出力</span>
            </button>
            {cart.length > 0 && (
              <button onClick={() => setShowOrderModal(true)}
                className="btn-primary flex items-center gap-1.5 text-sm px-3 relative">
                <ShoppingCart className="h-4 w-4" />発注書作成
                <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                  {cart.length}
                </span>
              </button>
            )}
            <button onClick={startNew} className="btn-primary flex items-center gap-1.5 text-sm px-3">
              <Plus className="h-4 w-4" />新規登録
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mb-5 sm:mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input className="input pl-9" placeholder="品番・品名・通称で検索"
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="input sm:w-48" value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}>
          <option value="all">すべてのカテゴリ</option>
          {CATEGORIES.map(c => <option key={c}>{c}</option>)}
        </select>
      </div>

      {/* Cart */}
      {cart.length > 0 && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium text-blue-800 text-sm">発注カート（{cart.length}品目）合計: {formatCurrency(cartTotal)}</span>
            <button onClick={() => setShowCart(s => !s)} className="text-blue-600 text-xs flex items-center gap-1">
              {showCart ? <><ChevronUp className="h-3 w-3" />閉じる</> : <><ChevronDown className="h-3 w-3" />明細</>}
            </button>
          </div>
          {showCart && (
            <div className="space-y-1">
              {cart.map(item => (
                <div key={item.unitPrice.id} className="flex items-center gap-2 text-xs">
                  <span className="flex-1 text-gray-700">{item.unitPrice.name}</span>
                  <input type="number" min="1" value={item.quantity}
                    onChange={e => updateQty(item.unitPrice.id, Number(e.target.value) || 1)}
                    className="input text-xs w-16 text-right py-0.5" />
                  <span className="text-gray-500 w-12">{item.unitPrice.unit}</span>
                  <span className="w-24 text-right text-gray-800">{formatCurrency(item.unitPrice.price * item.quantity)}</span>
                  <button onClick={() => toggleCart(item.unitPrice)} className="text-red-400 hover:text-red-600">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Table */}
      <div className="card">
        {loading ? (
          <div className="p-12 text-center text-gray-400">読み込み中...</div>
        ) : prices.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <Tag className="h-12 w-12 mx-auto mb-3 opacity-20" />
            <p className="font-medium mb-2">単価が登録されていません</p>
            <div className="flex gap-2 justify-center">
              <button onClick={() => fileInputRef.current?.click()} className="btn-secondary text-sm">xlsxから取込む</button>
              <button onClick={startNew} className="btn-primary text-sm">手動で登録する</button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-2 py-3 w-8"></th>
                  <th className="text-left px-2 py-3 text-gray-400 font-medium w-32">品番</th>
                  <th className="text-left px-2 py-3 text-gray-400 font-medium" style={{minWidth:'220px'}}>品名</th>
                  <th className="text-left px-2 py-3 text-gray-400 font-medium w-28">メーカー</th>
                  <th className="text-left px-2 py-3 text-gray-400 font-medium w-28">カテゴリ</th>
                  <th className="text-left px-2 py-3 text-gray-400 font-medium w-12">単位</th>
                  <th className="text-right px-2 py-3 text-gray-400 font-medium w-24">単価</th>
                  <th className="text-left px-2 py-3 text-gray-400 font-medium w-16">入数</th>
                  <th className="text-left px-2 py-3 text-gray-400 font-medium w-20">発注先</th>
                  <th className="text-left px-2 py-3 text-gray-400 font-medium w-24">通称</th>
                  <th className="px-2 py-3 w-16"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {editingId === 'new' && <EditRow />}
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="px-4 py-8 text-center text-gray-400">
                      検索条件に一致する単価がありません
                    </td>
                  </tr>
                ) : groupEntries.length > 0 ? (
                  groupEntries.map(([cat, items]) => (
                    <React.Fragment key={cat}>
                      <tr className="bg-gray-50">
                        <td colSpan={11} className="px-3 py-2 text-xs font-semibold text-gray-500 tracking-wider">
                          {cat} ({items.length})
                        </td>
                      </tr>
                      {items.map(p => (
                        editingId === p.id ? (
                          <EditRow key={p.id} />
                        ) : (
                          <tr key={p.id} className={`hover:bg-gray-50 group transition-colors ${isInCart(p.id) ? 'bg-blue-50' : ''}`}>
                            <td className="px-2 py-2.5 text-center">
                              <input type="checkbox" checked={isInCart(p.id)} onChange={() => toggleCart(p)}
                                className="w-4 h-4 rounded border-gray-300 text-blue-600 cursor-pointer" />
                            </td>
                            <td className="px-2 py-2.5 font-mono text-xs text-gray-500">{p.part_number || '—'}</td>
                            <td className="px-2 py-2.5 font-medium text-gray-900" style={{minWidth:'220px'}}>{p.name}</td>
                            <td className="px-2 py-2.5 text-gray-500 text-xs">{p.maker || '—'}</td>
                            <td className="px-2 py-2.5 text-gray-500 text-xs">{p.category}</td>
                            <td className="px-2 py-2.5 text-gray-500 text-xs">{p.unit}</td>
                            <td className="px-2 py-2.5 text-right font-semibold text-gray-900">{formatCurrency(p.price)}</td>
                            <td className="px-2 py-2.5 text-gray-500 text-xs">{p.quantity_per_pack || '—'}</td>
                            <td className="px-2 py-2.5 text-gray-500 text-xs">{p.order_supplier || 'たけでん'}</td>
                            <td className="px-2 py-2.5">
                              <div className="flex flex-wrap gap-1">
                                {parseNicknames(p.nicknames).map(n => (
                                  <span key={n} className="bg-yellow-100 text-yellow-700 text-xs px-1.5 py-0.5 rounded">{n}</span>
                                ))}
                              </div>
                            </td>
                            <td className="px-2 py-2.5">
                              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => startEdit(p)} className="p-1.5 text-gray-400 hover:text-blue-600 rounded">
                                  <Pencil className="h-3.5 w-3.5" />
                                </button>
                                <button onClick={() => handleDelete(p.id, p.name)} className="p-1.5 text-gray-400 hover:text-red-600 rounded">
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        )
                      ))}
                    </React.Fragment>
                  ))
                ) : (
                  // groupEntriesが空でfiltered > 0の場合（フォールバック：フラットリスト）
                  filtered.map(p => (
                    <tr key={p.id} className="hover:bg-gray-50 group">
                      <td className="px-3 py-2.5 text-center">
                        <input type="checkbox" checked={isInCart(p.id)} onChange={() => toggleCart(p)}
                          className="w-4 h-4 rounded border-gray-300 text-blue-600 cursor-pointer" />
                      </td>
                      <td className="px-3 py-2.5 font-mono text-xs text-gray-500">{p.part_number || '—'}</td>
                      <td className="px-3 py-2.5 font-medium text-gray-900 min-w-64">{p.name}</td>
                      <td className="px-3 py-2.5 text-gray-500 text-xs">{p.maker || '—'}</td>
                      <td className="px-3 py-2.5 text-gray-500 text-xs">{p.category}</td>
                      <td className="px-3 py-2.5 text-gray-500 text-xs">{p.unit}</td>
                      <td className="px-3 py-2.5 text-right font-semibold text-gray-900">{formatCurrency(p.price)}</td>
                      <td className="px-3 py-2.5 text-gray-500 text-xs">{p.quantity_per_pack || '—'}</td>
                      <td className="px-3 py-2.5 text-gray-500 text-xs">{p.order_supplier || 'たけでん'}</td>
                      <td className="px-3 py-2.5">
                        <div className="flex flex-wrap gap-1">
                          {parseNicknames(p.nicknames).map(n => (
                            <span key={n} className="bg-yellow-100 text-yellow-700 text-xs px-1.5 py-0.5 rounded">{n}</span>
                          ))}
                        </div>
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => startEdit(p)} className="p-1.5 text-gray-400 hover:text-blue-600 rounded">
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button onClick={() => handleDelete(p.id, p.name)} className="p-1.5 text-gray-400 hover:text-red-600 rounded">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Order Modal */}
      {showOrderModal && (
        <OrderModal cart={cart} onClose={() => setShowOrderModal(false)}
          onSuccess={() => { setCart([]); setShowOrderModal(false) }} />
      )}
    </div>
  )
}

interface Ledger { id: number; project_name: string; construction_number: string }

function OrderModal({ cart, onClose, onSuccess }: { cart: CartItem[]; onClose: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState({
    order_date: new Date().toISOString().slice(0, 10),
    supplier: 'たけでん', delivery_destination: '', ledger_id: '', delivery_date: '', notes: '',
  })
  const [ledgers, setLedgers] = useState<Ledger[]>([])
  // 数量は文字列で管理（途中入力を妨げないため）
  const [qtyStr, setQtyStr] = useState<Record<number, string>>(
    Object.fromEntries(cart.map(i => [i.unitPrice.id, String(i.quantity)]))
  )
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch('/api/construction-ledger').then(r => r.json()).then(d => setLedgers(Array.isArray(d) ? d : []))
  }, [])

  const getQty = (id: number) => Math.max(1, parseInt(qtyStr[id] || '1') || 1)

  const items = cart.map(i => {
    const qty = getQty(i.unitPrice.id)
    return {
      unit_price_id: i.unitPrice.id,
      part_number: i.unitPrice.part_number || '',
      name: i.unitPrice.name,
      maker: i.unitPrice.maker || '',
      unit: i.unitPrice.unit,
      quantity: qty,
      unit_price: i.unitPrice.price,
      amount: i.unitPrice.price * qty,
    }
  })
  const total = items.reduce((s, i) => s + i.amount, 0)

  const handleSubmit = async () => {
    if (!form.supplier) { alert('発注先を入力してください'); return }
    setSaving(true)
    try {
      const ledger = ledgers.find(l => String(l.id) === form.ledger_id)
      const res = await fetch('/api/purchase-orders', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, ledger_id: form.ledger_id ? Number(form.ledger_id) : null, project_name: ledger?.project_name || '', items })
      })
      if (!res.ok) throw new Error('failed')
      const order = await res.json()
      printOrderPDF(order, items, form, ledger)
      onSuccess()
    } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b">
          <h3 className="text-lg font-bold">発注書作成</h3>
          <button onClick={onClose}><X className="h-5 w-5 text-gray-400" /></button>
        </div>
        <div className="overflow-y-auto p-5 space-y-4 flex-1">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">発注日</label>
              <input type="date" className="input" value={form.order_date}
                onChange={e => setForm(f => ({ ...f, order_date: e.target.value }))} /></div>
            <div><label className="label">発注先</label>
              <input className="input" value={form.supplier}
                onChange={e => setForm(f => ({ ...f, supplier: e.target.value }))} /></div>
            <div><label className="label">納品先</label>
              <input className="input" placeholder="納品先住所・現場名" value={form.delivery_destination}
                onChange={e => setForm(f => ({ ...f, delivery_destination: e.target.value }))} /></div>
            <div><label className="label">納品予定日</label>
              <input type="date" className="input" value={form.delivery_date}
                onChange={e => setForm(f => ({ ...f, delivery_date: e.target.value }))} /></div>
            <div className="col-span-2"><label className="label">現場（工事台帳と紐付け）</label>
              <select className="input" value={form.ledger_id}
                onChange={e => setForm(f => ({ ...f, ledger_id: e.target.value }))}>
                <option value="">未指定</option>
                {ledgers.map(l => <option key={l.id} value={l.id}>{l.construction_number} {l.project_name}</option>)}
              </select></div>
            <div className="col-span-2"><label className="label">備考</label>
              <textarea className="input" rows={2} value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></div>
          </div>
          <div>
            <h4 className="font-medium text-sm text-gray-700 mb-2">発注品目</h4>
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-3 py-2 text-gray-500">品名</th>
                    <th className="text-right px-3 py-2 text-gray-500 w-16">数量</th>
                    <th className="text-left px-3 py-2 text-gray-500 w-12">単位</th>
                    <th className="text-right px-3 py-2 text-gray-500 w-24">単価</th>
                    <th className="text-right px-3 py-2 text-gray-500 w-24">金額</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {cart.map((cartItem, idx) => {
                    const id = cartItem.unitPrice.id
                    const qty = getQty(id)
                    const amount = cartItem.unitPrice.price * qty
                    return (
                      <tr key={idx}>
                        <td className="px-3 py-2">{cartItem.unitPrice.name}</td>
                        <td className="px-3 py-2">
                          <input
                            type="number" min="1"
                            value={qtyStr[id] ?? '1'}
                            onChange={e => setQtyStr(q => ({ ...q, [id]: e.target.value }))}
                            onBlur={e => {
                              const v = parseInt(e.target.value)
                              setQtyStr(q => ({ ...q, [id]: String(isNaN(v) || v < 1 ? 1 : v) }))
                            }}
                            className="input text-xs text-right py-0.5 w-20"
                          />
                        </td>
                        <td className="px-3 py-2">{cartItem.unitPrice.unit}</td>
                        <td className="px-3 py-2 text-right">{new Intl.NumberFormat('ja-JP').format(cartItem.unitPrice.price)}</td>
                        <td className="px-3 py-2 text-right font-medium">
                          {new Intl.NumberFormat('ja-JP').format(amount)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-50 font-semibold">
                    <td colSpan={4} className="px-3 py-2 text-right text-sm">合計</td>
                    <td className="px-3 py-2 text-right text-sm">
                      {new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(total)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
        <div className="p-5 border-t flex gap-3 justify-end">
          <button onClick={onClose} className="btn-secondary">キャンセル</button>
          <button onClick={handleSubmit} disabled={saving} className="btn-primary flex items-center gap-2">
            {saving ? '作成中...' : '発注書PDF作成・保存'}
          </button>
        </div>
      </div>
    </div>
  )
}

type OrderItem = { name: string; part_number?: string; maker?: string; quantity: number; unit: string; unit_price: number; amount: number }
type OrderFormData = { order_date: string; supplier: string; delivery_destination: string; delivery_date: string; notes: string }
type LedgerInfo = { construction_number?: string; project_name?: string } | undefined

function printOrderPDF(order: { order_number?: string }, items: OrderItem[], form: OrderFormData, ledger: LedgerInfo) {
  const fmt = (n: number) => new Intl.NumberFormat('ja-JP').format(n)
  const total = items.reduce((s, i) => s + i.unit_price * i.quantity, 0)
  const rows = items.map((it, i) => `
    <tr>
      <td style="border:1px solid #ddd;padding:6px;text-align:center">${i + 1}</td>
      <td style="border:1px solid #ddd;padding:6px">${it.part_number || ''}</td>
      <td style="border:1px solid #ddd;padding:6px">${it.name}</td>
      <td style="border:1px solid #ddd;padding:6px">${it.maker || ''}</td>
      <td style="border:1px solid #ddd;padding:6px;text-align:center">${it.quantity}</td>
      <td style="border:1px solid #ddd;padding:6px;text-align:center">${it.unit}</td>
      <td style="border:1px solid #ddd;padding:6px;text-align:right">${fmt(it.unit_price)}</td>
      <td style="border:1px solid #ddd;padding:6px;text-align:right">${fmt(it.unit_price * it.quantity)}</td>
    </tr>`).join('')
  const html = `<!DOCTYPE html><html lang="ja"><head><meta charset="UTF-8"><title>発注書 ${order.order_number || ''}</title>
<style>body{font-family:'Meiryo',sans-serif;margin:20mm;font-size:11pt}h1{font-size:20pt;text-align:center;margin-bottom:8px}
table{width:100%;border-collapse:collapse;margin-top:16px}th{background:#f5f5f5;border:1px solid #ddd;padding:6px;font-size:10pt}
td{font-size:10pt}.total{text-align:right;font-size:14pt;font-weight:bold;margin-top:12px}</style></head><body>
<h1>発 注 書</h1>
<div style="display:flex;justify-content:space-between;margin-bottom:16px">
  <div>
    <div><strong>発注先：</strong>${form.supplier}</div>
    <div><strong>発注番号：</strong>${order.order_number || ''}</div>
    <div><strong>発注日：</strong>${form.order_date}</div>
    ${form.delivery_date ? `<div><strong>納品予定日：</strong>${form.delivery_date}</div>` : ''}
    ${form.delivery_destination ? `<div><strong>納品先：</strong>${form.delivery_destination}</div>` : ''}
    ${ledger ? `<div><strong>現場名：</strong>${ledger.construction_number || ''} ${ledger.project_name || ''}</div>` : ''}
  </div>
  <div style="text-align:right;font-size:10pt;color:#888">株式会社シンコネクト</div>
</div>
<table><thead><tr>
  <th style="width:30px">No</th><th>品番</th><th>品名</th><th>メーカー</th>
  <th>数量</th><th>単位</th><th>単価</th><th>金額</th>
</tr></thead><tbody>${rows}</tbody></table>
<div class="total">合計金額：¥${fmt(total)}</div>
${form.notes ? `<div style="margin-top:12px;font-size:10pt;color:#555">備考：${form.notes}</div>` : ''}
</body></html>`
  const w = window.open('', '_blank')
  if (!w) return
  w.document.write(html)
  w.document.close()
  w.focus()
  setTimeout(() => { w.print(); w.close() }, 500)
}
