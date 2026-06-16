'use client'

import { useEffect, useState, use, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, Save, Trash2, Loader2, CheckCircle, Link2, Edit2, Plus, X, Banknote,
  Paperclip, Download, FileText, Image as ImageIcon, File, Building2, ClipboardList
} from 'lucide-react'
import CurrencyInput from '@/components/CurrencyInput'

interface LedgerDetail {
  id: number
  construction_number: string
  project_name: string
  client_name: string
  location: string
  contract_amount: number
  advance_payment: number
  advance_payment_date: string
  advance_payment_payer: string
  interim_payment: number
  interim_payment_date: string
  interim_payment_payer: string
  final_payment: number
  final_payment_date: string
  final_payment_payer: string
  total_amount: number
  start_date: string
  completion_date: string
  completion_date_type: string
  description: string
  material_cost: number
  labor_cost: number
  subcontract_cost: number
  site_misc_cost: number
  purchase_cost: number
  status: string
  assigned_to: string
  payment_status: string
  partial_payment_date: string
  notes: string
  estimate_id: number | null
  estimate_title: string | null
  created_at: string
  updated_at: string
}

interface SubcontractorPayment {
  id: number
  ledger_id: number
  company_name: string
  amount: number
  payment_date: string
  description: string
  created_at: string
}

interface ConstructionFile {
  id: number
  ledger_id: number
  stored_name: string
  original_name: string
  file_size: number
  mime_type: string
  uploaded_by: string
  created_at: string
}

interface PaymentHistory {
  id: number
  ledger_id: number
  payment_type: string
  amount: number
  payment_date: string
  payer: string
  notes: string
  created_at: string
}

interface ConstructionProcess {
  id: number
  ledger_id: number
  name: string
  weight: number
  is_completed: number
  sort_order: number
  created_at: string
}

interface Estimate {
  id: number
  title: string
  project_name: string
  customer_name: string
  total_amount: number
  tax_rate: number
}

const PAYMENT_STATUSES = ['未入金', '一部入金', '入金済み']
const WORK_STATUSES = ['未着工', '着工中', '完成未請求', '請求済未入金', '完了']
const PAYMENT_TYPES = ['着手金', '中間金', '出来高', '完成金', 'その他']
const PAYMENT_TYPE_STYLE: Record<string, string> = {
  '着手金': 'bg-blue-100 text-blue-700',
  '中間金': 'bg-yellow-100 text-yellow-700',
  '出来高': 'bg-purple-100 text-purple-700',
  '完成金': 'bg-green-100 text-green-700',
  'その他': 'bg-gray-100 text-gray-600',
}
const STATUS_STYLE: Record<string, string> = {
  '未着工':     'bg-gray-100 text-gray-600',
  '着工中':     'bg-blue-100 text-blue-700',
  '完成未請求': 'bg-amber-100 text-amber-700',
  '請求済未入金':'bg-orange-100 text-orange-700',
  '完了':       'bg-green-100 text-green-700',
}
const PAYMENT_STATUS_STYLE: Record<string, string> = {
  '未入金': 'bg-red-100 text-red-700',
  '一部入金': 'bg-yellow-100 text-yellow-700',
  '入金済み': 'bg-green-100 text-green-700',
}

function formatCurrency(n: number) {
  return new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(Math.round(n))
}

function formatDate(s: string) {
  if (!s) return '—'
  return new Date(s).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })
}

