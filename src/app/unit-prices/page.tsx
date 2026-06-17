'use client'

import { useEffect, useState } from 'react'
import { Plus, Search, Trash2, Pencil, Check, X, Download, Upload, Tag } from 'lucide-react'

interface UnitPrice {
  id: number
  name: string
  category: string
  unit: string
  price: number
  supplier: string
  notes: string
  updated_at: string
}

const CATEGORIES = [
  '電線・ケーブル', '配管・電線管', '照明器具', 'コンセント・スイッチ',
  '分電盤・ブレーカー', '動力設備', '通信・弱電設備', '接地工事', '電気工事材料', 'その他'
]
const UNITS = ['m', '本', '個', '台', '組', '式', 'ヶ所', 'セット', 'kg', '枚']

const BLANK: Omit<UnitPrice, 'id' | 'updated_at'> = {
  name: '', category: '電気工事材料', unit: '個', price: 0, supplier: '', notes: ''
}

const SAMPLE_PRICES = [
  { name: 'VVF 1.6mm×2C', category: '電線・ケーブル', unit: 'm', price: 120, supplier: '電線卸', notes: '' },
  { name: 'VVF 2.0mm×2C', category: '電線・ケーブル', unit: 'm', price: 180, supplier: '電線卸', notes: '' },
  { name: 'VVF 2.0mm×3C', category: '電線・ケーブル', unit: 'm', price: 220, supplier: '電線卸', notes: '' },
  { name: 'IV 1.6mm', category: '電線・ケーブル', unit: 'm', price: 60, supplier: '', notes: '' },
  { name: 'CVT 22sq', category: '電線・ケーブル', unit: 'm', price: 850, supplier: '', notes: '' },
  { name: 'PF管 16mm', category: '配管・電線管', unit: 'm', price: 85, supplier: '', notes: '' },
  { name: 'PF管 22mm', category: '配管・電線管', unit: 'm', price: 110, supplier: '', notes: '' },
  { name: 'C-PF管 28mm', category: '配管・電線管', unit: 'm', price: 145, supplier: '', notes: '' },
  { name: 'LED照明器具 40W', category: '照明器具', unit: '台', price: 12000, supplier: '', notes: '' },
  { name: 'LEDダウンライト', category: '照明器具', unit: '台', price: 3500, supplier: '', notes: '' },
  { name: 'コンセント（2口）', category: 'コンセント・スイッチ', unit: '個', price: 800, supplier: '', notes: '' },
  { name: 'スイッチ（片切）', category: 'コンセント・スイッチ', unit: '個', price: 600, supplier: '', notes: '' },
  { name: 'アース付コンセント', category: 'コンセント・スイッチ', unit: '個', price: 1200, supplier: '', notes: '' },
  { name: 'ブレーカー 20A', category: '分電盤・ブレーカー', unit: '個', price: 2500, supplier: '', notes: '' },
  { name: '分電盤 12回路', category: '分電盤・ブレーカー', unit: '台', price: 45000, supplier: '', notes: '' },
]

function formatCurrency(n: number) {
  return new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(n)
}

