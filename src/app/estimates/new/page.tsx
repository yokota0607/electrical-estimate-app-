'use client'

import { useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Upload, FileText, Loader2, Trash2, Plus, ChevronDown, ChevronUp, Save, Wand2, AlertCircle } from 'lucide-react'

interface Material {
  name: string
  category: string
  quantity: number
  unit: string
  unit_price: number
  notes: string
}

interface UnitPrice {
  id: number
  name: string
  category: string
  unit: string
  price: number
}

const CATEGORIES = [
  '電線・ケーブル', '配管・電線管', '照明器具', 'コンセント・スイッチ',
  '分電盤・ブレーカー', '動力設備', '通信・弱電設備', '接地工事', '電気工事材料', 'その他'
]

const UNITS = ['m', '本', '個', '台', '組', '式', 'ヶ所', 'セット', 'kg', '枚']

function formatCurrency(n: number) {
  return new Intl.NumberFormat('ja-JP').format(Math.round(n))
}

export default function NewEstimatePage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [step, setStep] = useState<'upload' | 'review' | 'save'>('upload')
  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [pdfFilename, setPdfFilename] = useState('')
  const [analyzing, setAnalyzing] = useState(false)
  const [analyzeError, setAnalyzeError] = useState('')
  const [aiSummary, setAiSummary] = useState('')
  const [items, setItems] = useState<Material[]>([])
  const [unitPrices, setUnitPrices] = useState<UnitPrice[]>([])
  const [dragging, setDragging] = useState(false)
  const [saving, setSaving] = useState(false)

  const [title, setTitle] = useState('')
  const [projectName, setProjectName] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [createdBy, setCreatedBy] = useState('')
  const [notes, setNotes] = useState('')
  const [taxRate, setTaxRate] = useState(10)

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file?.type === 'application/pdf') {
      setPdfFile(file)
      setTitle(file.name.replace('.pdf', ''))
    }
  }, [])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setPdfFile(file)
      setTitle(file.name.replace('.pdf', ''))
    }
  }

  const analyzePDF = async () => {
    if (!pdfFile) return
    setAnalyzing(true)
    setAnalyzeError('')

    try {
      const [analyzeRes, pricesRes] = await Promise.all([
        (async () => {
          const fd = new FormData()
          fd.append('pdf', pdfFile)
          return fetch('/api/analyze', { method: 'POST', body: fd })
        })(),
        fetch('/api/unit-prices'),
      ])

      const prices: UnitPrice[] = await pricesRes.json()
      setUnitPrices(Array.isArray(prices) ? prices : [])

      if (!analyzeRes.ok) {
        const err = await analyzeRes.json()
        throw new Error(err.error || 'AI分析に失敗しました')
      }

      const data = await analyzeRes.json()
      setPdfFilename(data.filename || '')
      setAiSummary(data.summary || '')

      const enriched: Material[] = (data.materials || []).map((m: Omit<Material, 'unit_price'>) => {
        const matched = prices.find(p =>
          p.name.includes(m.name) || m.name.includes(p.name) ||
          p.name.toLowerCase() === m.name.toLowerCase()
        )
        return {
          ...m,
          unit_price: matched ? matched.price : 0,
        }
      })

      setItems(enriched)
      setStep('review')
    } catch (err) {
      setAnalyzeError(err instanceof Error ? err.message : '分析エラーが発生しました')
    } finally {
      setAnalyzing(false)
    }
  }

  const updateItem = (idx: number, field: keyof Material, value: string | number) => {
    setItems(prev => prev.map((item, i) => {
      if (i !== idx) return item
      const updated = { ...item, [field]: value }
      if (field === 'quantity' || field === 'unit_price') {
        // recalc not needed here, amount is computed at display
      }
      return updated
    }))
  }

  const removeItem = (idx: number) => {
    setItems(prev => prev.filter((_, i) => i !== idx))
  }

  const addItem = () => {
    setItems(prev => [...prev, { name: '', category: '電気工事材料', quantity: 1, unit: '個', unit_price: 0, notes: '' }])
  }

  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0)
  const tax = subtotal * (taxRate / 100)
  const total = subtotal + tax

  const handleSave = async () => {
    if (!title) { alert('見積もりタイトルを入力してください'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/estimates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title, project_name: projectName, customer_name: customerName,
          pdf_filename: pdfFilename, notes, created_by: createdBy,
          tax_rate: taxRate / 100,
          items: items.map(item => ({
            name: item.name, category: item.category,
            quantity: item.quantity, unit: item.unit,
            unit_price: item.unit_price, notes: item.notes,
          })),
        }),
      })
      if (!res.ok) throw new Error('保存に失敗しました')
      const data = await res.json()
      router.push(`/estimates/${data.estimate.id}`)
    } catch (err) {
      alert(err instanceof Error ? err.message : '保存エラー')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-8 max-w-5xl">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">新規見積もり作成</h2>
        <p className="text-gray-500 text-sm mt-1">PDF図面をアップロードしてAIが材料を自動拾い出しします</p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-8">
        {['upload', 'review', 'save'].map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${
              step === s ? 'bg-blue-600 text-white' :
              (['upload', 'review', 'save'].indexOf(step) > i) ? 'bg-green-500 text-white' :
              'bg-gray-200 text-gray-500'
            }`}>{i + 1}</div>
            <span className={`text-sm ${step === s ? 'text-blue-600 font-medium' : 'text-gray-400'}`}>
              {s === 'upload' ? 'PDF選択' : s === 'review' ? '材料確認' : '保存'}
            </span>
            {i < 2 && <div className="w-8 h-px bg-gray-300 mx-1" />}
          </div>
        ))}
      </div>

      {/* STEP 1: Upload */}
      {step === 'upload' && (
        <div className="card p-6">
          <div
            className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors cursor-pointer ${
              dragging ? 'border-blue-400 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
            }`}
            onDragOver={e => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input ref={fileInputRef} type="file" accept=".pdf" className="hidden" onChange={handleFileChange} />
            {pdfFile ? (
              <div>
                <FileText className="h-14 w-14 text-blue-500 mx-auto mb-3" />
                <p className="font-semibold text-gray-900">{pdfFile.name}</p>
                <p className="text-gray-400 text-sm mt-1">{(pdfFile.size / 1024 / 1024).toFixed(2)} MB</p>
                <button
                  onClick={e => { e.stopPropagation(); setPdfFile(null) }}
                  className="mt-3 text-red-500 text-sm hover:underline"
                >
                  別のファイルを選択
                </button>
              </div>
            ) : (
              <div>
                <Upload className="h-14 w-14 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600 font-medium">PDFをドラッグ＆ドロップ</p>
                <p className="text-gray-400 text-sm mt-1">またはクリックしてファイルを選択（最大20MB）</p>
              </div>
            )}
          </div>

          {analyzeError && (
            <div className="mt-4 flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {analyzeError}
            </div>
          )}

          <div className="mt-6 flex gap-3">
            <button
              className="btn-primary flex items-center gap-2 flex-1 justify-center"
              disabled={!pdfFile || analyzing}
              onClick={analyzePDF}
            >
              {analyzing ? (
                <><Loader2 className="h-4 w-4 animate-spin" />AI分析中... しばらくお待ちください</>
              ) : (
                <><Wand2 className="h-4 w-4" />AIで材料を自動拾い出し</>
              )}
            </button>
            <button className="btn-secondary" onClick={() => {
              setItems([])
              setStep('review')
            }}>
              手動で入力
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: Review items */}
      {step === 'review' && (
        <div className="space-y-6">
          {aiSummary && (
            <div className="card p-4 bg-blue-50 border-blue-100">
              <p className="text-sm text-blue-700"><span className="font-semibold">AI分析結果: </span>{aiSummary}</p>
            </div>
          )}

          <div className="card">
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900">拾い出し材料一覧 ({items.length}件)</h3>
              <button className="btn-secondary text-sm flex items-center gap-1" onClick={addItem}>
                <Plus className="h-4 w-4" />追加
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-4 py-3 text-gray-500 font-medium w-8">#</th>
                    <th className="text-left px-4 py-3 text-gray-500 font-medium">材料名</th>
                    <th className="text-left px-4 py-3 text-gray-500 font-medium w-36">カテゴリ</th>
                    <th className="text-left px-4 py-3 text-gray-500 font-medium w-24">数量</th>
                    <th className="text-left px-4 py-3 text-gray-500 font-medium w-20">単位</th>
                    <th className="text-left px-4 py-3 text-gray-500 font-medium w-28">単価（円）</th>
                    <th className="text-left px-4 py-3 text-gray-500 font-medium w-28">金額（円）</th>
                    <th className="px-4 py-3 w-8"></th>
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
                            <option value={item.unit}>{item.unit}</option>
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
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                  {items.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-gray-400">
                        材料が追加されていません。「追加」ボタンで手動追加できます。
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
                  <span className="text-gray-500">小計</span>
                  <span className="font-medium">¥{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">消費税</span>
                  <div className="flex items-center gap-1">
                    <select className="border border-gray-200 rounded px-2 py-1 text-xs w-16"
                      value={taxRate} onChange={e => setTaxRate(Number(e.target.value))}>
                      <option value={0}>0%</option>
                      <option value={8}>8%</option>
                      <option value={10}>10%</option>
                    </select>
                    <span className="font-medium">¥{formatCurrency(tax)}</span>
                  </div>
                </div>
                <div className="flex justify-between pt-2 border-t border-gray-200">
                  <span className="font-semibold">合計（税込）</span>
                  <span className="font-bold text-lg text-blue-600">¥{formatCurrency(total)}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button className="btn-secondary" onClick={() => setStep('upload')}>
              <ChevronDown className="h-4 w-4 rotate-90 inline mr-1" />戻る
            </button>
            <button className="btn-primary flex-1 flex items-center justify-center gap-2"
              onClick={() => setStep('save')}>
              次へ：見積もり情報を入力
              <ChevronUp className="h-4 w-4 rotate-90" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: Save */}
      {step === 'save' && (
        <div className="space-y-6">
          <div className="card p-6">
            <h3 className="font-semibold text-gray-900 mb-4">見積もり情報</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="label">見積もりタイトル <span className="text-red-500">*</span></label>
                <input className="input" placeholder="例：○○ビル電気工事見積もり" value={title} onChange={e => setTitle(e.target.value)} />
              </div>
              <div>
                <label className="label">工事名・現場名</label>
                <input className="input" placeholder="例：○○ビル新築工事" value={projectName} onChange={e => setProjectName(e.target.value)} />
              </div>
              <div>
                <label className="label">顧客・発注者名</label>
                <input className="input" placeholder="例：株式会社○○" value={customerName} onChange={e => setCustomerName(e.target.value)} />
              </div>
              <div>
                <label className="label">担当者名</label>
                <input className="input" placeholder="例：田中太郎" value={createdBy} onChange={e => setCreatedBy(e.target.value)} />
              </div>
              <div>
                <label className="label">備考</label>
                <input className="input" placeholder="特記事項など" value={notes} onChange={e => setNotes(e.target.value)} />
              </div>
            </div>
          </div>

          <div className="card p-4 bg-blue-50 border-blue-100">
            <div className="flex items-center justify-between text-sm">
              <span className="text-blue-700">材料費小計: <strong>¥{formatCurrency(subtotal)}</strong></span>
              <span className="text-blue-700">消費税({taxRate}%): <strong>¥{formatCurrency(tax)}</strong></span>
              <span className="text-blue-900 font-bold text-base">合計（税込）: ¥{formatCurrency(total)}</span>
            </div>
          </div>

          <div className="flex gap-3">
            <button className="btn-secondary" onClick={() => setStep('review')}>
              <ChevronDown className="h-4 w-4 rotate-90 inline mr-1" />戻る
            </button>
            <button className="btn-primary flex-1 flex items-center justify-center gap-2"
              disabled={saving} onClick={handleSave}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              見積もりを保存
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
