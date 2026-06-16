'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Save, Loader2, Link2, Upload, FileText, Image, CheckCircle, AlertCircle, X } from 'lucide-react'
import CurrencyInput from '@/components/CurrencyInput'

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
const ACCEPTED_TYPES = 'application/pdf,image/jpeg,image/png,image/webp,image/gif'

function formatCurrency(n: number) {
  return new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(Math.round(n))
}

type AiStatus = 'idle' | 'uploading' | 'analyzing' | 'done' | 'error'

export default function NewConstructionLedgerPage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [saving, setSaving] = useState(false)
  const [estimates, setEstimates] = useState<Estimate[]>([])
  const [aiStatus, setAiStatus] = useState<AiStatus>('idle')
  const [aiError, setAiError] = useState('')
  const [aiConfidence, setAiConfidence] = useState<string>('')
  const [dragOver, setDragOver] = useState(false)
  const [previewFile, setPreviewFile] = useState<{ name: string; type: string } | null>(null)

  const [form, setForm] = useState({
    project_name: '',
    client_name: '',
    location: '',
    contract_amount: '',
    advance_payment: '',
    advance_payment_date: '',
    advance_payment_payer: '',
    interim_payment: '',
    interim_payment_date: '',
    interim_payment_payer: '',
    final_payment: '',
    final_payment_date: '',
    final_payment_payer: '',
    total_amount: '',
    start_date: '',
    completion_date: '',
    completion_date_type: '予定',
    description: '',
    material_cost: '',
    labor_cost: '',
    subcontract_cost: '',
    site_misc_cost: '',
    purchase_cost: '',
    status: '未着工',
    assigned_to: '',
    payment_status: '未入金',
    partial_payment_date: '',
    notes: '',
    estimate_id: '',
  })

  useEffect(() => {
    fetch('/api/estimates')
      .then(r => r.json())
      .then(data => setEstimates(Array.isArray(data) ? data : []))
  }, [])

  const set = (field: string, value: string) => setForm(prev => ({ ...prev, [field]: value }))

  const handleEstimateLink = (estimateId: string) => {
    set('estimate_id', estimateId)
    if (!estimateId) return
    const est = estimates.find(e => String(e.id) === estimateId)
    if (!est) return
    if (!form.project_name) set('project_name', est.project_name || est.title)
    if (!form.client_name) set('client_name', est.customer_name)
    if (!form.contract_amount) {
      const total = Math.round(est.total_amount * (1 + est.tax_rate))
      set('contract_amount', String(total))
    }
  }

  const processFile = async (file: File) => {
    const allowed = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/gif']
    if (!allowed.includes(file.type)) {
      setAiError('PDF・画像（JPEG/PNG/WebP）のみアップロード可能です')
      setAiStatus('error')
      return
    }
    if (file.size > 20 * 1024 * 1024) {
      setAiError('ファイルサイズは20MB以下にしてください')
      setAiStatus('error')
      return
    }

    setPreviewFile({ name: file.name, type: file.type })
    setAiError('')
    setAiStatus('uploading')

    const formData = new FormData()
    formData.append('file', file)

    try {
      setAiStatus('analyzing')
      const res = await fetch('/api/analyze-estimate-doc', { method: 'POST', body: formData })
      const data = await res.json()

      if (!res.ok) {
        setAiError(data.error || '分析に失敗しました')
        setAiStatus('error')
        return
      }

      setForm(prev => ({
        ...prev,
        project_name: prev.project_name || data.project_name || '',
        client_name: prev.client_name || data.client_name || '',
        location: prev.location || data.location || '',
        contract_amount:
          prev.contract_amount || (data.contract_amount != null ? String(Math.round(data.contract_amount)) : ''),
        start_date: prev.start_date || data.start_date || '',
        completion_date: prev.completion_date || data.completion_date || '',
        description: prev.description || data.description || '',
      }))
      setAiConfidence(data.confidence || '')
      setAiStatus('done')
    } catch {
      setAiError('通信エラーが発生しました')
      setAiStatus('error')
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) processFile(file)
    e.target.value = ''
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) processFile(file)
  }

  const handleClearAi = () => {
    setAiStatus('idle')
    setAiError('')
    setAiConfidence('')
    setPreviewFile(null)
  }

  const profit =
    (Number(form.contract_amount) || 0) -
    (Number(form.material_cost) || 0) -
    (Number(form.labor_cost) || 0) -
    (Number(form.subcontract_cost) || 0) -
    (Number(form.site_misc_cost) || 0) -
    (Number(form.purchase_cost) || 0)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.project_name.trim()) { alert('工事名を入力してください'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/construction-ledger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          contract_amount: Number(form.contract_amount) || 0,
          advance_payment: Number(form.advance_payment) || 0,
          advance_payment_date: form.advance_payment_date,
          advance_payment_payer: form.advance_payment_payer,
          interim_payment: Number(form.interim_payment) || 0,
          interim_payment_date: form.interim_payment_date,
          interim_payment_payer: form.interim_payment_payer,
          final_payment: Number(form.final_payment) || 0,
          final_payment_date: form.final_payment_date,
          final_payment_payer: form.final_payment_payer,
          total_amount: Number(form.total_amount) || 0,
          material_cost: Number(form.material_cost) || 0,
          labor_cost: Number(form.labor_cost) || 0,
          subcontract_cost: Number(form.subcontract_cost) || 0,
          site_misc_cost: Number(form.site_misc_cost) || 0,
          purchase_cost: Number(form.purchase_cost) || 0,
          estimate_id: form.estimate_id ? Number(form.estimate_id) : null,
        }),
      })
      if (!res.ok) { alert('保存に失敗しました'); return }
      const data = await res.json()
      router.push(`/construction-ledger/${data.id}`)
    } catch {
      alert('保存に失敗しました')
    } finally {
      setSaving(false)
    }
  }

  const isAnalyzing = aiStatus === 'uploading' || aiStatus === 'analyzing'

  return (
    <div className="p-8 max-w-3xl">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/construction-ledger" className="text-gray-400 hover:text-gray-600">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">新規工事登録</h2>
          <p className="text-gray-500 text-sm mt-1">工事台帳に新しい工事を登録します</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* AI自動入力 */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Upload className="h-4 w-4 text-purple-500" />
            <h3 className="font-semibold text-gray-900 text-sm">AIで自動入力（任意）</h3>
          </div>

          {aiStatus === 'idle' || aiStatus === 'error' ? (
            <>
              <div
                onClick={() => !isAnalyzing && fileInputRef.current?.click()}
                onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
                  ${dragOver
                    ? 'border-purple-400 bg-purple-50'
                    : 'border-gray-300 hover:border-purple-400 hover:bg-purple-50'
                  }`}
              >
                <div className="flex justify-center gap-3 mb-3 text-gray-400">
                  <FileText className="h-8 w-8" />
                  <Image className="h-8 w-8" />
                </div>
                <p className="text-sm font-medium text-gray-700">見積書をドラッグ＆ドロップ</p>
                <p className="text-xs text-gray-400 mt-1">または クリックしてファイルを選択</p>
                <p className="text-xs text-gray-400 mt-0.5">PDF・JPEG・PNG・WebP（最大20MB）</p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPTED_TYPES}
                className="hidden"
                onChange={handleFileChange}
              />
              {aiStatus === 'error' && (
                <div className="mt-3 flex items-start gap-2 text-red-600 text-sm">
                  <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                  <span>{aiError}</span>
                </div>
              )}
              <p className="text-gray-400 text-xs mt-2">
                見積書をアップロードするとAIが工事名・発注者・金額などを自動で読み取ります
              </p>
            </>
          ) : isAnalyzing ? (
            <div className="flex flex-col items-center gap-3 py-8">
              <Loader2 className="h-8 w-8 text-purple-500 animate-spin" />
              <p className="text-sm text-gray-600">
                {aiStatus === 'uploading' ? 'ファイルをアップロード中...' : 'AIが見積書を解析中...'}
              </p>
              {previewFile && (
                <p className="text-xs text-gray-400">{previewFile.name}</p>
              )}
            </div>
          ) : aiStatus === 'done' ? (
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-green-700">自動入力が完了しました</p>
                {previewFile && (
                  <p className="text-xs text-gray-400 mt-0.5 truncate">{previewFile.name}</p>
                )}
                {aiConfidence && (
                  <p className="text-xs text-gray-400 mt-0.5">
                    読み取り精度：
                    <span className={aiConfidence === 'high' ? 'text-green-600' : aiConfidence === 'medium' ? 'text-yellow-600' : 'text-red-500'}>
                      {aiConfidence === 'high' ? '高' : aiConfidence === 'medium' ? '中' : '低'}
                    </span>
                    　内容を確認して必要に応じて修正してください
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={handleClearAi}
                className="text-gray-400 hover:text-gray-600 flex-shrink-0"
                title="別のファイルをアップロード"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : null}
        </div>

        {/* 見積もり連携 */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Link2 className="h-4 w-4 text-blue-500" />
            <h3 className="font-semibold text-gray-900 text-sm">見積もり連携（任意）</h3>
          </div>
          <div>
            <label className="label">連携する見積もり</label>
            <select className="input" value={form.estimate_id} onChange={e => handleEstimateLink(e.target.value)}>
              <option value="">連携しない</option>
              {estimates.map(e => (
                <option key={e.id} value={e.id}>
                  {e.title}（{e.project_name || e.customer_name}）
                  — {formatCurrency(e.total_amount * (1 + e.tax_rate))}
                </option>
              ))}
            </select>
            <p className="text-gray-400 text-xs mt-1">連携すると工事名・発注者・契約金額が自動入力されます</p>
          </div>
        </div>

        {/* 基本情報 */}
        <div className="card p-5">
          <h3 className="font-semibold text-gray-900 text-sm mb-4">基本情報</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="label">工事名 <span className="text-red-500">*</span></label>
              <input className="input" value={form.project_name} onChange={e => set('project_name', e.target.value)} placeholder="〇〇ビル電気工事" required />
            </div>
            <div>
              <label className="label">発注者</label>
              <input className="input" value={form.client_name} onChange={e => set('client_name', e.target.value)} placeholder="株式会社〇〇" />
            </div>
            <div>
              <label className="label">工事場所</label>
              <input className="input" value={form.location} onChange={e => set('location', e.target.value)} placeholder="東京都〇〇区..." />
            </div>
            <div>
              <label className="label">着工日</label>
              <input type="date" className="input" value={form.start_date} onChange={e => set('start_date', e.target.value)} />
            </div>
            <div>
              <label className="label">完成日</label>
              <div className="flex gap-1 mb-1">
                {['予定', '完了'].map(t => (
                  <button key={t} type="button"
                    onClick={() => set('completion_date_type', t)}
                    className={`text-xs px-2.5 py-0.5 rounded-full border transition-colors ${
                      form.completion_date_type === t
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'text-gray-500 border-gray-300 hover:border-blue-400'
                    }`}
                  >{t}</button>
                ))}
              </div>
              <input type="date" className="input" value={form.completion_date} onChange={e => set('completion_date', e.target.value)} />
            </div>
            <div>
              <label className="label">工事ステータス</label>
              <select className="input" value={form.status} onChange={e => set('status', e.target.value)}>
                {WORK_STATUSES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="label">担当者</label>
              <input className="input" value={form.assigned_to} onChange={e => set('assigned_to', e.target.value)} placeholder="山田 太郎" />
            </div>
            <div className="md:col-span-2">
              <label className="label">工事内容</label>
              <textarea className="input" rows={3} value={form.description} onChange={e => set('description', e.target.value)} placeholder="電気設備工事一式..." />
            </div>
          </div>
        </div>

        {/* 金額 */}
        <div className="card p-5">
          <h3 className="font-semibold text-gray-900 text-sm mb-4">金額情報</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">契約金額（円）</label>
              <CurrencyInput className="input text-right" value={form.contract_amount} onChange={v => set('contract_amount', String(v))} />
            </div>
            <div>
              <label className="label">総額（円）</label>
              <CurrencyInput className="input text-right" value={form.total_amount} onChange={v => set('total_amount', String(v))} />
            </div>
            <div>
              <label className="label">材料費（円）</label>
              <CurrencyInput className="input text-right" value={form.material_cost} onChange={v => set('material_cost', String(v))} />
            </div>
            <div>
              <label className="label">労務費（円）</label>
              <CurrencyInput className="input text-right" value={form.labor_cost} onChange={v => set('labor_cost', String(v))} />
            </div>
            <div>
              <label className="label">外注費（円）</label>
              <CurrencyInput className="input text-right" value={form.subcontract_cost} onChange={v => set('subcontract_cost', String(v))} />
            </div>
            <div>
              <label className="label">現場雑費（円）</label>
              <CurrencyInput className="input text-right" value={form.site_misc_cost} onChange={v => set('site_misc_cost', String(v))} />
            </div>
            <div>
              <label className="label">購入費（円）</label>
              <CurrencyInput className="input text-right" value={form.purchase_cost} onChange={v => set('purchase_cost', String(v))} />
            </div>
          </div>

          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-500">
                利益（契約金額 − 材料費 − 労務費 − 外注費 − 現場雑費 − 購入費）
              </span>
              <span className={`font-bold text-lg ${profit >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                {formatCurrency(profit)}
              </span>
            </div>
            {Number(form.contract_amount) > 0 && (
              <p className="text-right text-xs text-gray-400 mt-0.5">
                利益率 {Math.round(profit / Number(form.contract_amount) * 100)}%
              </p>
            )}
          </div>
        </div>

        {/* 入金管理 */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <h3 className="font-semibold text-gray-900 text-sm">入金管理（着手金・中間金・完成金）</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-3 py-2 text-gray-400 font-medium text-xs w-20">種別</th>
                  <th className="text-right px-3 py-2 text-gray-400 font-medium text-xs">金額（円）</th>
                  <th className="text-left px-3 py-2 text-gray-400 font-medium text-xs">入金日</th>
                  <th className="text-left px-3 py-2 text-gray-400 font-medium text-xs">入金元（会社名）</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {[
                  { label: '着手金', badge: 'bg-blue-100 text-blue-700',
                    amtKey: 'advance_payment' as const, dateKey: 'advance_payment_date' as const, payerKey: 'advance_payment_payer' as const },
                  { label: '中間金', badge: 'bg-yellow-100 text-yellow-700',
                    amtKey: 'interim_payment' as const, dateKey: 'interim_payment_date' as const, payerKey: 'interim_payment_payer' as const },
                  { label: '完成金', badge: 'bg-green-100 text-green-700',
                    amtKey: 'final_payment' as const, dateKey: 'final_payment_date' as const, payerKey: 'final_payment_payer' as const },
                ].map(r => (
                  <tr key={r.label}>
                    <td className="px-3 py-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${r.badge}`}>{r.label}</span>
                    </td>
                    <td className="px-3 py-2">
                      <CurrencyInput className="input text-right text-sm py-1.5" value={form[r.amtKey]}
                        onChange={v => set(r.amtKey, String(v))} />
                    </td>
                    <td className="px-3 py-2">
                      <input type="date" className="input text-sm py-1.5" value={form[r.dateKey]}
                        onChange={e => set(r.dateKey, e.target.value)} />
                    </td>
                    <td className="px-3 py-2">
                      <input className="input text-sm py-1.5" value={form[r.payerKey]}
                        onChange={e => set(r.payerKey, e.target.value)} placeholder="株式会社〇〇" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 入金・備考 */}
        <div className="card p-5">
          <h3 className="font-semibold text-gray-900 text-sm mb-4">入金・備考</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">入金状況</label>
              <select className="input" value={form.payment_status} onChange={e => set('payment_status', e.target.value)}>
                {PAYMENT_STATUSES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            {form.payment_status === '一部入金' && (
              <div>
                <label className="label">一部入金日</label>
                <input type="date" className="input" value={form.partial_payment_date} onChange={e => set('partial_payment_date', e.target.value)} />
              </div>
            )}
            <div className={form.payment_status === '一部入金' ? 'md:col-span-2' : ''}>
              <label className="label">備考</label>
              <input className="input" value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="特記事項など" />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Link href="/construction-ledger" className="btn-secondary">キャンセル</Link>
          <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            登録する
          </button>
        </div>
      </form>
    </div>
  )
}
