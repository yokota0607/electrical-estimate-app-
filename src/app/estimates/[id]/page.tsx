'use client'

import { useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, Save, Printer, Trash2, Plus, Loader2,
  FileText, Trash, CheckCircle
} from 'lucide-react'

interface EstimateItem {
  id?: number
  name: string
  category: string
  quantity: number
  unit: string
  unit_price: number
  notes: string
}

interface Estimate {
  id: number
  title: string
  project_name: string
  customer_name: string
  pdf_filename: string
  status: string
  total_amount: number
  tax_rate: number
  notes: string
  created_by: string
  created_at: string
  updated_at: string
}

const CATEGORIES = [
  '電線・ケーブル', '配管・電線管', '照明器具', 'コンセント・スイッチ',
  '分電盤・ブレーカー', '動力設備', '通信・弱電設備', '接地工事', '電気工事材料', 'その他'
]
const UNITS = ['m', '本', '個', '台', '組', '式', 'ヶ所', 'セット', 'kg', '枚']

const STATUS_MAP: Record<string, { label: string; color: string; next?: string; nextLabel?: string }> = {
  draft: { label: '下書き', color: 'bg-gray-100 text-gray-600', next: 'completed', nextLabel: '完成にする' },
  completed: { label: '完成', color: 'bg-blue-100 text-blue-700', next: 'approved', nextLabel: '承認する' },
  approved: { label: '承認済', color: 'bg-green-100 text-green-700' },
  rejected: { label: '却下', color: 'bg-red-100 text-red-700' },
}

function formatCurrency(n: number) {
  return new Intl.NumberFormat('ja-JP').format(Math.round(n))
}

function formatDate(s: string) {
  return new Date(s).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })
}