export default function ConstructionLedgerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()

  const [data, setData] = useState<LedgerDetail | null>(null)
  const [estimates, setEstimates] = useState<Estimate[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState(false)
  const [saved, setSaved] = useState(false)

  const [form, setForm] = useState<Partial<LedgerDetail>>({})

  const [payments, setPayments] = useState<PaymentHistory[]>([])
  const [addingPayment, setAddingPayment] = useState(false)
  const [savingPayment, setSavingPayment] = useState(false)
  const [newPayment, setNewPayment] = useState({
    payment_type: '着手金',
    amount: '',
    payment_date: '',
    payer: '',
    notes: '',
  })

  const [files, setFiles] = useState<ConstructionFile[]>([])
  const [uploadingFile, setUploadingFile] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [subPayments, setSubPayments] = useState<SubcontractorPayment[]>([])
  const [addingSubPayment, setAddingSubPayment] = useState(false)
  const [savingSubPayment, setSavingSubPayment] = useState(false)
  const [newSubPayment, setNewSubPayment] = useState({
    company_name: '',
    amount: '',
    payment_date: '',
    description: '',
  })

  const [processes, setProcesses] = useState<ConstructionProcess[]>([])
  const [addingProcess, setAddingProcess] = useState(false)
  const [savingProcess, setSavingProcess] = useState(false)
  const [newProcess, setNewProcess] = useState({ name: '', weight: '' })

  const loadProcesses = async () => {
    const res = await fetch(`/api/construction-ledger/${id}/processes`)
    if (res.ok) setProcesses(await res.json())
  }

  const load = async () => {
    const res = await fetch(`/api/construction-ledger/${id}`)
    if (res.ok) {
      const d = await res.json()
      setData(d)
      setForm(d)
    }
    setLoading(false)
  }

  const loadPayments = async () => {
    const res = await fetch(`/api/construction-ledger/${id}/payments`)
    if (res.ok) setPayments(await res.json())
  }

  useEffect(() => {
    load()
    loadPayments()
    loadFiles()
    loadSubPayments()
    loadProcesses()
    fetch('/api/estimates').then(r => r.json()).then(d => setEstimates(Array.isArray(d) ? d : []))
  }, [id])

  const handleAddPayment = async () => {
    if (!newPayment.amount) { alert('金額を入力してください'); return }
    setSavingPayment(true)
    try {
      const res = await fetch(`/api/construction-ledger/${id}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newPayment, amount: Number(newPayment.amount) || 0 }),
      })
      if (res.ok) {
        setAddingPayment(false)
        setNewPayment({ payment_type: '着手金', amount: '', payment_date: '', payer: '', notes: '' })
        loadPayments()
      }
    } finally {
      setSavingPayment(false)
    }
  }

  const handleDeletePayment = async (pid: number) => {
    if (!confirm('この入金履歴を削除しますか？')) return
    await fetch(`/api/construction-ledger/${id}/payments/${pid}`, { method: 'DELETE' })
    loadPayments()
  }

  const loadFiles = async () => {
    const res = await fetch(`/api/construction-ledger/${id}/files`)
    if (res.ok) setFiles(await res.json())
  }

  const loadSubPayments = async () => {
    const res = await fetch(`/api/construction-ledger/${id}/subcontractor-payments`)
    if (res.ok) setSubPayments(await res.json())
  }

  const handleAddSubPayment = async () => {
    if (!newSubPayment.company_name.trim()) { alert('外注先会社名を入力してください'); return }
    setSavingSubPayment(true)
    try {
      const res = await fetch(`/api/construction-ledger/${id}/subcontractor-payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newSubPayment, amount: Number(newSubPayment.amount) || 0 }),
      })
      if (res.ok) {
        setAddingSubPayment(false)
        setNewSubPayment({ company_name: '', amount: '', payment_date: '', description: '' })
        loadSubPayments()
      }
    } finally {
      setSavingSubPayment(false)
    }
  }

  const handleDeleteSubPayment = async (pid: number) => {
    if (!confirm('この支払い記録を削除しますか？')) return
    await fetch(`/api/construction-ledger/${id}/subcontractor-payments/${pid}`, { method: 'DELETE' })
    loadSubPayments()
  }

  const handleAddProcess = async () => {
    if (!newProcess.name.trim()) { alert('工程名を入力してください'); return }
    setSavingProcess(true)
    try {
      const res = await fetch(`/api/construction-ledger/${id}/processes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newProcess.name, weight: Number(newProcess.weight) || 0 }),
      })
      if (res.ok) {
        setAddingProcess(false)
        setNewProcess({ name: '', weight: '' })
        loadProcesses()
      }
    } finally {
      setSavingProcess(false)
    }
  }

  const handleToggleProcess = async (p: ConstructionProcess) => {
    await fetch(`/api/construction-ledger/${id}/processes/${p.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: p.name, weight: p.weight, is_completed: p.is_completed ? 0 : 1 }),
    })
    loadProcesses()
  }

  const handleUpdateProcessWeight = async (p: ConstructionProcess, weight: number) => {
    await fetch(`/api/construction-ledger/${id}/processes/${p.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: p.name, weight, is_completed: p.is_completed }),
    })
    loadProcesses()
  }

  const handleUpdateProcessName = async (p: ConstructionProcess, name: string) => {
    await fetch(`/api/construction-ledger/${id}/processes/${p.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, weight: p.weight, is_completed: p.is_completed }),
    })
    loadProcesses()
  }

  const handleDeleteProcess = async (pid: number) => {
    if (!confirm('この工程を削除しますか？')) return
    await fetch(`/api/construction-ledger/${id}/processes/${pid}`, { method: 'DELETE' })
    loadProcesses()
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingFile(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch(`/api/construction-ledger/${id}/files`, { method: 'POST', body: fd })
      if (!res.ok) { alert('アップロードに失敗しました'); return }
      loadFiles()
    } finally {
      setUploadingFile(false)
      e.target.value = ''
    }
  }

  const handleDeleteFile = async (fid: number) => {
    if (!confirm('このファイルを削除しますか？')) return
    await fetch(`/api/construction-ledger/${id}/files/${fid}`, { method: 'DELETE' })
    loadFiles()
  }

  function fileIcon(mime: string) {
    if (mime.startsWith('image/')) return <ImageIcon className="h-4 w-4 text-blue-500" />
    if (mime === 'application/pdf') return <FileText className="h-4 w-4 text-red-500" />
    return <File className="h-4 w-4 text-gray-400" />
  }

  function formatSize(bytes: number) {
    if (bytes < 1024) return `${bytes}B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`
    return `${(bytes / 1024 / 1024).toFixed(1)}MB`
  }

  const set = (field: string, value: string | number | null) => {
    setForm(prev => ({ ...prev, [field]: value }))
    setEditing(true)
  }

  const profit = (Number(form.contract_amount) || 0)
    - (Number(form.material_cost) || 0)
    - (Number(form.labor_cost) || 0)
    - (Number(form.subcontract_cost) || 0)
    - (Number(form.site_misc_cost) || 0)
    - (Number(form.purchase_cost) || 0)

  const handleSave = async () => {
    setSaving(true)
    try {
      await fetch(`/api/construction-ledger/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
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
    if (!confirm('この工事を台帳から削除しますか？')) return
    await fetch(`/api/construction-ledger/${id}`, { method: 'DELETE' })
    router.push('/construction-ledger')
  }

  if (loading) {
    return <div className="p-8 flex items-center gap-2 text-gray-400"><Loader2 className="animate-spin h-5 w-5" />読み込み中...</div>
  }

  if (!data) {
    return <div className="p-8 text-gray-500">工事が見つかりません。<Link href="/construction-ledger" className="text-blue-600">一覧へ戻る</Link></div>
  }

  const paymentStyle = PAYMENT_STATUS_STYLE[form.payment_status || '未入金'] || 'bg-gray-100 text-gray-600'

  return (
    <div className="p-8 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link href="/construction-ledger" className="text-gray-400 hover:text-gray-600">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="font-mono text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">
              {data.construction_number}
            </span>
            <h2 className="text-xl font-bold text-gray-900">{data.project_name}</h2>
            <span className={`text-xs px-2 py-1 rounded-full ${STATUS_STYLE[form.status || '未着工'] || 'bg-gray-100 text-gray-600'}`}>
              {form.status || '未着工'}
            </span>
            <span className={`text-xs px-2 py-1 rounded-full ${paymentStyle}`}>
              {form.payment_status || data.payment_status}
            </span>
          </div>
          <p className="text-gray-400 text-sm mt-0.5">登録日: {formatDate(data.created_at)}</p>
        </div>
        <div className="flex items-center gap-2">
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

      {/* 基本情報 */}
      <div className="card p-5 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Edit2 className="h-4 w-4 text-gray-400" />
          <h3 className="font-semibold text-gray-900 text-sm">基本情報</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="md:col-span-2">
            <label className="label">工事名</label>
            <input className="input" value={form.project_name || ''} onChange={e => set('project_name', e.target.value)} />
          </div>
          <div>
            <label className="label">発注者</label>
            <input className="input" value={form.client_name || ''} onChange={e => set('client_name', e.target.value)} />
          </div>
          <div>
            <label className="label">工事場所</label>
            <input className="input" value={form.location || ''} onChange={e => set('location', e.target.value)} />
          </div>
          <div>
            <label className="label">着工日</label>
            <input type="date" className="input" value={form.start_date || ''} onChange={e => set('start_date', e.target.value)} />
          </div>
          <div>
            <label className="label">完成日</label>
            <div className="flex gap-1 mb-1">
              {['予定', '完了'].map(t => (
                <button key={t} type="button"
                  onClick={() => set('completion_date_type', t)}
                  className={`text-xs px-2.5 py-0.5 rounded-full border transition-colors ${
                    (form.completion_date_type || '予定') === t
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'text-gray-500 border-gray-300 hover:border-blue-400'
                  }`}
                >{t}</button>
              ))}
            </div>
            <input type="date" className="input" value={form.completion_date || ''} onChange={e => set('completion_date', e.target.value)} />
          </div>
          <div>
            <label className="label">工事ステータス</label>
            <select className="input" value={form.status || '未着工'} onChange={e => set('status', e.target.value)}>
              {WORK_STATUSES.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="label">担当者</label>
            <input className="input" value={form.assigned_to || ''} onChange={e => set('assigned_to', e.target.value)} placeholder="山田 太郎" />
          </div>
          <div className="md:col-span-2">
            <label className="label">工事内容</label>
            <textarea className="input" rows={3} value={form.description || ''} onChange={e => set('description', e.target.value)} />
          </div>
        </div>
      </div>

      {/* 金額 */}
      <div className="card p-5 mb-6">
        <h3 className="font-semibold text-gray-900 text-sm mb-4">金額情報</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
          <div>
            <label className="label">契約金額（円）</label>
            <CurrencyInput className="input text-right" value={form.contract_amount ?? 0} onChange={v => set('contract_amount', v)} />
          </div>
          <div>
            <label className="label">総額（円）</label>
            <CurrencyInput className="input text-right" value={form.total_amount ?? 0} onChange={v => set('total_amount', v)} />
          </div>
          <div>
            <label className="label">材料費（円）</label>
            <CurrencyInput className="input text-right" value={form.material_cost ?? 0} onChange={v => set('material_cost', v)} />
          </div>
          <div>
            <label className="label">労務費（円）</label>
            <CurrencyInput className="input text-right" value={form.labor_cost ?? 0} onChange={v => set('labor_cost', v)} />
          </div>
          <div>
            <label className="label">外注費（円）</label>
            <CurrencyInput className="input text-right" value={form.subcontract_cost ?? 0} onChange={v => set('subcontract_cost', v)} />
          </div>
          <div>
            <label className="label">現場雑費（円）</label>
            <CurrencyInput className="input text-right" value={form.site_misc_cost ?? 0} onChange={v => set('site_misc_cost', v)} />
          </div>
          <div>
            <label className="label">購入費（円）</label>
            <CurrencyInput className="input text-right" value={form.purchase_cost ?? 0} onChange={v => set('purchase_cost', v)} />
          </div>
        </div>

        {/* 利益サマリー */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 bg-gray-50 rounded-lg text-sm">
          <div className="text-center">
            <p className="text-gray-500 text-xs mb-1">契約金額</p>
            <p className="font-semibold text-gray-900">{formatCurrency(Number(form.contract_amount) || 0)}</p>
          </div>
          <div className="text-center">
            <p className="text-gray-500 text-xs mb-1">原価合計</p>
            <p className="font-semibold text-gray-900">
              {formatCurrency(
                (Number(form.material_cost) || 0) +
                (Number(form.labor_cost) || 0) +
                (Number(form.subcontract_cost) || 0) +
                (Number(form.site_misc_cost) || 0) +
                (Number(form.purchase_cost) || 0)
              )}
            </p>
          </div>
          <div className="text-center">
            <p className="text-gray-500 text-xs mb-1">利益</p>
            <p className={`font-bold text-lg ${profit >= 0 ? 'text-green-700' : 'text-red-600'}`}>
              {formatCurrency(profit)}
            </p>
          </div>
          <div className="text-center">
            <p className="text-gray-500 text-xs mb-1">利益率</p>
            <p className={`font-semibold ${profit >= 0 ? 'text-green-700' : 'text-red-600'}`}>
              {Number(form.contract_amount) > 0
                ? `${Math.round(profit / Number(form.contract_amount) * 100)}%`
                : '—'}
            </p>
          </div>
        </div>
      </div>


      {/* 入金・連携・備考 */}
      <div className="card p-5 mb-6">
        <h3 className="font-semibold text-gray-900 text-sm mb-4">入金・連携・備考</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <label className="label">入金状況</label>
            <select className="input" value={form.payment_status || '未入金'} onChange={e => set('payment_status', e.target.value)}>
              {PAYMENT_STATUSES.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          {form.payment_status === '一部入金' && (
            <div>
              <label className="label">一部入金日</label>
              <input type="date" className="input" value={form.partial_payment_date || ''} onChange={e => set('partial_payment_date', e.target.value)} />
            </div>
          )}
          <div className={form.payment_status === '一部入金' ? 'md:col-span-2' : ''}>
            <label className="label">備考</label>
            <input className="input" value={form.notes || ''} onChange={e => set('notes', e.target.value)} />
          </div>
          <div className="md:col-span-2">
            <label className="label flex items-center gap-1">
              <Link2 className="h-3.5 w-3.5 text-blue-400" />連携見積もり
            </label>
            <select className="input" value={form.estimate_id ?? ''} onChange={e => set('estimate_id', e.target.value ? Number(e.target.value) : null)}>
              <option value="">連携なし</option>
              {estimates.map(e => (
                <option key={e.id} value={e.id}>
                  {e.title}（{e.project_name || e.customer_name}）
                </option>
              ))}
            </select>
            {form.estimate_id && (
              <Link href={`/estimates/${form.estimate_id}`}
                className="text-blue-500 text-xs hover:underline mt-1 inline-flex items-center gap-1">
                <Link2 className="h-3 w-3" />見積もりを開く
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* 入金管理 */}
      <div className="card p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Banknote className="h-4 w-4 text-green-500" />
            <h3 className="font-semibold text-gray-900 text-sm">入金管理</h3>
          </div>
          {!addingPayment && (
            <button type="button" onClick={() => setAddingPayment(true)}
              className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 border border-blue-300 hover:border-blue-500 px-2.5 py-1 rounded-lg transition-colors">
              <Plus className="h-3.5 w-3.5" />入金を追加
            </button>
          )}
        </div>

        {/* 入金サマリー */}
        {(() => {
          const totalReceived = payments.reduce((s, p) => s + p.amount, 0)
          const base = (Number(form.total_amount) || 0) > 0 ? (Number(form.total_amount) || 0) : (Number(form.contract_amount) || 0)
          const remaining = base - totalReceived
          const pct = base > 0 ? Math.min(100, Math.round(totalReceived / base * 100)) : 0
          return (
            <div className="mb-4">
              <div className="grid grid-cols-3 gap-3 mb-3 p-3 bg-gray-50 rounded-lg text-xs text-center">
                <div>
                  <p className="text-gray-400 mb-0.5">{(Number(form.total_amount) || 0) > 0 ? '総額' : '契約金額'}</p>
                  <p className="font-semibold text-gray-800">{formatCurrency(base)}</p>
                </div>
                <div>
                  <p className="text-gray-400 mb-0.5">入金済み</p>
                  <p className="font-semibold text-green-700">{formatCurrency(totalReceived)}</p>
                </div>
                <div>
                  <p className="text-gray-400 mb-0.5">残金</p>
                  <p className={`font-semibold ${remaining > 0 ? 'text-red-600' : remaining < 0 ? 'text-amber-600' : 'text-green-700'}`}>
                    {base > 0 ? formatCurrency(remaining) : '—'}
                  </p>
                </div>
              </div>
              {base > 0 && (
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-gray-500">入金進捗</span>
                    <span className={`font-semibold ${pct >= 100 ? 'text-green-700' : pct > 0 ? 'text-blue-600' : 'text-gray-400'}`}>
                      {pct}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                    <div
                      className={`h-3 rounded-full transition-all duration-500 ${pct >= 100 ? 'bg-green-500' : 'bg-blue-500'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          )
        })()}

        {/* 入金追加フォーム */}
        {addingPayment && (
          <div className="border border-blue-200 rounded-lg p-4 mb-4 bg-blue-50">
            <p className="text-xs font-medium text-blue-700 mb-3">入金を追加</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
              <div>
                <label className="label">入金種別</label>
                <select className="input" value={newPayment.payment_type}
                  onChange={e => setNewPayment(p => ({ ...p, payment_type: e.target.value }))}>
                  {PAYMENT_TYPES.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="label">金額（円）</label>
                <CurrencyInput className="input text-right" value={newPayment.amount}
                  onChange={v => setNewPayment(p => ({ ...p, amount: String(v) }))} />
              </div>
              <div>
                <label className="label">入金日</label>
                <input type="date" className="input" value={newPayment.payment_date}
                  onChange={e => setNewPayment(p => ({ ...p, payment_date: e.target.value }))} />
              </div>
              <div>
                <label className="label">入金元</label>
                <input className="input" placeholder="株式会社〇〇" value={newPayment.payer}
                  onChange={e => setNewPayment(p => ({ ...p, payer: e.target.value }))} />
              </div>
              <div className="md:col-span-2">
                <label className="label">メモ</label>
                <input className="input" placeholder="任意" value={newPayment.notes}
                  onChange={e => setNewPayment(p => ({ ...p, notes: e.target.value }))} />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-3">
              <button type="button" onClick={() => setAddingPayment(false)}
                className="btn-secondary text-xs flex items-center gap-1">
                <X className="h-3.5 w-3.5" />キャンセル
              </button>
              <button type="button" onClick={handleAddPayment} disabled={savingPayment}
                className="btn-primary text-xs flex items-center gap-1">
                {savingPayment ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                保存
              </button>
            </div>
          </div>
        )}

        {/* 入金履歴テーブル */}
        {payments.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-4">入金履歴がありません</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-3 py-2 text-gray-400 font-medium text-xs">種別</th>
                  <th className="text-right px-3 py-2 text-gray-400 font-medium text-xs">金額</th>
                  <th className="text-left px-3 py-2 text-gray-400 font-medium text-xs">入金日</th>
                  <th className="text-left px-3 py-2 text-gray-400 font-medium text-xs">入金元</th>
                  <th className="text-left px-3 py-2 text-gray-400 font-medium text-xs">メモ</th>
                  <th className="px-3 py-2 w-8"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {payments.map(p => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${PAYMENT_TYPE_STYLE[p.payment_type] || 'bg-gray-100 text-gray-600'}`}>
                        {p.payment_type}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right font-medium text-gray-900">{formatCurrency(p.amount)}</td>
                    <td className="px-3 py-2 text-gray-600">{p.payment_date || '—'}</td>
                    <td className="px-3 py-2 text-gray-600">{p.payer || '—'}</td>
                    <td className="px-3 py-2 text-gray-400 text-xs">{p.notes || '—'}</td>
                    <td className="px-3 py-2">
                      <button type="button" onClick={() => handleDeletePayment(p.id)}
                        className="text-gray-300 hover:text-red-500 transition-colors">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 工程管理 */}
      <div className="card p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-indigo-500" />
            <h3 className="font-semibold text-gray-900 text-sm">工程管理</h3>
          </div>
          {!addingProcess && (
            <button type="button" onClick={() => setAddingProcess(true)}
              className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700 border border-indigo-300 hover:border-indigo-500 px-2.5 py-1 rounded-lg transition-colors">
              <Plus className="h-3.5 w-3.5" />工程を追加
            </button>
          )}
        </div>

        {/* 進捗バー */}
        {(() => {
          const totalWeight = processes.reduce((s, p) => s + p.weight, 0)
          const completedWeight = processes.filter(p => p.is_completed).reduce((s, p) => s + p.weight, 0)
          const pct = totalWeight > 0 ? Math.min(100, Math.round(completedWeight / totalWeight * 100)) : 0
          const autoMode = totalWeight === 0 && processes.length > 0
          const autoPct = processes.length > 0 ? Math.round(processes.filter(p => p.is_completed).length / processes.length * 100) : 0
          const displayPct = autoMode ? autoPct : pct
          return (
            <div className="mb-4 p-3 bg-indigo-50 rounded-lg">
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="text-gray-500">
                  工程進捗
                  {autoMode && <span className="ml-1 text-gray-400">（重みなし・件数ベース）</span>}
                </span>
                <span className={`font-bold text-sm ${displayPct >= 100 ? 'text-green-700' : 'text-indigo-600'}`}>
                  {displayPct}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
                <div
                  className={`h-4 rounded-full transition-all duration-500 ${displayPct >= 100 ? 'bg-green-500' : 'bg-indigo-500'}`}
                  style={{ width: `${displayPct}%` }}
                />
              </div>
              {processes.length > 0 && (
                <p className="text-xs text-gray-400 mt-1.5">
                  {processes.filter(p => p.is_completed).length} / {processes.length} 工程完了
                  {!autoMode && <span>（重み合計: {Math.round(totalWeight)}%）</span>}
                </p>
              )}
            </div>
          )
        })()}

        {/* 追加フォーム */}
        {addingProcess && (
          <div className="border border-indigo-200 rounded-lg p-4 mb-4 bg-indigo-50">
            <p className="text-xs font-medium text-indigo-700 mb-3">工程を追加</p>
            <div className="flex gap-3 text-sm">
              <div className="flex-1">
                <label className="label">工程名 <span className="text-red-500">*</span></label>
                <input className="input" placeholder="基礎配管工事" value={newProcess.name}
                  onChange={e => setNewProcess(p => ({ ...p, name: e.target.value }))}
                  onKeyDown={e => e.key === 'Enter' && handleAddProcess()} />
              </div>
              <div className="w-28">
                <label className="label">重み（%）</label>
                <input type="number" min="0" max="100" className="input text-right" placeholder="0"
                  value={newProcess.weight}
                  onChange={e => setNewProcess(p => ({ ...p, weight: e.target.value }))} />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-3">
              <button type="button" onClick={() => { setAddingProcess(false); setNewProcess({ name: '', weight: '' }) }}
                className="btn-secondary text-xs flex items-center gap-1">
                <X className="h-3.5 w-3.5" />キャンセル
              </button>
              <button type="button" onClick={handleAddProcess} disabled={savingProcess}
                className="btn-primary text-xs flex items-center gap-1">
                {savingProcess ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                追加
              </button>
            </div>
          </div>
        )}

        {/* 工程リスト */}
        {processes.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-4">工程が登録されていません</p>
        ) : (
          <div className="space-y-2">
            {processes.map(p => (
              <div key={p.id} className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${p.is_completed ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200'}`}>
                <button type="button" onClick={() => handleToggleProcess(p)}
                  className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${p.is_completed ? 'bg-green-500 border-green-500' : 'border-gray-300 hover:border-indigo-400'}`}>
                  {p.is_completed ? <CheckCircle className="h-3.5 w-3.5 text-white" /> : null}
                </button>
                <input
                  className={`flex-1 text-sm bg-transparent border-0 outline-none focus:bg-white focus:border focus:border-indigo-300 focus:rounded px-1 ${p.is_completed ? 'line-through text-gray-400' : 'text-gray-800'}`}
                  defaultValue={p.name}
                  onBlur={e => { if (e.target.value !== p.name) handleUpdateProcessName(p, e.target.value) }}
                  onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
                />
                <div className="flex items-center gap-1 flex-shrink-0">
                  <input
                    type="number" min="0" max="100"
                    className="w-16 text-xs text-right bg-gray-100 rounded px-2 py-1 border-0 outline-none focus:bg-white focus:ring-1 focus:ring-indigo-300"
                    defaultValue={p.weight || ''}
                    placeholder="0"
                    onBlur={e => { const v = Number(e.target.value) || 0; if (v !== p.weight) handleUpdateProcessWeight(p, v) }}
                    onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
                  />
                  <span className="text-xs text-gray-400">%</span>
                </div>
                <button type="button" onClick={() => handleDeleteProcess(p.id)}
                  className="text-gray-300 hover:text-red-500 transition-colors flex-shrink-0">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 外注先支払い管理 */}
      <div className="card p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-orange-500" />
            <h3 className="font-semibold text-gray-900 text-sm">外注先支払い管理</h3>
          </div>
          {!addingSubPayment && (
            <button type="button" onClick={() => setAddingSubPayment(true)}
              className="flex items-center gap-1 text-xs text-orange-600 hover:text-orange-700 border border-orange-300 hover:border-orange-500 px-2.5 py-1 rounded-lg transition-colors">
              <Plus className="h-3.5 w-3.5" />支払いを追加
            </button>
          )}
        </div>

        {/* サマリー */}
        <div className="grid grid-cols-3 gap-3 mb-4 p-3 bg-orange-50 rounded-lg text-xs text-center">
          <div>
            <p className="text-gray-400 mb-0.5">外注費（予算）</p>
            <p className="font-semibold text-gray-800">{formatCurrency(Number(form.subcontract_cost) || 0)}</p>
          </div>
          <div>
            <p className="text-gray-400 mb-0.5">支払い合計</p>
            <p className="font-semibold text-orange-700">{formatCurrency(subPayments.reduce((s, p) => s + p.amount, 0))}</p>
          </div>
          <div>
            <p className="text-gray-400 mb-0.5">未払い残高</p>
            {(() => {
              const unpaid = (Number(form.subcontract_cost) || 0) - subPayments.reduce((s, p) => s + p.amount, 0)
              return (
                <p className={`font-semibold ${unpaid > 0 ? 'text-red-600' : unpaid < 0 ? 'text-amber-600' : 'text-green-700'}`}>
                  {formatCurrency(unpaid)}
                </p>
              )
            })()}
          </div>
        </div>

        {/* 追加フォーム */}
        {addingSubPayment && (
          <div className="border border-orange-200 rounded-lg p-4 mb-4 bg-orange-50">
            <p className="text-xs font-medium text-orange-700 mb-3">支払いを追加</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div className="md:col-span-2">
                <label className="label">外注先会社名 <span className="text-red-500">*</span></label>
                <input className="input" placeholder="株式会社〇〇" value={newSubPayment.company_name}
                  onChange={e => setNewSubPayment(p => ({ ...p, company_name: e.target.value }))} />
              </div>
              <div>
                <label className="label">支払い金額（円）</label>
                <CurrencyInput className="input text-right" value={newSubPayment.amount}
                  onChange={v => setNewSubPayment(p => ({ ...p, amount: String(v) }))} />
              </div>
              <div>
                <label className="label">支払い日</label>
                <input type="date" className="input" value={newSubPayment.payment_date}
                  onChange={e => setNewSubPayment(p => ({ ...p, payment_date: e.target.value }))} />
              </div>
              <div className="md:col-span-4">
                <label className="label">支払い内容</label>
                <input className="input" placeholder="電気配線工事 一式" value={newSubPayment.description}
                  onChange={e => setNewSubPayment(p => ({ ...p, description: e.target.value }))} />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-3">
              <button type="button" onClick={() => { setAddingSubPayment(false); setNewSubPayment({ company_name: '', amount: '', payment_date: '', description: '' }) }}
                className="btn-secondary text-xs flex items-center gap-1">
                <X className="h-3.5 w-3.5" />キャンセル
              </button>
              <button type="button" onClick={handleAddSubPayment} disabled={savingSubPayment}
                className="btn-primary text-xs flex items-center gap-1">
                {savingSubPayment ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                保存
              </button>
            </div>
          </div>
        )}

        {/* 支払い一覧 */}
        {subPayments.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-4">支払い記録がありません</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-3 py-2 text-gray-400 font-medium text-xs">外注先</th>
                  <th className="text-left px-3 py-2 text-gray-400 font-medium text-xs">支払い内容</th>
                  <th className="text-left px-3 py-2 text-gray-400 font-medium text-xs">支払い日</th>
                  <th className="text-right px-3 py-2 text-gray-400 font-medium text-xs">金額</th>
                  <th className="px-3 py-2 w-8"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {subPayments.map(p => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2 font-medium text-gray-900">{p.company_name}</td>
                    <td className="px-3 py-2 text-gray-600">{p.description || '—'}</td>
                    <td className="px-3 py-2 text-gray-500">{p.payment_date || '—'}</td>
                    <td className="px-3 py-2 text-right font-medium text-orange-700">{formatCurrency(p.amount)}</td>
                    <td className="px-3 py-2">
                      <button type="button" onClick={() => handleDeleteSubPayment(p.id)}
                        className="text-gray-300 hover:text-red-500 transition-colors">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t-2 border-gray-200">
                <tr>
                  <td colSpan={3} className="px-3 py-2 text-xs text-gray-500 font-medium">合計</td>
                  <td className="px-3 py-2 text-right font-bold text-orange-700">
                    {formatCurrency(subPayments.reduce((s, p) => s + p.amount, 0))}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* ファイル添付 */}
      <div className="card p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Paperclip className="h-4 w-4 text-purple-500" />
            <h3 className="font-semibold text-gray-900 text-sm">添付ファイル</h3>
          </div>
          <button type="button" onClick={() => fileInputRef.current?.click()}
            disabled={uploadingFile}
            className="flex items-center gap-1 text-xs text-purple-600 hover:text-purple-700 border border-purple-300 hover:border-purple-500 px-2.5 py-1 rounded-lg transition-colors disabled:opacity-50">
            {uploadingFile ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
            {uploadingFile ? 'アップロード中...' : 'ファイルを追加'}
          </button>
          <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileUpload}
            accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.dwg,.dxf" />
        </div>

        {files.length === 0 ? (
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-gray-200 rounded-lg p-8 text-center text-gray-400 text-sm cursor-pointer hover:border-purple-300 transition-colors">
            <Paperclip className="h-7 w-7 mx-auto mb-2 opacity-40" />
            <p>写真・図面・書類などをアップロード</p>
            <p className="text-xs mt-1">クリックしてファイルを選択（最大50MB）</p>
          </div>
        ) : (
          <div className="space-y-2">
            {files.map(f => (
              <div key={f.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <div className="flex-shrink-0">{fileIcon(f.mime_type)}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{f.original_name}</p>
                  <p className="text-xs text-gray-400">{formatSize(f.file_size)} · {f.uploaded_by || '不明'} · {f.created_at.slice(0, 10)}</p>
                </div>
                <a href={`/api/construction-ledger/${id}/files/${f.id}`}
                  className="text-blue-400 hover:text-blue-600 transition-colors p-1" title="ダウンロード">
                  <Download className="h-4 w-4" />
                </a>
                <button type="button" onClick={() => handleDeleteFile(f.id)}
                  className="text-gray-300 hover:text-red-500 transition-colors p-1">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
            <button type="button" onClick={() => fileInputRef.current?.click()}
              className="w-full text-xs text-gray-400 hover:text-purple-600 text-center py-2 border border-dashed border-gray-200 rounded-lg hover:border-purple-300 transition-colors">
              + さらに追加
            </button>
          </div>
        )}
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
