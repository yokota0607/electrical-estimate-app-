'use client'

import { useEffect, useState, use, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, Save, Trash2, Loader2, CheckCircle, Link2, Edit2, Plus, X, Banknote,
  Paperclip, Download, FileText, Image as ImageIcon, File, Building2, ClipboardList, ShoppingCart, ChevronRight,
  Camera, NotebookPen, Clock, User
} from 'lucide-react'
import CurrencyInput from '@/components/CurrencyInput'
import TaxCurrencyInput from '@/components/TaxCurrencyInput'

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
  category: string
  label: string
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

interface SitePhoto {
  id: number
  ledger_id: number
  stored_name: string
  original_name: string
  file_size: number
  mime_type: string
  phase: string
  caption: string
  uploaded_by: string
  created_at: string
}

interface DailyReport {
  id: number
  ledger_id: number
  report_date: string
  work_content: string
  worker_name: string
  work_hours: number
  created_by: string
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

interface PurchaseOrderSummary {
  id: number
  order_number: string
  order_date: string
  supplier: string
  delivery_date: string
  actual_delivery_date: string
  is_received: number
  total_amount: number
  order_category: string
  order_payment_status: string
  payment_date: string
  notes: string
}

interface OrderItem {
  name: string
  quantity: number
  unit: string
  unit_price: number
  amount: number
  _key: number
}

interface OrderDraft {
  supplier: string
  items: OrderItem[]
  subtotal: number
  tax: number
  total: number
  notes: string
  fileId: number
  fileUrl: string
}

const FILE_CATEGORIES = ['図面', '見積書(受領)', '見積書(提出)', '契約書', '写真', 'その他']
const DRAWING_LABELS = ['電気系統図', '配線ルート図', '平面図', '単線結線図', '外線図', '盤結線図']
const CATEGORY_STYLE: Record<string, string> = {
  '図面':        'bg-blue-100 text-blue-700',
  '見積書':      'bg-green-100 text-green-700',
  '見積書(受領)': 'bg-green-100 text-green-700',
  '見積書(提出)': 'bg-teal-100 text-teal-700',
  '契約書':      'bg-purple-100 text-purple-700',
  '写真':        'bg-orange-100 text-orange-700',
  'その他':      'bg-gray-100 text-gray-600',
}

const ORDER_CATEGORIES = ['電気工事材料', '空調機器', '高圧機器・キュービクル', '照明器具', 'EV充電器', '制御盤', '外注工事', 'その他']
const ORDER_PAYMENT_STATUSES = ['未払い', '支払済み']
const PHOTO_PHASES = ['施工前', '施工中', '完了後']
const PHOTO_PHASE_STYLE: Record<string, string> = {
  '施工前': 'bg-sky-100 text-sky-700',
  '施工中': 'bg-amber-100 text-amber-700',
  '完了後': 'bg-green-100 text-green-700',
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
  const [pendingUpload, setPendingUpload] = useState<{ file: File; category: string; label: string } | null>(null)
  const [editingFileId, setEditingFileId] = useState<number | null>(null)
  const [editFileForm, setEditFileForm] = useState({ category: 'その他', label: '' })
  const [savingFileEdit, setSavingFileEdit] = useState(false)

  const [hasApiKey, setHasApiKey] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [orderDraft, setOrderDraft] = useState<OrderDraft | null>(null)
  const [registeringOrder, setRegisteringOrder] = useState(false)
  const [showUploadChoice, setShowUploadChoice] = useState(false)

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

  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrderSummary[]>([])
  const [showOrderForm, setShowOrderForm] = useState(false)

  const [photos, setPhotos] = useState<SitePhoto[]>([])
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [photoPhase, setPhotoPhase] = useState('施工前')
  const [photoFilter, setPhotoFilter] = useState('すべて')
  const [lightbox, setLightbox] = useState<SitePhoto | null>(null)
  const photoInputRef = useRef<HTMLInputElement>(null)

  const [reports, setReports] = useState<DailyReport[]>([])
  const [savingReport, setSavingReport] = useState(false)
  const [newReport, setNewReport] = useState({
    report_date: new Date().toISOString().slice(0, 10),
    worker_name: '',
    work_hours: '',
    work_content: '',
  })

  const loadProcesses = async () => {
    const res = await fetch(`/api/construction-ledger/${id}/processes`)
    if (res.ok) setProcesses(await res.json())
  }

  const loadPurchaseOrders = async () => {
    const res = await fetch(`/api/purchase-orders?ledger_id=${id}`)
    if (res.ok) setPurchaseOrders(await res.json())
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
    loadPurchaseOrders()
    loadPhotos()
    loadReports()
    fetch('/api/estimates').then(r => r.json()).then(d => setEstimates(Array.isArray(d) ? d : []))
    fetch('/api/system/capabilities').then(r => r.json()).then(d => setHasApiKey(!!d.hasAnthropicKey))
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

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const defaultCategory = file.type.startsWith('image/') ? '写真' : 'その他'
    setPendingUpload({ file, category: defaultCategory, label: '' })
    e.target.value = ''
  }

  const handlePendingUpload = async () => {
    if (!pendingUpload) return
    setUploadingFile(true)
    try {
      const fd = new FormData()
      fd.append('file', pendingUpload.file)
      fd.append('category', pendingUpload.category)
      fd.append('label', pendingUpload.label)
      const res = await fetch(`/api/construction-ledger/${id}/files`, { method: 'POST', body: fd })
      if (!res.ok) { alert('アップロードに失敗しました'); return }
      setPendingUpload(null)
      loadFiles()
    } finally {
      setUploadingFile(false)
    }
  }

  const handleDeleteFile = async (fid: number) => {
    if (!confirm('このファイルを削除しますか？')) return
    await fetch(`/api/construction-ledger/${id}/files/${fid}`, { method: 'DELETE' })
    loadFiles()
  }

  const startAnalysis = async (file: ConstructionFile) => {
    setAnalyzing(true)
    setOrderDraft(null)
    try {
      const res = await fetch(`/api/construction-ledger/${id}/files/${file.id}/analyze-order`, { method: 'POST' })
      if (!res.ok) {
        const err = await res.json()
        alert(`読み取りエラー: ${err.error}`)
        return
      }
      const data = await res.json()
      const fileUrl = file.stored_name.startsWith('http')
        ? file.stored_name
        : file.stored_name
      setOrderDraft({
        supplier: data.supplier || '',
        items: (data.items || []).map((it: { name: string; quantity: number; unit: string; unit_price: number; amount: number }, i: number) => ({ ...it, _key: i })),
        subtotal: data.subtotal || 0,
        tax: data.tax || 0,
        total: data.total || 0,
        notes: data.notes || '',
        fileId: file.id,
        fileUrl,
      })
    } finally {
      setAnalyzing(false)
    }
  }

  const handlePendingUploadAndAnalyze = async () => {
    if (!pendingUpload) return
    setUploadingFile(true)
    try {
      const fd = new FormData()
      fd.append('file', pendingUpload.file)
      fd.append('category', pendingUpload.category)
      fd.append('label', pendingUpload.label)
      const res = await fetch(`/api/construction-ledger/${id}/files`, { method: 'POST', body: fd })
      if (!res.ok) { alert('アップロードに失敗しました'); return }
      const uploadedFile = await res.json() as ConstructionFile
      setPendingUpload(null)
      setShowUploadChoice(false)
      loadFiles()
      await startAnalysis(uploadedFile)
    } finally {
      setUploadingFile(false)
    }
  }

  const handleRegisterOrder = async () => {
    if (!orderDraft) return
    setRegisteringOrder(true)
    try {
      const itemTotal = orderDraft.items.reduce((s, it) => s + (Number(it.amount) || 0), 0)
      const res = await fetch('/api/purchase-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_date: new Date().toISOString().slice(0, 10),
          supplier: orderDraft.supplier,
          ledger_id: Number(id),
          project_name: data?.project_name || '',
          notes: orderDraft.notes,
          source_file_id: orderDraft.fileId,
          items: orderDraft.items.map(it => ({
            name: it.name,
            quantity: Number(it.quantity) || 1,
            unit: it.unit || '個',
            unit_price: Number(it.unit_price) || 0,
            amount: Number(it.amount) || 0,
          })),
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        alert(`発注登録エラー: ${err.error}`)
        return
      }
      setOrderDraft(null)
      loadPurchaseOrders()
      alert('発注に登録しました')
    } finally {
      setRegisteringOrder(false)
    }
  }

  const updateOrderItem = (key: number, field: keyof Omit<OrderItem, '_key'>, value: string) => {
    setOrderDraft(prev => {
      if (!prev) return prev
      return {
        ...prev,
        items: prev.items.map(it => {
          if (it._key !== key) return it
          const updated = { ...it, [field]: field === 'name' || field === 'unit' ? value : Number(value) || 0 }
          if (field === 'quantity' || field === 'unit_price') {
            updated.amount = updated.quantity * updated.unit_price
          }
          return updated
        }),
      }
    })
  }

  const addOrderItem = () => {
    setOrderDraft(prev => {
      if (!prev) return prev
      const maxKey = prev.items.reduce((m, it) => Math.max(m, it._key), -1)
      return { ...prev, items: [...prev.items, { name: '', quantity: 1, unit: '個', unit_price: 0, amount: 0, _key: maxKey + 1 }] }
    })
  }

  const removeOrderItem = (key: number) => {
    setOrderDraft(prev => {
      if (!prev) return prev
      return { ...prev, items: prev.items.filter(it => it._key !== key) }
    })
  }

  const handleSaveFileEdit = async () => {
    if (editingFileId === null) return
    setSavingFileEdit(true)
    try {
      const res = await fetch(`/api/construction-ledger/${id}/files/${editingFileId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editFileForm),
      })
      if (!res.ok) { alert('更新に失敗しました'); return }
      setEditingFileId(null)
      loadFiles()
    } finally {
      setSavingFileEdit(false)
    }
  }

  const loadPhotos = async () => {
    const res = await fetch(`/api/construction-ledger/${id}/photos`)
    if (res.ok) setPhotos(await res.json())
  }

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || [])
    e.target.value = ''
    if (selected.length === 0) return
    setUploadingPhoto(true)
    try {
      for (const file of selected) {
        if (!file.type.startsWith('image/')) continue
        const fd = new FormData()
        fd.append('file', file)
        fd.append('phase', photoPhase)
        const res = await fetch(`/api/construction-ledger/${id}/photos`, { method: 'POST', body: fd })
        if (!res.ok) { alert(`「${file.name}」のアップロードに失敗しました`) }
      }
      await loadPhotos()
    } finally {
      setUploadingPhoto(false)
    }
  }

  const handleUpdatePhotoPhase = async (photo: SitePhoto, phase: string) => {
    setPhotos(prev => prev.map(p => p.id === photo.id ? { ...p, phase } : p))
    await fetch(`/api/construction-ledger/${id}/photos/${photo.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phase, caption: photo.caption }),
    })
  }