export default function EstimateDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [estimate, setEstimate] = useState<Estimate | null>(null)
  const [items, setItems] = useState<EstimateItem[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState(false)
  const [saved, setSaved] = useState(false)

  const load = async () => {
    const res = await fetch(`/api/estimates/${id}`)
    if (res.ok) {
      const data = await res.json()
      setEstimate(data.estimate)
      setItems(data.items || [])
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [id])

  const updateItem = (idx: number, field: keyof EstimateItem, value: string | number) => {
    setItems(prev => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item))
    setEditing(true)
  }

  const removeItem = (idx: number) => {
    setItems(prev => prev.filter((_, i) => i !== idx))
    setEditing(true)
  }

  const addItem = () => {
    setItems(prev => [...prev, { name: '', category: '電気工事材料', quantity: 1, unit: '個', unit_price: 0, notes: '' }])
    setEditing(true)
  }

  const updateEstimateField = (field: keyof Estimate, value: string | number) => {
    setEstimate(prev => prev ? { ...prev, [field]: value } : prev)
    setEditing(true)
  }

  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0)
  const taxRate = estimate?.tax_rate ?? 0.1
  const tax = subtotal * taxRate
  const total = subtotal + tax

  const handleSave = async () => {
    if (!estimate) return
    setSaving(true)
    try {
      await fetch(`/api/estimates/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: estimate.title,
          project_name: estimate.project_name,
          customer_name: estimate.customer_name,
          notes: estimate.notes,
          status: estimate.status,
          tax_rate: estimate.tax_rate,
          items: items.map(item => ({
            name: item.name, category: item.category, quantity: item.quantity,
            unit: item.unit, unit_price: item.unit_price, notes: item.notes,
          })),
        }),
      })
      setEditing(false)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
      await load()
    } catch {
      alert('保存に失敗しました')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('この見積もりを削除しますか？')) return
    await fetch(`/api/estimates/${id}`, { method: 'DELETE' })
    router.push('/estimates')
  }

  const handleStatusChange = async (newStatus: string) => {
    if (!estimate) return
    await fetch(`/api/estimates/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...estimate,
        status: newStatus,
        items: items.map(item => ({
          name: item.name, category: item.category, quantity: item.quantity,
          unit: item.unit, unit_price: item.unit_price, notes: item.notes,
        })),
      }),
    })
    await load()
  }

  if (loading) {
    return <div className="p-8 flex items-center gap-2 text-gray-400"><Loader2 className="animate-spin h-5 w-5" />読み込み中...</div>
  }

  if (!estimate) {
    return <div className="p-8 text-gray-500">見積もりが見つかりません。<Link href="/estimates" className="text-blue-600">一覧へ戻る</Link></div>
  }

  const status = STATUS_MAP[estimate.status] || STATUS_MAP.draft

  return (
    <div className="p-8 max-w-5xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link href="/estimates" className="text-gray-400 hover:text-gray-600">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-gray-900">{estimate.title}</h2>
            <span className={`text-xs px-2 py-1 rounded-full ${status.color}`}>{status.label}</span>
          </div>
          <p className="text-gray-400 text-sm mt-0.5">
            作成: {formatDate(estimate.created_at)}
            {estimate.created_by && ` · ${estimate.created_by}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {status.next && (
            <button onClick={() => handleStatusChange(status.next!)}
              className="btn-secondary flex items-center gap-1 text-sm">
              <CheckCircle className="h-4 w-4" />{status.nextLabel}
            </button>
          )}
          <button onClick={() => window.print()} className="btn-secondary flex items-center gap-1 text-sm">
            <Printer className="h-4 w-4" />印刷
          </button>
          {editing && (
            <button onClick={handleSave} disabled={saving}
              className="btn-primary flex items-center gap-2 text-sm">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : saved ? <CheckCircle className="h-4 w-4" /> : <Save className="h-4 w-4" />}
              {saved ? '保存済み' : '保存'}
            </button>
          )}
          <button onClick={handleDelete} className="p-2 text-red-400 hover:text-red-600 rounded-lg hover:bg-red-50">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Project Info */}
      <div className="card p-5 mb-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <label className="label">工事名・現場名</label>
            <input className="input" value={estimate.project_name}
              onChange={e => updateEstimateField('project_name', e.target.value)} />
          </div>
          <div>
            <label className="label">顧客・発注者名</label>
            <input className="input" value={estimate.customer_name}
              onChange={e => updateEstimateField('customer_name', e.target.value)} />
          </div>
          <div>
            <label className="label">担当者</label>
            <input className="input" value={estimate.created_by}
              onChange={e => updateEstimateField('created_by', e.target.value)} />
          </div>
          <div>
            <label className="label">備考</label>
            <input className="input" value={estimate.notes}
              onChange={e => updateEstimateField('notes', e.target.value)} />
          </div>
        </div>
        {estimate.pdf_filename && (
          <div className="mt-3 flex items-center gap-2 text-xs text-gray-400">
            <FileText className="h-3.5 w-3.5" />
            <span>PDF: {estimate.pdf_filename}</span>
          </div>
        )}
      </div>

      {/* Items */}
      <div className="card mb-6">
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">材料明細 ({items.length}件)</h3>
          <button className="btn-secondary text-sm flex items-center gap-1" onClick={addItem}>
            <Plus className="h-4 w-4" />行追加
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-4 py-2.5 text-gray-400 font-medium w-8">#</th>
                <th className="text-left px-4 py-2.5 text-gray-400 font-medium">材料名</th>
                <th className="text-left px-4 py-2.5 text-gray-400 font-medium w-36">カテゴリ</th>
                <th className="text-left px-4 py-2.5 text-gray-400 font-medium w-24">数量</th>
                <th className="text-left px-4 py-2.5 text-gray-400 font-medium w-20">単位</th>
                <th className="text-left px-4 py-2.5 text-gray-400 font-medium w-28">単価（円）</th>
                <th className="text-right px-4 py-2.5 text-gray-400 font-medium w-28">金額（円）</th>
                <th className="px-4 py-2.5 w-8"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {items.map((item, idx) => {
                const amount = item.quantity * item.unit_price
                return (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="px-4 py-2 text-gray-400">{idx + 1}</td>
                    <td className="px-4 py-2">
                      <input className="input text-sm" value={item.name}
                        onChange={e => updateItem(idx, 'name', e.target.value)} />
                    </td>
                    <td className="px-4 py-2">
                      <select className="input text-sm" value={item.category}
                        onChange={e => updateItem(idx, 'category', e.target.value)}>
                        {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                      </select>
                    </td>
                    <td className="px-4 py-2">
                      <input type="number" min="0" step="0.1" className="input text-sm text-right"
                        value={item.quantity}
                        onChange={e => updateItem(idx, 'quantity', parseFloat(e.target.value) || 0)} />
                    </td>
                    <td className="px-4 py-2">
                      <select className="input text-sm" value={item.unit}
                        onChange={e => updateItem(idx, 'unit', e.target.value)}>
                        {UNITS.map(u => <option key={u}>{u}</option>)}
                        {!UNITS.includes(item.unit) && <option value={item.unit}>{item.unit}</option>}
                      </select>
                    </td>
                    <td className="px-4 py-2">
                      <input type="number" min="0" className="input text-sm text-right"
                        value={item.unit_price}
                        onChange={e => updateItem(idx, 'unit_price', parseFloat(e.target.value) || 0)} />
                    </td>
                    <td className="px-4 py-2 text-right font-medium text-gray-700">
                      {formatCurrency(amount)}
                    </td>
                    <td className="px-4 py-2">
                      <button onClick={() => removeItem(idx)}
                        className="text-red-400 hover:text-red-600 p-1 rounded">
                        <Trash className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                )
              })}
              {items.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-400">
                    材料がありません。「行追加」で追加してください。
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="border-t border-gray-100 p-4">
          <div className="ml-auto w-64 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">小計（税抜）</span>
              <span className="font-medium">¥{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-500">消費税（{Math.round(taxRate * 100)}%）</span>
              <span className="font-medium">¥{formatCurrency(tax)}</span>
            </div>
            <div className="flex justify-between pt-2 border-t border-gray-200">
              <span className="font-semibold text-gray-900">合計（税込）</span>
              <span className="font-bold text-xl text-blue-600">¥{formatCurrency(total)}</span>
            </div>
          </div>
        </div>
      </div>

      {editing && (
        <div className="sticky bottom-4 flex justify-end">
          <button onClick={handleSave} disabled={saving}
            className="btn-primary flex items-center gap-2 shadow-lg">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            変更を保存
          </button>
        </div>
      )}
    </div>
  )
}