export default function UnitPricesPage() {
  const [prices, setPrices] = useState<UnitPrice[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [editingId, setEditingId] = useState<number | 'new' | null>(null)
  const [form, setForm] = useState(BLANK)
  const [saving, setSaving] = useState(false)
  const [importLoading, setImportLoading] = useState(false)

  const load = () => {
    fetch('/api/unit-prices')
      .then(r => r.json())
      .then(data => setPrices(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const filtered = prices.filter(p => {
    const matchSearch = !search || p.name.includes(search) || p.supplier.includes(search)
    const matchCat = categoryFilter === 'all' || p.category === categoryFilter
    return matchSearch && matchCat
  })

  const grouped = CATEGORIES.reduce((acc, cat) => {
    const items = filtered.filter(p => p.category === cat)
    if (items.length > 0) acc[cat] = items
    return acc
  }, {} as Record<string, UnitPrice[]>)

  const startEdit = (p: UnitPrice) => {
    setEditingId(p.id)
    setForm({ name: p.name, category: p.category, unit: p.unit, price: p.price, supplier: p.supplier, notes: p.notes })
  }

  const startNew = () => {
    setEditingId('new')
    setForm(BLANK)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setForm(BLANK)
  }

  const handleSave = async () => {
    if (!form.name) { alert('材料名を入力してください'); return }
    setSaving(true)
    try {
      if (editingId === 'new') {
        await fetch('/api/unit-prices', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        })
      } else {
        await fetch(`/api/unit-prices/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        })
      }
      setEditingId(null)
      load()
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`「${name}」を削除しますか？`)) return
    await fetch(`/api/unit-prices/${id}`, { method: 'DELETE' })
    load()
  }

  const loadSamples = async () => {
    if (!confirm(`サンプル単価データ（${SAMPLE_PRICES.length}件）を一括登録しますか？`)) return
    setImportLoading(true)
    for (const item of SAMPLE_PRICES) {
      await fetch('/api/unit-prices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item),
      })
    }
    setImportLoading(false)
    load()
  }

  const exportCSV = () => {
    const header = 'ID,材料名,カテゴリ,単位,単価,仕入先,備考\n'
    const rows = prices.map(p =>
      `${p.id},"${p.name}","${p.category}","${p.unit}",${p.price},"${p.supplier}","${p.notes}"`
    ).join('\n')
    const blob = new Blob(['﻿' + header + rows], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = '単価表.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  const InlineForm = () => (
    <tr className="bg-blue-50">
      <td className="px-4 py-2">
        <input className="input text-sm" placeholder="材料名 *" value={form.name}
          onChange={e => setForm(f => ({ ...f, name: e.target.value }))} autoFocus />
      </td>
      <td className="px-4 py-2">
        <select className="input text-sm" value={form.category}
          onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
          {CATEGORIES.map(c => <option key={c}>{c}</option>)}
        </select>
      </td>
      <td className="px-4 py-2">
        <select className="input text-sm" value={form.unit}
          onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}>
          {UNITS.map(u => <option key={u}>{u}</option>)}
        </select>
      </td>
      <td className="px-4 py-2">
        <input type="number" min="0" className="input text-sm text-right" placeholder="0" value={form.price}
          onChange={e => setForm(f => ({ ...f, price: parseFloat(e.target.value) || 0 }))} />
      </td>
      <td className="px-4 py-2">
        <input className="input text-sm" placeholder="仕入先" value={form.supplier}
          onChange={e => setForm(f => ({ ...f, supplier: e.target.value }))} />
      </td>
      <td className="px-4 py-2">
        <input className="input text-sm" placeholder="備考" value={form.notes}
          onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
      </td>
      <td className="px-4 py-2">
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
      <div className="mb-5 sm:mb-6">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900">単価表管理</h2>
            <p className="text-gray-500 text-sm mt-1">全{prices.length}件の材料単価</p>
          </div>
          <div className="flex flex-wrap gap-2 justify-end">
            {prices.length === 0 && (
              <button onClick={loadSamples} disabled={importLoading}
                className="btn-secondary flex items-center gap-1.5 text-sm px-3">
                <Upload className="h-4 w-4" /><span className="hidden sm:inline">サンプルデータ読込</span><span className="sm:hidden">サンプル</span>
              </button>
            )}
            <button onClick={exportCSV} className="btn-secondary flex items-center gap-1.5 text-sm px-3">
              <Download className="h-4 w-4" /><span className="hidden sm:inline">CSV出力</span><span className="sm:hidden">CSV</span>
            </button>
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
          <input className="input pl-9" placeholder="材料名・仕入先で検索"
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="input sm:w-48" value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}>
          <option value="all">すべてのカテゴリ</option>
          {CATEGORIES.map(c => <option key={c}>{c}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="card">
        {loading ? (
          <div className="p-12 text-center text-gray-400">読み込み中...</div>
        ) : prices.length === 0 && !loading ? (
          <div className="p-12 text-center text-gray-400">
            <Tag className="h-12 w-12 mx-auto mb-3 opacity-20" />
            <p className="font-medium mb-2">単価が登録されていません</p>
            <div className="flex gap-2 justify-center">
              <button onClick={loadSamples} className="btn-secondary text-sm">
                サンプルデータを読込む
              </button>
              <button onClick={startNew} className="btn-primary text-sm">
                手動で登録する
              </button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-4 py-3 text-gray-400 font-medium">材料名</th>
                  <th className="text-left px-4 py-3 text-gray-400 font-medium w-36">カテゴリ</th>
                  <th className="text-left px-4 py-3 text-gray-400 font-medium w-20">単位</th>
                  <th className="text-right px-4 py-3 text-gray-400 font-medium w-28">単価</th>
                  <th className="text-left px-4 py-3 text-gray-400 font-medium w-28">仕入先</th>
                  <th className="text-left px-4 py-3 text-gray-400 font-medium">備考</th>
                  <th className="px-4 py-3 w-20"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {editingId === 'new' && <InlineForm />}
                {Object.entries(grouped).length > 0 ? (
                  Object.entries(grouped).map(([cat, items]) => (
                    <>
                      <tr key={`header-${cat}`} className="bg-gray-50">
                        <td colSpan={7} className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          {cat} ({items.length})
                        </td>
                      </tr>
                      {items.map(p => (
                        editingId === p.id ? (
                          <InlineForm key={p.id} />
                        ) : (
                          <tr key={p.id} className="hover:bg-gray-50 group">
                            <td className="px-4 py-2.5 font-medium text-gray-900">{p.name}</td>
                            <td className="px-4 py-2.5 text-gray-500">{p.category}</td>
                            <td className="px-4 py-2.5 text-gray-500">{p.unit}</td>
                            <td className="px-4 py-2.5 text-right font-semibold text-gray-900">{formatCurrency(p.price)}</td>
                            <td className="px-4 py-2.5 text-gray-500">{p.supplier || '—'}</td>
                            <td className="px-4 py-2.5 text-gray-400 text-xs">{p.notes || '—'}</td>
                            <td className="px-4 py-2.5">
                              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => startEdit(p)}
                                  className="p-1.5 text-gray-400 hover:text-blue-600 rounded">
                                  <Pencil className="h-3.5 w-3.5" />
                                </button>
                                <button onClick={() => handleDelete(p.id, p.name)}
                                  className="p-1.5 text-gray-400 hover:text-red-600 rounded">
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        )
                      ))}
                    </>
                  ))
                ) : (
                  filtered.length === 0 && prices.length > 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                        検索条件に一致する単価がありません
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