  const handleDeletePhoto = async (pid: number) => {
    if (!confirm('この写真を削除しますか？')) return
    await fetch(`/api/construction-ledger/${id}/photos/${pid}`, { method: 'DELETE' })
    setLightbox(null)
    loadPhotos()
  }

  const loadReports = async () => {
    const res = await fetch(`/api/construction-ledger/${id}/daily-reports`)
    if (res.ok) setReports(await res.json())
  }

  const handleAddReport = async () => {
    if (!newReport.work_content.trim()) { alert('作業内容を入力してください'); return }
    setSavingReport(true)
    try {
      const res = await fetch(`/api/construction-ledger/${id}/daily-reports`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newReport, work_hours: Number(newReport.work_hours) || 0 }),
      })
      if (res.ok) {
        setNewReport({ report_date: new Date().toISOString().slice(0, 10), worker_name: '', work_hours: '', work_content: '' })
        loadReports()
      }
    } finally {
      setSavingReport(false)
    }
  }

  const handleDeleteReport = async (rid: number) => {
    if (!confirm('この日報を削除しますか？')) return
    await fetch(`/api/construction-ledger/${id}/daily-reports/${rid}`, { method: 'DELETE' })
    loadReports()
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

  const materialCostAuto = purchaseOrders
    .filter(o => (o.order_category || '電気工事材料') !== '外注工事')
    .reduce((s, o) => s + (o.total_amount || 0), 0)
  const subcontractCostAuto = purchaseOrders
    .filter(o => (o.order_category || '電気工事材料') === '外注工事')
    .reduce((s, o) => s + (o.total_amount || 0), 0)
  const unpaidAmount = purchaseOrders
    .filter(o => (o.order_payment_status || '未払い') === '未払い')
    .reduce((s, o) => s + (o.total_amount || 0), 0)
  const totalOrderAmount = purchaseOrders.reduce((s, o) => s + (o.total_amount || 0), 0)
  const paidOrderAmount = purchaseOrders
    .filter(o => (o.order_payment_status || '未払い') === '支払済み')
    .reduce((s, o) => s + (o.total_amount || 0), 0)
  const costTotal = materialCostAuto + subcontractCostAuto + (Number(form.labor_cost) || 0) + (Number(form.site_misc_cost) || 0)
  const profit = (Number(form.contract_amount) || 0) - costTotal

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

  const handlePatchOrder = async (orderId: number, fields: Partial<PurchaseOrderSummary>) => {
    setPurchaseOrders(prev => prev.map(o => o.id === orderId ? { ...o, ...fields } : o))
    await fetch(`/api/purchase-orders/${orderId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fields),
    })
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
          {editing && !saved && (
            <button onClick={handleSave} disabled={saving}
              className="btn-primary flex items-center gap-2 text-sm">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {saving ? '保存中...' : '保存'}
            </button>
          )}
          {saved && (
            <span className="flex items-center gap-1.5 text-sm text-green-600 font-medium">
              <CheckCircle className="h-4 w-4" />保存しました
            </span>
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

      {/* 金額情報 */}
      <div className="card p-5 mb-6">
        <h3 className="font-semibold text-gray-900 text-sm mb-4">金額情報</h3>
        {unpaidAmount > 0 && (
          <div className="mb-3 flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg">
            <span className="text-red-600 text-sm font-semibold">未払い {formatCurrency(unpaidAmount)}</span>
            <span className="text-red-400 text-xs">（発注履歴より）</span>
          </div>
        )}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
          <div>
            <label className="label">契約金額（税抜）</label>
            <CurrencyInput className="input text-right" value={form.contract_amount ?? 0} onChange={v => set('contract_amount', v)} />
          </div>
          <div>
            <label className="label">税込総額（消費税10%）</label>
            <div className="input text-right bg-gray-50 text-gray-700 font-semibold cursor-default select-none">
              {formatCurrency(Math.round((Number(form.contract_amount) || 0) * 1.1))}
            </div>
          </div>
          <div>
            <label className="label">総額（税抜）</label>
            <TaxCurrencyInput className="input text-right" value={form.total_amount ?? 0} onChange={v => set('total_amount', v)} />
          </div>
          <div>
            <label className="label">材料費（税抜）</label>
            <TaxCurrencyInput className="input text-right" value={form.material_cost ?? 0} onChange={v => set('material_cost', v)} />
          </div>
          <div>
            <label className="label">労務費（税抜）</label>
            <TaxCurrencyInput className="input text-right" value={form.labor_cost ?? 0} onChange={v => set('labor_cost', v)} />
          </div>
          <div>
            <label className="label">外注費（税抜）</label>
            <TaxCurrencyInput className="input text-right" value={form.subcontract_cost ?? 0} onChange={v => set('subcontract_cost', v)} />
          </div>
          <div>
            <label className="label">現場雑費（税抜）</label>
            <TaxCurrencyInput className="input text-right" value={form.site_misc_cost ?? 0} onChange={v => set('site_misc_cost', v)} />
          </div>
          <div>
            <label className="label">購入費（税抜）</label>
            <TaxCurrencyInput className="input text-right" value={form.purchase_cost ?? 0} onChange={v => set('purchase_cost', v)} />
          </div>
        </div>

        {/* 原価・粗利サマリー */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 bg-gray-50 rounded-lg text-sm">
          <div className="text-center">
            <p className="text-gray-500 text-xs mb-1">契約金額（税抜）</p>
            <p className="font-semibold text-gray-900">{formatCurrency(Number(form.contract_amount) || 0)}</p>
          </div>
          <div className="text-center">
            <p className="text-gray-500 text-xs mb-1">原価合計</p>
            <p className="font-semibold text-gray-900">{formatCurrency(costTotal)}</p>
          </div>
          <div className="text-center">
            <p className="text-gray-500 text-xs mb-1">粗利</p>
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
            {files.length > 0 && (
              <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">{files.length}件</span>
            )}
          </div>
          {!pendingUpload && (
            <button type="button" onClick={() => fileInputRef.current?.click()}
              disabled={uploadingFile}
              className="flex items-center gap-1 text-xs text-purple-600 hover:text-purple-700 border border-purple-300 hover:border-purple-500 px-2.5 py-1 rounded-lg transition-colors disabled:opacity-50">
              <Plus className="h-3.5 w-3.5" />
              ファイルを追加
            </button>
          )}
          <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileUpload}
            accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.dwg,.dxf" />
        </div>

        {/* 選択後のカテゴリ・ラベル入力フォーム */}
        {pendingUpload && (
          <div className="mb-4 p-4 bg-purple-50 border border-purple-200 rounded-xl">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-0.5">
                {pendingUpload.file.type.startsWith('image/')
                  ? <ImageIcon className="h-5 w-5 text-blue-500" />
                  : pendingUpload.file.type === 'application/pdf'
                  ? <FileText className="h-5 w-5 text-red-500" />
                  : <File className="h-5 w-5 text-gray-400" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate mb-3">{pendingUpload.file.name}</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">カテゴリ</label>
                    <select
                      value={pendingUpload.category}
                      onChange={e => setPendingUpload(p => p ? { ...p, category: e.target.value, label: '' } : null)}
                      className="w-full text-sm border border-gray-300 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-purple-400">
                      {FILE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">
                      {pendingUpload.category === '図面' ? '図面の種類' : 'ラベル（任意）'}
                    </label>
                    {pendingUpload.category === '図面' ? (
                      <>
                        <input
                          type="text"
                          list="drawing-labels"
                          placeholder="選択または直接入力"
                          value={pendingUpload.label}
                          onChange={e => setPendingUpload(p => p ? { ...p, label: e.target.value } : null)}
                          className="w-full text-sm border border-gray-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-purple-400" />
                        <datalist id="drawing-labels">
                          {DRAWING_LABELS.map(l => <option key={l} value={l} />)}
                        </datalist>
                      </>
                    ) : (
                      <input
                        type="text"
                        placeholder="任意のメモ"
                        value={pendingUpload.label}
                        onChange={e => setPendingUpload(p => p ? { ...p, label: e.target.value } : null)}
                        className="w-full text-sm border border-gray-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-purple-400" />
                    )}
                  </div>
                </div>
                {/* 見積書(受領)PDFの場合は選択肢を表示 */}
                {pendingUpload.category === '見積書(受領)' && pendingUpload.file.type === 'application/pdf' && !showUploadChoice && (
                  <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-xs font-medium text-blue-700 mb-2">アップロード後の処理を選んでください</p>
                    <div className="flex gap-2 flex-wrap">
                      <button type="button" onClick={() => { setShowUploadChoice(false); handlePendingUpload() }} disabled={uploadingFile}
                        className="flex items-center gap-1 text-xs bg-gray-100 text-gray-700 border border-gray-300 px-3 py-1.5 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50">
                        <Download className="h-3.5 w-3.5 rotate-180" />保存だけ
                      </button>
                      <button type="button" onClick={handlePendingUploadAndAnalyze}
                        disabled={uploadingFile || !hasApiKey}
                        title={!hasApiKey ? 'APIキーの設定が必要です' : ''}
                        className="flex items-center gap-1 text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50">
                        {uploadingFile ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Edit2 className="h-3.5 w-3.5" />}
                        {uploadingFile ? '処理中...' : '読み取って発注に登録'}
                      </button>
                      {!hasApiKey && <p className="text-xs text-red-500 self-center">APIキーの設定が必要です</p>}
                    </div>
                  </div>
                )}
                {(pendingUpload.category !== '見積書(受領)' || pendingUpload.file.type !== 'application/pdf') && (
                  <div className="flex gap-2 mt-3">
                    <button type="button" onClick={handlePendingUpload} disabled={uploadingFile}
                      className="flex items-center gap-1 text-xs bg-purple-600 text-white px-3 py-1.5 rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50">
                      {uploadingFile ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5 rotate-180" />}
                      {uploadingFile ? 'アップロード中...' : 'アップロード'}
                    </button>
                    <button type="button" onClick={() => setPendingUpload(null)} disabled={uploadingFile}
                      className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 border border-gray-300 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50">
                      <X className="h-3.5 w-3.5" />キャンセル
                    </button>
                  </div>
                )}
                {(pendingUpload.category === '見積書(受領)' && pendingUpload.file.type === 'application/pdf') && (
                  <div className="flex gap-2 mt-2">
                    <button type="button" onClick={() => setPendingUpload(null)} disabled={uploadingFile}
                      className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 px-2 py-1 rounded transition-colors disabled:opacity-50">
                      <X className="h-3 w-3" />キャンセル
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {files.length === 0 && !pendingUpload ? (
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-gray-200 rounded-lg p-8 text-center text-gray-400 text-sm cursor-pointer hover:border-purple-300 transition-colors">
            <Paperclip className="h-7 w-7 mx-auto mb-2 opacity-40" />
            <p>写真・図面・書類などをアップロード</p>
            <p className="text-xs mt-1">クリックしてファイルを選択（最大50MB）</p>
          </div>
        ) : files.length > 0 ? (
          <div className="space-y-2">
            {files.map(f => {
              if (editingFileId === f.id) {
                return (
                  <div key={f.id} className="p-3 bg-purple-50 rounded-xl border border-purple-200">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 mt-1">
                        {f.mime_type.startsWith('image/') ? (
                          <img src={f.stored_name} alt={f.original_name}
                            className="h-10 w-10 object-cover rounded-lg border border-gray-200 bg-gray-100" />
                        ) : f.mime_type === 'application/pdf' ? (
                          <div className="h-10 w-10 flex items-center justify-center rounded-lg bg-red-50 border border-red-100">
                            <FileText className="h-5 w-5 text-red-500" />
                          </div>
                        ) : (
                          <div className="h-10 w-10 flex items-center justify-center rounded-lg bg-gray-100 border border-gray-200">
                            <File className="h-5 w-5 text-gray-400" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate mb-2">{f.original_name}</p>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">カテゴリ</label>
                            <select
                              value={editFileForm.category}
                              onChange={e => setEditFileForm(p => ({ ...p, category: e.target.value, label: '' }))}
                              className="w-full text-sm border border-gray-300 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-purple-400">
                              {FILE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">
                              {editFileForm.category === '図面' ? '図面の種類' : 'ラベル（任意）'}
                            </label>
                            {editFileForm.category === '図面' ? (
                              <>
                                <input
                                  type="text"
                                  list="edit-drawing-labels"
                                  placeholder="選択または直接入力"
                                  value={editFileForm.label}
                                  onChange={e => setEditFileForm(p => ({ ...p, label: e.target.value }))}
                                  className="w-full text-sm border border-gray-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-purple-400" />
                                <datalist id="edit-drawing-labels">
                                  {DRAWING_LABELS.map(l => <option key={l} value={l} />)}
                                </datalist>
                              </>
                            ) : (
                              <input
                                type="text"
                                placeholder="任意のメモ"
                                value={editFileForm.label}
                                onChange={e => setEditFileForm(p => ({ ...p, label: e.target.value }))}
                                className="w-full text-sm border border-gray-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-purple-400" />
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2 mt-3">
                          <button type="button" onClick={handleSaveFileEdit} disabled={savingFileEdit}
                            className="flex items-center gap-1 text-xs bg-purple-600 text-white px-3 py-1.5 rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50">
                            {savingFileEdit ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                            保存
                          </button>
                          <button type="button" onClick={() => setEditingFileId(null)} disabled={savingFileEdit}
                            className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 border border-gray-300 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50">
                            <X className="h-3.5 w-3.5" />キャンセル
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              }
              return (
                <a key={f.id} href={`/api/construction-ledger/${id}/files/${f.id}`} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl hover:bg-purple-50 hover:border-purple-200 border border-transparent transition-colors group">
                  {/* サムネイル or アイコン */}
                  <div className="flex-shrink-0">
                    {f.mime_type.startsWith('image/') ? (
                      <img src={f.stored_name} alt={f.original_name}
                        className="h-12 w-12 object-cover rounded-lg border border-gray-200 bg-gray-100" />
                    ) : f.mime_type === 'application/pdf' ? (
                      <div className="h-12 w-12 flex items-center justify-center rounded-lg bg-red-50 border border-red-100">
                        <FileText className="h-6 w-6 text-red-500" />
                      </div>
                    ) : (
                      <div className="h-12 w-12 flex items-center justify-center rounded-lg bg-gray-100 border border-gray-200">
                        <File className="h-6 w-6 text-gray-400" />
                      </div>
                    )}
                  </div>
                  {/* ファイル情報 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${CATEGORY_STYLE[f.category] || 'bg-gray-100 text-gray-600'}`}>
                        {f.category || 'その他'}
                      </span>
                      {f.label && (
                        <span className="text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded-full">{f.label}</span>
                      )}
                    </div>
                    <p className="text-sm font-medium text-gray-900 truncate group-hover:text-purple-700">{f.original_name}</p>
                    <p className="text-xs text-gray-400">{formatSize(f.file_size)} · {f.uploaded_by || '不明'} · {f.created_at.slice(0, 10)}</p>
                  </div>
                  {/* 見積書(受領)PDF：読み取り→発注ボタン（既存の「見積書」も後方互換） */}
                  {(f.category === '見積書(受領)' || f.category === '見積書') && f.mime_type === 'application/pdf' && (
                    <button type="button"
                      onClick={e => { e.preventDefault(); startAnalysis(f) }}
                      disabled={analyzing || !hasApiKey}
                      title={!hasApiKey ? 'APIキーの設定が必要です' : '読み取って発注に登録'}
                      className="flex-shrink-0 flex items-center gap-1 text-xs text-blue-600 border border-blue-300 bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded-lg transition-colors disabled:opacity-40 opacity-0 group-hover:opacity-100">
                      {analyzing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Edit2 className="h-3 w-3" />}
                      発注登録
                    </button>
                  )}
                  {/* 編集ボタン */}
                  <button type="button"
                    onClick={e => { e.preventDefault(); setEditingFileId(f.id); setEditFileForm({ category: f.category || 'その他', label: f.label || '' }) }}
                    className="flex-shrink-0 text-gray-300 hover:text-purple-500 transition-colors p-1 opacity-0 group-hover:opacity-100">
                    <Edit2 className="h-4 w-4" />
                  </button>
                  {/* 削除ボタン */}
                  <button type="button" onClick={e => { e.preventDefault(); handleDeleteFile(f.id) }}
                    className="flex-shrink-0 text-gray-300 hover:text-red-500 transition-colors p-1 opacity-0 group-hover:opacity-100">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </a>
              )
            })}
            {!pendingUpload && (
              <button type="button" onClick={() => fileInputRef.current?.click()}
                className="w-full text-xs text-gray-400 hover:text-purple-600 text-center py-2 border border-dashed border-gray-200 rounded-lg hover:border-purple-300 transition-colors">
                + さらに追加
              </button>
            )}
          </div>
        ) : null}
      </div>

      {/* 現場写真 */}
      <div className="card p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Camera className="h-4 w-4 text-rose-500" />
            <h3 className="font-semibold text-gray-900 text-sm">現場写真</h3>
            {photos.length > 0 && (
              <span className="text-xs bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full">{photos.length}枚</span>
            )}
          </div>
        </div>

        {/* アップロード操作 */}
        <div className="mb-4 p-3 bg-rose-50 border border-rose-100 rounded-xl">
          <p className="text-xs text-gray-500 mb-2">タグを選んで写真を追加（複数選択・撮影可）</p>
          <div className="flex flex-wrap items-center gap-2">
            {PHOTO_PHASES.map(ph => (
              <button key={ph} type="button" onClick={() => setPhotoPhase(ph)}
                className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                  photoPhase === ph
                    ? 'bg-rose-600 text-white border-rose-600'
                    : 'text-gray-600 border-gray-300 hover:border-rose-400'
                }`}>
                {ph}
              </button>
            ))}
            <button type="button" onClick={() => photoInputRef.current?.click()} disabled={uploadingPhoto}
              className="ml-auto flex items-center gap-1 text-xs bg-rose-600 text-white px-3 py-1.5 rounded-lg hover:bg-rose-700 transition-colors disabled:opacity-50">
              {uploadingPhoto ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
              {uploadingPhoto ? 'アップロード中...' : `「${photoPhase}」で写真を追加`}
            </button>
          </div>
          <input ref={photoInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handlePhotoUpload} />
        </div>

        {/* フィルタ */}
        {photos.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {['すべて', ...PHOTO_PHASES].map(f => {
              const count = f === 'すべて' ? photos.length : photos.filter(p => p.phase === f).length
              return (
                <button key={f} type="button" onClick={() => setPhotoFilter(f)}
                  className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                    photoFilter === f
                      ? 'bg-gray-800 text-white border-gray-800'
                      : 'text-gray-500 border-gray-200 hover:border-gray-400'
                  }`}>
                  {f}（{count}）
                </button>
              )
            })}
          </div>
        )}

        {/* サムネイル一覧 */}
        {photos.length === 0 ? (
          <div
            onClick={() => photoInputRef.current?.click()}
            className="border-2 border-dashed border-gray-200 rounded-lg p-8 text-center text-gray-400 text-sm cursor-pointer hover:border-rose-300 transition-colors">
            <Camera className="h-7 w-7 mx-auto mb-2 opacity-40" />
            <p>現場写真をアップロード</p>
            <p className="text-xs mt-1">施工前・施工中・完了後の写真を記録できます</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
            {photos
              .filter(p => photoFilter === 'すべて' || p.phase === photoFilter)
              .map(p => (
                <button key={p.id} type="button" onClick={() => setLightbox(p)}
                  className="group relative aspect-square rounded-lg overflow-hidden border border-gray-200 bg-gray-100 focus:outline-none focus:ring-2 focus:ring-rose-400">
                  <img src={p.stored_name} alt={p.caption || p.original_name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform" loading="lazy" />
                  <span className={`absolute top-1 left-1 text-[10px] px-1.5 py-0.5 rounded-full font-medium ${PHOTO_PHASE_STYLE[p.phase] || 'bg-gray-100 text-gray-600'}`}>
                    {p.phase}
                  </span>
                </button>
              ))}
          </div>
        )}
      </div>

      {/* 発注履歴 */}
      <div className="card p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-4 w-4 text-blue-500" />
            <h3 className="font-semibold text-gray-900 text-sm">発注履歴</h3>
            {purchaseOrders.length > 0 && (
              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{purchaseOrders.length}件</span>
            )}
          </div>
          <Link href={`/unit-prices?ledger_id=${id}&project=${encodeURIComponent(data.project_name)}`}
            className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 border border-blue-300 hover:border-blue-500 px-2.5 py-1 rounded-lg transition-colors">
            <Plus className="h-3.5 w-3.5" />新規発注
          </Link>
        </div>

        {/* 発注合計サマリー */}
        {purchaseOrders.length > 0 && (
          <div className="grid grid-cols-3 gap-3 mb-4 p-3 bg-blue-50 rounded-lg text-xs text-center">
            <div>
              <p className="text-gray-500 mb-0.5">発注金額合計</p>
              <p className="font-semibold text-gray-800">{formatCurrency(totalOrderAmount)}</p>
            </div>
            <div>
              <p className="text-gray-500 mb-0.5">うち支払済み</p>
              <p className="font-semibold text-green-700">{formatCurrency(paidOrderAmount)}</p>
            </div>
            <div>
              <p className="text-gray-500 mb-0.5">うち未払い</p>
              <p className={`font-semibold ${unpaidAmount > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                {formatCurrency(unpaidAmount)}
              </p>
            </div>
          </div>
        )}

        {purchaseOrders.length === 0 ? (
          <div className="border-2 border-dashed border-gray-200 rounded-lg p-6 text-center text-gray-400 text-sm">
            <ShoppingCart className="h-6 w-6 mx-auto mb-2 opacity-30" />
            <p>発注履歴がありません</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs" style={{ minWidth: '900px' }}>
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-2 py-2 text-gray-400 font-medium whitespace-nowrap">発注日</th>
                  <th className="text-left px-2 py-2 text-gray-400 font-medium whitespace-nowrap">発注内容</th>
                  <th className="text-left px-2 py-2 text-gray-400 font-medium whitespace-nowrap">発注先</th>
                  <th className="text-right px-2 py-2 text-gray-400 font-medium whitespace-nowrap">金額</th>
                  <th className="text-left px-2 py-2 text-gray-400 font-medium whitespace-nowrap">納品予定日</th>
                  <th className="text-left px-2 py-2 text-gray-400 font-medium whitespace-nowrap">納品日</th>
                  <th className="text-left px-2 py-2 text-gray-400 font-medium whitespace-nowrap">支払日</th>
                  <th className="text-left px-2 py-2 text-gray-400 font-medium whitespace-nowrap">支払状況</th>
                  <th className="text-left px-2 py-2 text-gray-400 font-medium whitespace-nowrap">備考</th>
                  <th className="px-2 py-2 w-6"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {purchaseOrders.map(o => (
                  <tr key={o.id} className="hover:bg-gray-50">
                    <td className="px-2 py-2 text-gray-600 whitespace-nowrap">{o.order_date || '—'}</td>
                    <td className="px-2 py-2">
                      <select
                        value={o.order_category || '電気工事材料'}
                        onChange={e => handlePatchOrder(o.id, { order_category: e.target.value })}
                        className="text-xs border border-gray-200 rounded px-1 py-0.5 bg-white focus:outline-none focus:ring-1 focus:ring-blue-400"
                        style={{ minWidth: '110px' }}
                      >
                        {ORDER_CATEGORIES.map(c => <option key={c}>{c}</option>)}
                      </select>
                    </td>
                    <td className="px-2 py-2 text-gray-700 whitespace-nowrap">{o.supplier || '—'}</td>
                    <td className="px-2 py-2 text-right font-medium text-gray-900 whitespace-nowrap">
                      {formatCurrency(o.total_amount || 0)}
                    </td>
                    <td className="px-2 py-2 text-gray-600 whitespace-nowrap">{o.delivery_date || '—'}</td>
                    <td className="px-2 py-2">
                      <input
                        key={`${o.id}-add-${o.actual_delivery_date}`}
                        type="date"
                        defaultValue={o.actual_delivery_date || ''}
                        onBlur={e => { if (e.target.value !== (o.actual_delivery_date || '')) handlePatchOrder(o.id, { actual_delivery_date: e.target.value }) }}
                        className="text-xs border border-gray-200 rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-400"
                        style={{ width: '120px' }}
                      />
                    </td>
                    <td className="px-2 py-2">
                      <input
                        key={`${o.id}-pd-${o.payment_date}`}
                        type="date"
                        defaultValue={o.payment_date || ''}
                        onBlur={e => { if (e.target.value !== (o.payment_date || '')) handlePatchOrder(o.id, { payment_date: e.target.value }) }}
                        className="text-xs border border-gray-200 rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-400"
                        style={{ width: '120px' }}
                      />
                    </td>
                    <td className="px-2 py-2">
                      <select
                        value={o.order_payment_status || '未払い'}
                        onChange={e => handlePatchOrder(o.id, { order_payment_status: e.target.value })}
                        className={`text-xs border rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-400 ${(o.order_payment_status || '未払い') === '支払済み' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}
                      >
                        {ORDER_PAYMENT_STATUSES.map(s => <option key={s}>{s}</option>)}
                      </select>
                    </td>
                    <td className="px-2 py-2">
                      <input
                        key={`${o.id}-notes-${o.notes}`}
                        defaultValue={o.notes || ''}
                        onBlur={e => { if (e.target.value !== (o.notes || '')) handlePatchOrder(o.id, { notes: e.target.value }) }}
                        className="text-xs border border-gray-200 rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-400"
                        placeholder="備考"
                        style={{ width: '90px' }}
                      />
                    </td>
                    <td className="px-2 py-2">
                      <Link href={`/purchase-orders/${o.id}`}
                        className="text-gray-300 hover:text-blue-500 transition-colors">
                        <ChevronRight className="h-3.5 w-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 作業日報 */}
      <div className="card p-5 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <NotebookPen className="h-4 w-4 text-teal-500" />
          <h3 className="font-semibold text-gray-900 text-sm">作業日報</h3>
          {reports.length > 0 && (
            <span className="text-xs bg-teal-100 text-teal-700 px-2 py-0.5 rounded-full">{reports.length}件</span>
          )}
        </div>

        {/* 入力フォーム */}
        <div className="border border-teal-200 rounded-xl p-4 mb-4 bg-teal-50">
          <p className="text-xs font-medium text-teal-700 mb-3">日報を記録</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div>
              <label className="label">日付</label>
              <input type="date" className="input" value={newReport.report_date}
                onChange={e => setNewReport(r => ({ ...r, report_date: e.target.value }))} />
            </div>
            <div>
              <label className="label">作業員名</label>
              <input className="input" placeholder="山田 太郎" value={newReport.worker_name}
                onChange={e => setNewReport(r => ({ ...r, worker_name: e.target.value }))} />
            </div>
            <div>
              <label className="label">作業時間（時間）</label>
              <input type="number" min="0" step="0.5" className="input text-right" placeholder="8"
                value={newReport.work_hours}
                onChange={e => setNewReport(r => ({ ...r, work_hours: e.target.value }))} />
            </div>
            <div className="col-span-2 md:col-span-4">
              <label className="label">作業内容 <span className="text-red-500">*</span></label>
              <textarea className="input" rows={2} placeholder="配線工事、器具取付 など"
                value={newReport.work_content}
                onChange={e => setNewReport(r => ({ ...r, work_content: e.target.value }))} />
            </div>
          </div>
          <div className="flex justify-end mt-3">
            <button type="button" onClick={handleAddReport} disabled={savingReport}
              className="btn-primary text-xs flex items-center gap-1">
              {savingReport ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
              日報を追加
            </button>
          </div>
        </div>

        {/* 日報一覧（新しい順） */}
        {reports.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-4">日報がまだありません</p>
        ) : (
          <div className="space-y-2">
            {reports.map(r => (
              <div key={r.id} className="p-3 rounded-xl border border-gray-200 bg-white hover:border-teal-200 transition-colors">
                <div className="flex items-center gap-2 flex-wrap mb-1.5">
                  <span className="text-sm font-semibold text-gray-900">{r.report_date || '日付未設定'}</span>
                  {r.worker_name && (
                    <span className="flex items-center gap-1 text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                      <User className="h-3 w-3" />{r.worker_name}
                    </span>
                  )}
                  {r.work_hours > 0 && (
                    <span className="flex items-center gap-1 text-xs text-teal-700 bg-teal-100 px-2 py-0.5 rounded-full">
                      <Clock className="h-3 w-3" />{r.work_hours}時間
                    </span>
                  )}
                  <button type="button" onClick={() => handleDeleteReport(r.id)}
                    className="ml-auto text-gray-300 hover:text-red-500 transition-colors">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{r.work_content}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 現場写真 拡大表示（ライトボックス） */}
      {lightbox && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}>
          <button type="button" onClick={() => setLightbox(null)}
            className="absolute top-4 right-4 text-white/80 hover:text-white p-2">
            <X className="h-6 w-6" />
          </button>
          <div className="max-w-3xl w-full flex flex-col items-center" onClick={e => e.stopPropagation()}>
            <img src={lightbox.stored_name} alt={lightbox.caption || lightbox.original_name}
              className="max-h-[75vh] w-auto max-w-full rounded-lg object-contain" />
            <div className="mt-3 flex items-center gap-3 flex-wrap justify-center bg-white/10 backdrop-blur rounded-lg px-4 py-2">
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PHOTO_PHASE_STYLE[lightbox.phase] || 'bg-gray-100 text-gray-600'}`}>
                {lightbox.phase}
              </span>
              <select
                value={lightbox.phase}
                onChange={e => { handleUpdatePhotoPhase(lightbox, e.target.value); setLightbox({ ...lightbox, phase: e.target.value }) }}
                className="text-xs bg-white/90 text-gray-700 rounded px-2 py-1 focus:outline-none">
                {PHOTO_PHASES.map(ph => <option key={ph} value={ph}>{ph}に変更</option>)}
              </select>
              <span className="text-xs text-white/80">{lightbox.original_name}</span>
              <button type="button" onClick={() => handleDeletePhoto(lightbox.id)}
                className="flex items-center gap-1 text-xs text-red-300 hover:text-red-200">
                <Trash2 className="h-3.5 w-3.5" />削除
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 読み取り中オーバーレイ */}
      {analyzing && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 flex flex-col items-center gap-4 shadow-2xl">
            <Loader2 className="h-10 w-10 text-blue-600 animate-spin" />
            <p className="text-gray-700 font-medium">Claude AIが見積書を読み取っています...</p>
            <p className="text-xs text-gray-400">品目・数量・単価・金額を抽出中です</p>
          </div>
        </div>
      )}

      {/* 発注確認モーダル */}
      {orderDraft && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-stretch">
          <div className="flex-1 flex flex-col bg-white m-4 rounded-2xl overflow-hidden shadow-2xl max-h-full">
            {/* モーダルヘッダー */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 flex-shrink-0">
              <h2 className="font-bold text-gray-900">見積書 読み取り結果の確認・発注登録</h2>
              <button onClick={() => setOrderDraft(null)} className="text-gray-400 hover:text-gray-600 p-1">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* モーダル本体 */}
            <div className="flex flex-1 overflow-hidden">
              {/* 左：PDF表示 */}
              <div className="w-1/2 border-r border-gray-200 flex flex-col">
                <p className="text-xs text-gray-400 px-3 py-2 border-b border-gray-100 flex-shrink-0">
                  元の見積書PDF
                </p>
                <iframe
                  src={orderDraft.fileUrl.startsWith('http')
                    ? orderDraft.fileUrl
                    : `/api/construction-ledger/${id}/files/${orderDraft.fileId}`}
                  className="flex-1 w-full"
                  title="見積書PDF"
                />
              </div>

              {/* 右：抽出結果の編集 */}
              <div className="w-1/2 flex flex-col overflow-hidden">
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {/* 発注先 */}
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">発注先（仕入先）</label>
                    <input
                      className="input text-sm"
                      value={orderDraft.supplier}
                      onChange={e => setOrderDraft(p => p ? { ...p, supplier: e.target.value } : p)}
                      placeholder="例：たけでん" />
                  </div>

                  {/* 品目テーブル */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs text-gray-500 font-medium">品目一覧</label>
                      <button type="button" onClick={addOrderItem}
                        className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1">
                        <Plus className="h-3 w-3" />行追加
                      </button>
                    </div>
                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                      <table className="w-full text-xs">
                        <thead className="bg-gray-50 border-b border-gray-200">
                          <tr>
                            <th className="text-left px-2 py-2 text-gray-500 font-medium w-full">品目名</th>
                            <th className="text-right px-2 py-2 text-gray-500 font-medium whitespace-nowrap">数量</th>
                            <th className="text-left px-2 py-2 text-gray-500 font-medium">単位</th>
                            <th className="text-right px-2 py-2 text-gray-500 font-medium whitespace-nowrap">単価</th>
                            <th className="text-right px-2 py-2 text-gray-500 font-medium whitespace-nowrap">金額</th>
                            <th className="w-6"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {orderDraft.items.map(it => (
                            <tr key={it._key}>
                              <td className="px-1 py-1">
                                <input className="w-full text-xs border border-transparent focus:border-gray-300 rounded px-1 py-0.5 focus:outline-none"
                                  value={it.name} onChange={e => updateOrderItem(it._key, 'name', e.target.value)} placeholder="品目名" />
                              </td>
                              <td className="px-1 py-1">
                                <input type="number" min="0" className="w-16 text-xs text-right border border-transparent focus:border-gray-300 rounded px-1 py-0.5 focus:outline-none"
                                  value={it.quantity} onChange={e => updateOrderItem(it._key, 'quantity', e.target.value)} />
                              </td>
                              <td className="px-1 py-1">
                                <input className="w-12 text-xs border border-transparent focus:border-gray-300 rounded px-1 py-0.5 focus:outline-none"
                                  value={it.unit} onChange={e => updateOrderItem(it._key, 'unit', e.target.value)} />
                              </td>
                              <td className="px-1 py-1">
                                <input type="number" min="0" className="w-20 text-xs text-right border border-transparent focus:border-gray-300 rounded px-1 py-0.5 focus:outline-none"
                                  value={it.unit_price} onChange={e => updateOrderItem(it._key, 'unit_price', e.target.value)} />
                              </td>
                              <td className="px-2 py-1 text-right font-medium text-gray-800 whitespace-nowrap">
                                ¥{(Number(it.amount) || 0).toLocaleString()}
                              </td>
                              <td className="px-1 py-1">
                                <button type="button" onClick={() => removeOrderItem(it._key)}
                                  className="text-gray-300 hover:text-red-500">
                                  <X className="h-3.5 w-3.5" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* 合計チェック */}
                  {(() => {
                    const calcTotal = orderDraft.items.reduce((s, it) => s + (Number(it.amount) || 0), 0)
                    const pdfTotal = orderDraft.total
                    const mismatch = pdfTotal > 0 && Math.abs(calcTotal - pdfTotal) > 1
                    return (
                      <div className={`p-3 rounded-lg ${mismatch ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-200'}`}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-gray-600">品目合計（計算値）</span>
                          <span className="font-semibold">¥{calcTotal.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-gray-600">PDF上の合計金額</span>
                          <span className="font-semibold">¥{pdfTotal.toLocaleString()}</span>
                        </div>
                        {mismatch ? (
                          <p className="text-xs text-red-600 font-medium mt-1">
                            ⚠ 合計金額が一致しません。品目を確認してください。
                          </p>
                        ) : (
                          <p className="text-xs text-green-700 font-medium mt-1">✓ 合計金額が一致しています</p>
                        )}
                      </div>
                    )
                  })()}

                  {/* 備考 */}
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">備考</label>
                    <textarea className="input text-sm" rows={2}
                      value={orderDraft.notes}
                      onChange={e => setOrderDraft(p => p ? { ...p, notes: e.target.value } : p)}
                      placeholder="任意" />
                  </div>
                </div>

                {/* フッターボタン */}
                <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 flex-shrink-0 bg-gray-50">
                  <button type="button" onClick={() => setOrderDraft(null)}
                    className="text-sm text-gray-500 hover:text-gray-700 border border-gray-300 px-4 py-2 rounded-lg flex items-center gap-1.5">
                    <X className="h-4 w-4" />キャンセル
                  </button>
                  <button type="button" onClick={handleRegisterOrder} disabled={registeringOrder}
                    className="btn-primary flex items-center gap-2 text-sm">
                    {registeringOrder ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    {registeringOrder ? '登録中...' : '発注確定'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {(editing || saving || saved) && (
        <div className="sticky bottom-4 flex justify-end pointer-events-none">
          {saved ? (
            <div className="flex items-center gap-2 bg-green-500 text-white px-5 py-2.5 rounded-xl shadow-lg text-sm font-medium pointer-events-auto">
              <CheckCircle className="h-4 w-4" />
              保存しました
            </div>
          ) : (
            <div className="flex items-center gap-3 bg-white border border-gray-200 rounded-xl shadow-lg px-4 py-2.5 pointer-events-auto">
              <span className="text-xs text-amber-600 font-medium">未保存の変更があります</span>
              <button onClick={handleSave} disabled={saving}
                className="btn-primary flex items-center gap-1.5 text-sm py-1.5 px-3">
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                {saving ? '保存中...' : '保存する'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
