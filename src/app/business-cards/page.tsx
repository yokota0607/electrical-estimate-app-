'use client'

import { useEffect, useRef, useState } from 'react'
import {
  Contact, Plus, Search, Trash2, Pencil, Check, X,
  ScanLine, Upload, Phone, Mail, Building2, MapPin,
  Globe, ChevronDown, ChevronUp, Loader2, Layers, LayoutList,
  FileText, Printer, Filter, Settings, Tag,
} from 'lucide-react'

interface BusinessCard {
  id: number
  name: string
  name_kana: string
  company: string
  department: string
  title: string
  email: string
  phone: string
  mobile: string
  fax: string
  postal_code: string
  address: string
  website: string
  qualifications: string[]
  industry: string[]
  transaction_type: string
  notes: string
  created_at: string
  updated_at: string
}

type CardForm = Omit<BusinessCard, 'id' | 'created_at' | 'updated_at'>

const BLANK: CardForm = {
  name: '', name_kana: '', company: '', department: '', title: '',
  email: '', phone: '', mobile: '', fax: '', postal_code: '', address: '', website: '',
  qualifications: [], industry: [], transaction_type: '', notes: '',
}

const TRANSACTION_TYPES = ['元請け', '下請け', '取引先', 'その他']

const TX_COLOR: Record<string, string> = {
  '元請け': 'bg-blue-50 text-blue-700 border-blue-200',
  '下請け': 'bg-orange-50 text-orange-700 border-orange-200',
  '取引先': 'bg-teal-50 text-teal-700 border-teal-200',
  'その他': 'bg-gray-100 text-gray-600 border-gray-200',
}

interface ScannedCard extends CardForm { selected: boolean }

// ── 汎用タグ入力 ──────────────────────────────────────────────────────────────
function TagInput({ value, onChange, placeholder }: {
  value: string[]
  onChange: (v: string[]) => void
  placeholder: string
}) {
  const [input, setInput] = useState('')
  const add = () => {
    const v = input.trim()
    if (v && !value.includes(v)) onChange([...value, v])
    setInput('')
  }
  return (
    <div>
      <div className="flex gap-2 mb-2">
        <input className="input flex-1" placeholder={placeholder} value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add() } }} />
        <button type="button" onClick={add}
          className="px-3 py-2 text-sm font-medium bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors">
          追加
        </button>
      </div>
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map((v, i) => (
            <span key={i} className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 text-xs px-2.5 py-1 rounded-full border border-blue-200">
              {v}
              <button type="button" onClick={() => onChange(value.filter((_, j) => j !== i))} className="hover:text-red-500 ml-0.5">
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

// ── 業種入力（DBから動的ロード） ──────────────────────────────────────────────
function IndustryInput({ value, onChange, presets }: {
  value: string[]
  onChange: (v: string[]) => void
  presets: string[]
}) {
  const [custom, setCustom] = useState('')
  const toggle = (tag: string) =>
    onChange(value.includes(tag) ? value.filter(v => v !== tag) : [...value, tag])
  const addCustom = () => {
    const v = custom.trim()
    if (v && !value.includes(v)) onChange([...value, v])
    setCustom('')
  }
  const customTags = value.filter(v => !presets.includes(v))
  return (
    <div>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {presets.map(tag => (
          <button key={tag} type="button" onClick={() => toggle(tag)}
            className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
              value.includes(tag)
                ? 'bg-green-600 text-white border-green-600'
                : 'bg-white text-gray-600 border-gray-300 hover:border-green-400 hover:text-green-700'
            }`}>{tag}</button>
        ))}
      </div>
      <div className="flex gap-2">
        <input className="input flex-1" placeholder="その他の業種を入力してEnterまたは追加"
          value={custom} onChange={e => setCustom(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustom() } }} />
        <button type="button" onClick={addCustom}
          className="px-3 py-2 text-sm font-medium bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors">
          追加
        </button>
      </div>
      {customTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {customTags.map((v, i) => (
            <span key={i} className="inline-flex items-center gap-1 bg-green-50 text-green-700 text-xs px-2.5 py-1 rounded-full border border-green-200">
              {v}
              <button type="button" onClick={() => onChange(value.filter(x => x !== v))} className="hover:text-red-500 ml-0.5">
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

// ── CSVパーサー ───────────────────────────────────────────────────────────────
function parseCSVLine(line: string): string[] {
  const fields: string[] = []
  let i = 0
  while (i <= line.length) {
    if (i === line.length) { fields.push(''); break }
    if (line[i] === '"') {
      i++
      let field = ''
      while (i < line.length) {
        if (line[i] === '"' && line[i + 1] === '"') { field += '"'; i += 2 }
        else if (line[i] === '"') { i++; break }
        else field += line[i++]
      }
      fields.push(field)
      if (i < line.length && line[i] === ',') i++
    } else {
      const j = line.indexOf(',', i)
      const end = j === -1 ? line.length : j
      fields.push(line.slice(i, end))
      i = end + 1
    }
  }
  return fields
}

// CSV列: 氏名,氏名（ふりがな）,会社名,部署名,役職,TEL,MOBILE,FAX,Mail,住所,業種,資格,取引区分,メモ
function parseCSVText(text: string): CardForm[] {
  const cleaned = text.charCodeAt(0) === 0xFEFF ? text.slice(1) : text
  const lines = cleaned.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').filter(l => l.trim())
  if (lines.length === 0) return []
  const first = parseCSVLine(lines[0])
  const isHeader = first.some(f => ['氏名', '会社名', 'TEL', 'MOBILE', 'Mail'].includes(f.trim()))
  const dataLines = isHeader ? lines.slice(1) : lines
  return dataLines
    .map(line => {
      const cols = parseCSVLine(line).map(f => f.trim())
      const [
        name = '', name_kana = '', company = '', department = '', title = '',
        phone = '', mobile = '', fax = '', email = '', address = '',
        industryRaw = '', qualificationsRaw = '', transaction_type = '', notes = '',
      ] = cols
      const industry = industryRaw ? industryRaw.split(/[,、]/).map(s => s.trim()).filter(Boolean) : []
      const qualifications = qualificationsRaw ? qualificationsRaw.split(/[,、]/).map(s => s.trim()).filter(Boolean) : []
      return {
        ...BLANK,
        name, name_kana, company, department, title,
        phone, mobile, fax, email, address,
        industry, qualifications, transaction_type, notes,
      }
    })
    .filter(r => r.name || r.company || r.email || r.phone)
}

// ── 入力フォームフィールド ────────────────────────────────────────────────────
function CardFormFields({ value, onChange, industryPresets }: {
  value: CardForm
  onChange: (f: CardForm) => void
  industryPresets: string[]
}) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <div>
        <label className="label">氏名</label>
        <input className="input" placeholder="山田 太郎" value={value.name}
          onChange={e => onChange({ ...value, name: e.target.value })} />
      </div>
      <div>
        <label className="label">フリガナ</label>
        <input className="input" placeholder="ヤマダ タロウ" value={value.name_kana}
          onChange={e => onChange({ ...value, name_kana: e.target.value })} />
      </div>
      <div>
        <label className="label">会社名</label>
        <input className="input" placeholder="株式会社〇〇" value={value.company}
          onChange={e => onChange({ ...value, company: e.target.value })} />
      </div>
      <div>
        <label className="label">部署名</label>
        <input className="input" placeholder="営業部" value={value.department}
          onChange={e => onChange({ ...value, department: e.target.value })} />
      </div>
      <div>
        <label className="label">役職</label>
        <input className="input" placeholder="部長" value={value.title}
          onChange={e => onChange({ ...value, title: e.target.value })} />
      </div>
      <div>
        <label className="label">取引区分</label>
        <select className="input" value={value.transaction_type}
          onChange={e => onChange({ ...value, transaction_type: e.target.value })}>
          <option value="">未設定</option>
          {TRANSACTION_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>
      <div>
        <label className="label">電話番号 (TEL)</label>
        <input className="input" placeholder="03-1234-5678" value={value.phone}
          onChange={e => onChange({ ...value, phone: e.target.value })} />
      </div>
      <div>
        <label className="label">携帯番号 (MOBILE)</label>
        <input className="input" placeholder="090-1234-5678" value={value.mobile}
          onChange={e => onChange({ ...value, mobile: e.target.value })} />
      </div>
      <div>
        <label className="label">FAX</label>
        <input className="input" placeholder="03-1234-5679" value={value.fax}
          onChange={e => onChange({ ...value, fax: e.target.value })} />
      </div>
      <div>
        <label className="label">メールアドレス</label>
        <input className="input" type="email" placeholder="taro@example.com" value={value.email}
          onChange={e => onChange({ ...value, email: e.target.value })} />
      </div>
      <div>
        <label className="label">郵便番号</label>
        <input className="input" placeholder="123-4567" value={value.postal_code}
          onChange={e => onChange({ ...value, postal_code: e.target.value })} />
      </div>
      <div>
        <label className="label">住所</label>
        <input className="input" placeholder="東京都千代田区〇〇1-2-3" value={value.address}
          onChange={e => onChange({ ...value, address: e.target.value })} />
      </div>
      <div>
        <label className="label">WebサイトURL</label>
        <input className="input" placeholder="https://example.com" value={value.website}
          onChange={e => onChange({ ...value, website: e.target.value })} />
      </div>
      <div className="col-span-2">
        <label className="label">メモ</label>
        <textarea className="input min-h-[80px] resize-y" placeholder="備考・メモ（複数行入力可能）" value={value.notes}
          onChange={e => onChange({ ...value, notes: e.target.value })} />
      </div>
      <div className="col-span-2">
        <label className="label">資格・職種</label>
        <TagInput value={value.qualifications}
          onChange={q => onChange({ ...value, qualifications: q })}
          placeholder="資格・職種名を入力してEnterまたは追加" />
      </div>
      <div className="col-span-2">
        <label className="label">業種</label>
        <IndustryInput value={value.industry} onChange={ind => onChange({ ...value, industry: ind })} presets={industryPresets} />
      </div>
    </div>
  )
}

// ── メインページ ──────────────────────────────────────────────────────────────
export default function BusinessCardsPage() {
  const [cards, setCards] = useState<BusinessCard[]>([])
  const [loading, setLoading] = useState(true)
  const [industryPresets, setIndustryPresets] = useState<string[]>([])
  const [search, setSearch] = useState('')
  const [industryFilter, setIndustryFilter] = useState<string | null>(null)
  const [txFilter, setTxFilter] = useState<string | null>(null)
  const [qualFilter, setQualFilter] = useState<string | null>(null)
  const [showFilters, setShowFilters] = useState(false)
  const [groupByIndustry, setGroupByIndustry] = useState(false)
  const [panel, setPanel] = useState<null | 'manual' | 'scan' | 'csv' | 'industry-settings'>(null)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState<CardForm>(BLANK)
  const [saving, setSaving] = useState(false)
  const [scanFile, setScanFile] = useState<File | null>(null)
  const [scanning, setScanning] = useState(false)
  const [scanError, setScanError] = useState('')
  const [scannedCards, setScannedCards] = useState<ScannedCard[]>([])
  const [bulkSaving, setBulkSaving] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dropRef = useRef<HTMLDivElement>(null)
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [csvRows, setCsvRows] = useState<CardForm[]>([])
  const [csvImporting, setCsvImporting] = useState(false)
  const [csvError, setCsvError] = useState('')
  const [csvIndustry, setCsvIndustry] = useState('')
  const csvInputRef = useRef<HTMLInputElement>(null)
  const [igNewName, setIgNewName] = useState('')
  const [igAdding, setIgAdding] = useState(false)
  const [igAddError, setIgAddError] = useState('')
  const [igEditingId, setIgEditingId] = useState<number | null>(null)
  const [igEditName, setIgEditName] = useState('')
  const [igEditError, setIgEditError] = useState('')
  const [igGroups, setIgGroups] = useState<{ id: number; name: string }[]>([])

  const load = () =>
    fetch('/api/business-cards')
      .then(r => r.json())
      .then(data => setCards(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false))

  const loadIndustryGroups = () =>
    fetch('/api/industry-groups')
      .then(r => r.json())
      .then((data: { id: number; name: string }[]) => {
        if (Array.isArray(data)) {
          setIgGroups(data)
          setIndustryPresets(data.map(g => g.name))
        }
      })
      .catch(() => {})

  useEffect(() => {
    load()
    loadIndustryGroups()
  }, [])

  const handleIgAdd = async () => {
    if (!igNewName.trim()) return
    setIgAdding(true); setIgAddError('')
    try {
      const res = await fetch('/api/industry-groups', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: igNewName.trim() }),
      })
      const data = await res.json()
      if (!res.ok) { setIgAddError(data.error || '登録に失敗しました'); return }
      setIgNewName(''); loadIndustryGroups()
    } finally { setIgAdding(false) }
  }

  const handleIgEdit = async (id: number) => {
    if (!igEditName.trim()) return
    setIgEditError('')
    const res = await fetch(`/api/industry-groups/${id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: igEditName.trim() }),
    })
    const data = await res.json()
    if (!res.ok) { setIgEditError(data.error || '更新に失敗しました'); return }
    setIgEditingId(null); loadIndustryGroups()
  }

  const handleIgDelete = async (id: number, name: string) => {
    if (!confirm(`「${name}」を削除しますか？`)) return
    await fetch(`/api/industry-groups/${id}`, { method: 'DELETE' })
    loadIndustryGroups()
  }

  // 絞り込み用: 全カードから一意の業種・資格を収集
  const allIndustries = Array.from(
    new Set(cards.flatMap(c => Array.isArray(c.industry) ? c.industry : []))
  ).sort((a, b) => a.localeCompare(b, 'ja'))

  const allQualifications = Array.from(
    new Set(cards.flatMap(c => Array.isArray(c.qualifications) ? c.qualifications : []))
  ).sort((a, b) => a.localeCompare(b, 'ja'))

  const allTxTypes = TRANSACTION_TYPES.filter(t =>
    cards.some(c => c.transaction_type === t)
  )

  // フィルター処理 + 会社名50音順ソート
  const filtered = cards.filter(c => {
    if (industryFilter && !(Array.isArray(c.industry) && c.industry.includes(industryFilter))) return false
    if (txFilter && c.transaction_type !== txFilter) return false
    if (qualFilter && !(Array.isArray(c.qualifications) && c.qualifications.includes(qualFilter))) return false
    if (!search) return true
    const q = search.toLowerCase()
    return (
      c.name.toLowerCase().includes(q) ||
      (c.name_kana || '').toLowerCase().includes(q) ||
      c.company.toLowerCase().includes(q) ||
      c.department.toLowerCase().includes(q) ||
      c.title.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q) ||
      c.address.toLowerCase().includes(q) ||
      (c.transaction_type || '').toLowerCase().includes(q) ||
      (Array.isArray(c.qualifications) && c.qualifications.some(v => v.toLowerCase().includes(q))) ||
      (Array.isArray(c.industry) && c.industry.some(v => v.toLowerCase().includes(q)))
    )
  }).sort((a, b) => {
    const cmp = a.company.localeCompare(b.company, 'ja')
    if (cmp !== 0) return cmp
    return (a.name_kana || a.name).localeCompare(b.name_kana || b.name, 'ja')
  })

  // 業種グループ分け
  const groups = (() => {
    const map = new Map<string, BusinessCard[]>()
    const none: BusinessCard[] = []
    for (const c of filtered) {
      const inds = Array.isArray(c.industry) ? c.industry : []
      if (inds.length === 0) { none.push(c); continue }
      for (const ind of inds) {
        if (!map.has(ind)) map.set(ind, [])
        map.get(ind)!.push(c)
      }
    }
    const result = Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b, 'ja'))
      .map(([label, items]) => ({
        label,
        items: items.sort((a, b) => {
          const cmp = a.company.localeCompare(b.company, 'ja')
          if (cmp !== 0) return cmp
          return (a.name_kana || a.name).localeCompare(b.name_kana || b.name, 'ja')
        }),
      }))
    if (none.length > 0) result.push({ label: '未分類', items: none })
    return result
  })()

  const togglePanel = (target: 'manual' | 'scan') => {
    if (panel === target) { setPanel(null); return }
    setPanel(target)
    if (target === 'manual') { setForm(BLANK); setEditingId(null) }
  }

  const startEdit = (c: BusinessCard) => {
    setEditingId(c.id)
    setForm({
      name: c.name, name_kana: c.name_kana || '',
      company: c.company, department: c.department || '', title: c.title,
      email: c.email, phone: c.phone, mobile: c.mobile, fax: c.fax || '',
      postal_code: c.postal_code || '', address: c.address, website: c.website,
      qualifications: Array.isArray(c.qualifications) ? c.qualifications : [],
      industry: Array.isArray(c.industry) ? c.industry : [],
      transaction_type: c.transaction_type || '',
      notes: c.notes,
    })
    setPanel('manual')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const method = editingId ? 'PUT' : 'POST'
      const url = editingId ? `/api/business-cards/${editingId}` : '/api/business-cards'
      await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      setForm(BLANK); setEditingId(null); setPanel(null); load()
    } finally { setSaving(false) }
  }

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`「${name || '(名前なし)'}」を削除しますか？`)) return
    await fetch(`/api/business-cards/${id}`, { method: 'DELETE' })
    load()
  }

  const handleScan = async () => {
    if (!scanFile) return
    setScanning(true); setScanError(''); setScannedCards([])
    try {
      const fd = new FormData()
      fd.append('image', scanFile)
      const res = await fetch('/api/business-cards/scan', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'スキャンに失敗しました')
      if (!data.cards || data.cards.length === 0) {
        setScanError('名刺が検出されませんでした。画像を確認してください。'); return
      }
      setScannedCards(data.cards.map((c: Partial<CardForm>) => ({
        ...BLANK, ...c,
        postal_code: c.postal_code || '',
        qualifications: Array.isArray(c.qualifications) ? c.qualifications : [],
        industry: Array.isArray(c.industry) ? c.industry : [],
        selected: true,
      })))
    } catch (err) {
      setScanError(err instanceof Error ? err.message : 'エラーが発生しました')
    } finally { setScanning(false) }
  }

  const handleBulkSave = async () => {
    const toSave = scannedCards.filter(c => c.selected)
    if (toSave.length === 0) return
    setBulkSaving(true)
    for (const c of toSave) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { selected, ...body } = c
      await fetch('/api/business-cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
    }
    setBulkSaving(false); setScannedCards([]); setScanFile(null); setPanel(null); load()
  }

  const handleCSVSelect = (file: File) => {
    setCsvError(''); setCsvRows([])
    const reader = new FileReader()
    reader.onload = e => {
      try {
        const rows = parseCSVText(e.target?.result as string)
        if (rows.length === 0) { setCsvError('インポートできるデータがありませんでした。CSVの形式を確認してください。'); return }
        setCsvRows(rows)
      } catch {
        setCsvError('CSVの解析に失敗しました。ファイルを確認してください。')
      }
    }
    reader.readAsText(file, 'UTF-8')
    setCsvFile(file)
  }

  const handleCSVImport = async () => {
    if (csvRows.length === 0) return
    setCsvImporting(true)
    try {
      // 業種グループが選択されていれば全行に追加
      const rows = csvRows.map(r => ({
        ...r,
        industry: csvIndustry && !r.industry.includes(csvIndustry)
          ? [...r.industry, csvIndustry]
          : r.industry,
      }))
      const res = await fetch('/api/business-cards/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rows),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'インポートに失敗しました')
      setCsvFile(null); setCsvRows([]); setCsvIndustry(''); setPanel(null); load()
    } catch (err) {
      setCsvError(err instanceof Error ? err.message : 'エラーが発生しました')
    } finally { setCsvImporting(false) }
  }

  // カード行の描画
  const renderRow = (c: BusinessCard) => (
    <div key={c.id} className="grid grid-cols-12 px-4 py-3 items-start hover:bg-gray-50 transition-colors group">
      <div className="col-span-3 min-w-0">
        <p className="font-medium text-gray-900 truncate">{c.name || '—'}</p>
        {c.name_kana && <p className="text-xs text-gray-400 truncate">{c.name_kana}</p>}
        {c.title && <p className="text-xs text-gray-500 truncate">{c.title}</p>}
        <div className="flex flex-wrap gap-1 mt-1">
          {c.transaction_type && (
            <span className={`text-xs px-1.5 py-0.5 rounded border ${TX_COLOR[c.transaction_type] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
              {c.transaction_type}
            </span>
          )}
          {Array.isArray(c.industry) && c.industry.map((ind, i) => (
            <span key={i} className="text-xs bg-green-50 text-green-700 px-1.5 py-0.5 rounded border border-green-100">{ind}</span>
          ))}
        </div>
        {Array.isArray(c.qualifications) && c.qualifications.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {c.qualifications.map((q, i) => (
              <span key={i} className="text-xs bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded border border-blue-100">{q}</span>
            ))}
          </div>
        )}
      </div>
      <div className="col-span-3 min-w-0">
        <p className="text-sm text-gray-700 truncate flex items-center gap-1">
          {c.company && <Building2 className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />}
          {c.company || '—'}
        </p>
        {c.department && <p className="text-xs text-gray-400 truncate">{c.department}</p>}
      </div>
      <div className="col-span-2 min-w-0">
        {c.phone && (
          <p className="text-sm text-gray-600 flex items-center gap-1 truncate">
            <Phone className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />{c.phone}
          </p>
        )}
        {c.mobile && <p className="text-xs text-gray-400 truncate">{c.mobile}</p>}
        {c.fax && (
          <p className="text-xs text-gray-400 flex items-center gap-1 truncate">
            <Printer className="h-3 w-3 flex-shrink-0" />{c.fax}
          </p>
        )}
        {!c.phone && !c.mobile && !c.fax && <span className="text-gray-300">—</span>}
      </div>
      <div className="col-span-3 min-w-0">
        {c.email ? (
          <a href={`mailto:${c.email}`} className="text-sm text-blue-600 hover:underline flex items-center gap-1 truncate">
            <Mail className="h-3.5 w-3.5 flex-shrink-0" />{c.email}
          </a>
        ) : <span className="text-gray-300">—</span>}
        {(c.postal_code || c.address) && (
          <p className="text-xs text-gray-400 flex items-center gap-1 truncate mt-0.5">
            <MapPin className="h-3 w-3 flex-shrink-0" />
            {c.postal_code ? `〒${c.postal_code} ` : ''}{c.address}
          </p>
        )}
        {c.website && (
          <a href={c.website} target="_blank" rel="noreferrer"
            className="text-xs text-gray-400 flex items-center gap-1 truncate hover:text-blue-500">
            <Globe className="h-3 w-3 flex-shrink-0" />{c.website}
          </a>
        )}
      </div>
      <div className="col-span-1 flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={() => startEdit(c)} className="p-1.5 text-gray-400 hover:text-blue-600 rounded">
          <Pencil className="h-4 w-4" />
        </button>
        <button onClick={() => handleDelete(c.id, c.name)} className="p-1.5 text-gray-400 hover:text-red-600 rounded">
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  )

  const tableHeader = (
    <div className="grid grid-cols-12 px-4 py-3 text-xs text-gray-400 font-medium uppercase tracking-wide border-b border-gray-100">
      <div className="col-span-3">氏名 / 役職 / 取引区分</div>
      <div className="col-span-3">会社名 / 部署</div>
      <div className="col-span-2">電話番号</div>
      <div className="col-span-3">メールアドレス</div>
      <div className="col-span-1"></div>
    </div>
  )

  const activeFilterCount = [industryFilter, txFilter, qualFilter].filter(Boolean).length

  return (
    <div className="p-8">
      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">名刺管理</h2>
          <p className="text-gray-500 text-sm mt-1">全{cards.length}件</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => { setPanel(panel === 'csv' ? null : 'csv'); setCsvFile(null); setCsvRows([]); setCsvError(''); setCsvIndustry('') }}
            className={`flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg transition-colors ${
              panel === 'csv' ? 'bg-green-600 text-white' : 'bg-green-50 text-green-700 hover:bg-green-100'
            }`}>
            <FileText className="h-4 w-4" />CSVインポート
            {panel === 'csv' ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
          <button onClick={() => togglePanel('scan')}
            className={`flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg transition-colors ${
              panel === 'scan' ? 'bg-purple-600 text-white' : 'bg-purple-50 text-purple-700 hover:bg-purple-100'
            }`}>
            <ScanLine className="h-4 w-4" />AIスキャン読み取り
            {panel === 'scan' ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
          <button onClick={() => togglePanel('manual')}
            className={`flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg transition-colors ${
              panel === 'manual' ? 'bg-blue-600 text-white' : 'btn-primary'
            }`}>
            <Plus className="h-4 w-4" />手動入力
            {panel === 'manual' ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
          <button
            onClick={() => setPanel(panel === 'industry-settings' ? null : 'industry-settings')}
            title="業種管理"
            className={`p-2 rounded-lg border transition-colors ${
              panel === 'industry-settings'
                ? 'bg-gray-800 text-white border-gray-800'
                : 'bg-white text-gray-500 border-gray-300 hover:border-gray-500 hover:text-gray-700'
            }`}>
            <Settings className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* 業種管理パネル */}
      {panel === 'industry-settings' && (
        <div className="card p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Settings className="h-4 w-4 text-gray-500" />
              <h3 className="font-semibold text-gray-900">業種管理</h3>
              <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{igGroups.length}件</span>
            </div>
            <button onClick={() => setPanel(null)} className="text-gray-400 hover:text-gray-600">
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* 追加フォーム */}
          <div className="flex gap-2 mb-4">
            <input
              className="input flex-1"
              placeholder="新しい業種名を入力（例: 電気工事）"
              value={igNewName}
              onChange={e => { setIgNewName(e.target.value); setIgAddError('') }}
              onKeyDown={e => { if (e.key === 'Enter') handleIgAdd() }}
            />
            <button
              onClick={handleIgAdd}
              disabled={igAdding || !igNewName.trim()}
              className="btn-primary flex items-center gap-1.5 whitespace-nowrap text-sm"
            >
              {igAdding ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
              追加
            </button>
          </div>
          {igAddError && <p className="mb-3 text-sm text-red-600">{igAddError}</p>}

          {/* 業種一覧 */}
          {igGroups.length === 0 ? (
            <div className="py-6 text-center text-gray-400 text-sm">
              <Tag className="h-8 w-8 mx-auto mb-2 opacity-30" />
              業種グループがありません
            </div>
          ) : (
            <div className="divide-y divide-gray-100 border border-gray-200 rounded-lg overflow-hidden">
              {igGroups.map(g => (
                <div key={g.id} className="flex items-center gap-3 px-4 py-2.5 bg-white group hover:bg-gray-50 transition-colors">
                  <Tag className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />
                  {igEditingId === g.id ? (
                    <div className="flex-1 flex gap-2 items-center">
                      <input
                        className="input flex-1 py-1 text-sm"
                        value={igEditName}
                        onChange={e => { setIgEditName(e.target.value); setIgEditError('') }}
                        onKeyDown={e => {
                          if (e.key === 'Enter') handleIgEdit(g.id)
                          if (e.key === 'Escape') setIgEditingId(null)
                        }}
                        autoFocus
                      />
                      <button onClick={() => handleIgEdit(g.id)} className="p-1 text-green-600 hover:bg-green-50 rounded">
                        <Check className="h-4 w-4" />
                      </button>
                      <button onClick={() => setIgEditingId(null)} className="p-1 text-gray-400 hover:bg-gray-100 rounded">
                        <X className="h-4 w-4" />
                      </button>
                      {igEditError && <span className="text-xs text-red-600">{igEditError}</span>}
                    </div>
                  ) : (
                    <>
                      <span className="flex-1 text-sm text-gray-800">{g.name}</span>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => { setIgEditingId(g.id); setIgEditName(g.name); setIgEditError('') }}
                          className="p-1 text-gray-400 hover:text-blue-600 rounded"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleIgDelete(g.id, g.name)}
                          className="p-1 text-gray-400 hover:text-red-600 rounded"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* CSVインポートパネル */}
      {panel === 'csv' && (
        <div className="card p-6 mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900">CSVインポート</h3>
            <button onClick={() => { setPanel(null); setCsvFile(null); setCsvRows([]); setCsvError(''); setCsvIndustry('') }}
              className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
          </div>
          <p className="text-sm text-gray-500 mb-1">
            CSVの列順：<span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">
              氏名, 氏名（ふりがな）, 会社名, 部署名, 役職, TEL, MOBILE, FAX, Mail, 住所, 業種, 資格, 取引区分, メモ
            </span>
          </p>
          <p className="text-xs text-gray-400 mb-4">1行目がヘッダー行の場合は自動スキップ。業種・資格は「,」区切りで複数指定可。</p>

          {csvRows.length === 0 ? (
            <>
              <div
                onClick={() => csvInputRef.current?.click()}
                onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleCSVSelect(f) }}
                onDragOver={e => e.preventDefault()}
                className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${
                  csvFile ? 'border-green-400 bg-green-50' : 'border-gray-300 hover:border-green-400 hover:bg-green-50'
                }`}>
                <input ref={csvInputRef} type="file" accept=".csv,text/csv" className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleCSVSelect(f); e.target.value = '' }} />
                <FileText className="h-10 w-10 mx-auto mb-3 text-gray-300" />
                {csvFile ? (
                  <p className="font-medium text-green-700">{csvFile.name}</p>
                ) : (
                  <>
                    <p className="font-medium text-gray-600">クリックまたはドラッグ&ドロップ</p>
                    <p className="text-sm text-gray-400 mt-1">CSV ファイル</p>
                  </>
                )}
              </div>
              {csvError && <p className="mt-3 text-sm text-red-600 flex items-center gap-1"><X className="h-4 w-4" />{csvError}</p>}
            </>
          ) : (
            <>
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium text-gray-700">{csvRows.length}件のデータを読み込みました</p>
                <button onClick={() => { setCsvFile(null); setCsvRows([]); setCsvError('') }}
                  className="text-xs text-gray-400 hover:text-gray-600 underline">やり直す</button>
              </div>

              {/* 業種グループを一括設定 */}
              <div className="flex items-center gap-3 mb-4 p-3 bg-green-50 rounded-lg border border-green-200">
                <label className="text-sm font-medium text-green-800 whitespace-nowrap">業種グループを一括設定：</label>
                <select className="input flex-1 text-sm py-1.5"
                  value={csvIndustry} onChange={e => setCsvIndustry(e.target.value)}>
                  <option value="">設定しない（CSVの業種列を使用）</option>
                  {industryPresets.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
                {csvIndustry && (
                  <p className="text-xs text-green-700 whitespace-nowrap">全件に「{csvIndustry}」を追加</p>
                )}
              </div>

              <div className="overflow-x-auto border border-gray-200 rounded-lg mb-4">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50">
                    <tr>
                      {['氏名', 'ふりがな', '会社名', '部署', '役職', 'TEL', 'FAX', 'Mail', '住所', '業種', '資格', '取引区分'].map(h => (
                        <th key={h} className="px-2 py-2 text-left text-gray-500 font-medium whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {csvRows.slice(0, 5).map((r, i) => (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="px-2 py-1.5 whitespace-nowrap font-medium">{r.name || '—'}</td>
                        <td className="px-2 py-1.5 whitespace-nowrap text-gray-400">{r.name_kana || '—'}</td>
                        <td className="px-2 py-1.5 whitespace-nowrap">{r.company || '—'}</td>
                        <td className="px-2 py-1.5 whitespace-nowrap">{r.department || '—'}</td>
                        <td className="px-2 py-1.5 whitespace-nowrap">{r.title || '—'}</td>
                        <td className="px-2 py-1.5 whitespace-nowrap">{r.phone || '—'}</td>
                        <td className="px-2 py-1.5 whitespace-nowrap">{r.fax || '—'}</td>
                        <td className="px-2 py-1.5 whitespace-nowrap">{r.email || '—'}</td>
                        <td className="px-2 py-1.5 max-w-[120px] truncate">{r.address || '—'}</td>
                        <td className="px-2 py-1.5 whitespace-nowrap">{r.industry.join(', ') || '—'}</td>
                        <td className="px-2 py-1.5 whitespace-nowrap">{r.qualifications.join(', ') || '—'}</td>
                        <td className="px-2 py-1.5 whitespace-nowrap">{r.transaction_type || '—'}</td>
                      </tr>
                    ))}
                    {csvRows.length > 5 && (
                      <tr>
                        <td colSpan={12} className="px-2 py-2 text-center text-gray-400">…他 {csvRows.length - 5} 件</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              {csvError && <p className="mb-3 text-sm text-red-600 flex items-center gap-1"><X className="h-4 w-4" />{csvError}</p>}
              <div className="flex gap-2 justify-end">
                <button onClick={() => { setCsvFile(null); setCsvRows([]); setCsvError('') }}
                  className="btn-secondary text-sm">キャンセル</button>
                <button onClick={handleCSVImport} disabled={csvImporting}
                  className="bg-green-600 hover:bg-green-700 text-white font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2 text-sm">
                  {csvImporting
                    ? <><Loader2 className="h-4 w-4 animate-spin" />インポート中...</>
                    : <><Check className="h-4 w-4" />{csvRows.length}件をインポート</>}
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* 手動入力パネル */}
      {panel === 'manual' && (
        <div className="card p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">{editingId ? '名刺を編集' : '新規名刺を入力'}</h3>
            <button onClick={() => { setPanel(null); setEditingId(null); setForm(BLANK) }}
              className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
          </div>
          <CardFormFields value={form} onChange={setForm} industryPresets={industryPresets} />
          <div className="flex gap-2 justify-end mt-6">
            <button onClick={() => { setPanel(null); setEditingId(null); setForm(BLANK) }}
              className="btn-secondary">キャンセル</button>
            <button onClick={handleSave} disabled={saving} className="btn-primary flex items-center gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              {editingId ? '更新する' : '登録する'}
            </button>
          </div>
        </div>
      )}

      {/* AIスキャンパネル */}
      {panel === 'scan' && (
        <div className="card p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">AIスキャン一括読み取り</h3>
            <button onClick={() => { setPanel(null); setScannedCards([]); setScanFile(null) }}
              className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
          </div>
          <p className="text-sm text-gray-500 mb-4">
            A3スキャン画像など、複数枚の名刺が写った画像をアップロードするとAIが一括で読み取ります。
          </p>
          {scannedCards.length === 0 && (
            <>
              <div ref={dropRef} onDrop={e => { e.preventDefault(); setScanFile(e.dataTransfer.files[0] ?? null) }}
                onDragOver={e => e.preventDefault()} onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${
                  scanFile ? 'border-purple-400 bg-purple-50' : 'border-gray-300 hover:border-purple-400 hover:bg-purple-50'
                }`}>
                <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp"
                  className="hidden" onChange={e => setScanFile(e.target.files?.[0] ?? null)} />
                <Upload className="h-10 w-10 mx-auto mb-3 text-gray-300" />
                {scanFile
                  ? <p className="font-medium text-purple-700">{scanFile.name}</p>
                  : <><p className="font-medium text-gray-600">クリックまたはドラッグ&ドロップ</p>
                     <p className="text-sm text-gray-400 mt-1">JPEG・PNG・WebP（最大20MB）</p></>}
              </div>
              {scanError && <p className="mt-3 text-sm text-red-600 flex items-center gap-1"><X className="h-4 w-4" />{scanError}</p>}
              <div className="flex gap-2 justify-end mt-4">
                {scanFile && <button onClick={() => { setScanFile(null); setScanError('') }} className="btn-secondary text-sm">クリア</button>}
                <button onClick={handleScan} disabled={!scanFile || scanning}
                  className="bg-purple-600 hover:bg-purple-700 text-white font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2 text-sm">
                  {scanning ? <><Loader2 className="h-4 w-4 animate-spin" />読み取り中...</> : <><ScanLine className="h-4 w-4" />AI読み取り開始</>}
                </button>
              </div>
            </>
          )}
          {scannedCards.length > 0 && (
            <>
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium text-gray-700">{scannedCards.length}件の名刺を検出。登録する名刺を選択してください。</p>
                <div className="flex gap-2 text-sm">
                  <button onClick={() => setScannedCards(c => c.map(x => ({ ...x, selected: true })))} className="text-blue-600 hover:underline">すべて選択</button>
                  <span className="text-gray-300">|</span>
                  <button onClick={() => setScannedCards(c => c.map(x => ({ ...x, selected: false })))} className="text-gray-500 hover:underline">すべて解除</button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 max-h-[400px] overflow-y-auto pr-1 mb-4">
                {scannedCards.map((c, i) => (
                  <div key={i} onClick={() => setScannedCards(cs => cs.map((x, j) => j === i ? { ...x, selected: !x.selected } : x))}
                    className={`border rounded-xl p-4 cursor-pointer transition-colors ${c.selected ? 'border-purple-400 bg-purple-50' : 'border-gray-200 bg-gray-50 opacity-60'}`}>
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-semibold text-gray-900">{c.name || '(名前なし)'}</p>
                        {c.name_kana && <p className="text-xs text-gray-400">{c.name_kana}</p>}
                        {c.title && <p className="text-xs text-gray-500">{c.title}</p>}
                      </div>
                      <div className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 ${c.selected ? 'bg-purple-600' : 'bg-gray-200'}`}>
                        {c.selected && <Check className="h-3 w-3 text-white" />}
                      </div>
                    </div>
                    {c.company && <p className="text-sm text-gray-700 flex items-center gap-1 mb-1"><Building2 className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />{c.company}{c.department ? ` ${c.department}` : ''}</p>}
                    {c.phone && <p className="text-xs text-gray-500 flex items-center gap-1"><Phone className="h-3 w-3 text-gray-400 flex-shrink-0" />{c.phone}</p>}
                    {c.email && <p className="text-xs text-gray-500 flex items-center gap-1 truncate"><Mail className="h-3 w-3 text-gray-400 flex-shrink-0" />{c.email}</p>}
                  </div>
                ))}
              </div>
              <div className="flex gap-2 justify-end">
                <button onClick={() => { setScannedCards([]); setScanFile(null) }} className="btn-secondary text-sm">やり直す</button>
                <button onClick={handleBulkSave} disabled={bulkSaving || scannedCards.filter(c => c.selected).length === 0}
                  className="bg-purple-600 hover:bg-purple-700 text-white font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2 text-sm">
                  {bulkSaving ? <><Loader2 className="h-4 w-4 animate-spin" />登録中...</> : <><Check className="h-4 w-4" />選択した{scannedCards.filter(c => c.selected).length}件を登録</>}
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* 検索バー */}
      <div className="flex items-center gap-3 mb-3">
        <div className="relative flex-1 max-w-lg">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input className="input pl-9"
            placeholder="氏名・会社名・業種・資格・取引区分で検索"
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <button onClick={() => setShowFilters(f => !f)}
          className={`flex items-center gap-2 text-sm font-medium px-3 py-2 rounded-lg border transition-colors whitespace-nowrap relative ${
            showFilters || activeFilterCount > 0
              ? 'bg-gray-800 text-white border-gray-800'
              : 'bg-white text-gray-600 border-gray-300 hover:border-gray-500'
          }`}>
          <Filter className="h-4 w-4" />絞り込み
          {activeFilterCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
              {activeFilterCount}
            </span>
          )}
        </button>
        <button onClick={() => setGroupByIndustry(g => !g)}
          className={`flex items-center gap-2 text-sm font-medium px-3 py-2 rounded-lg border transition-colors whitespace-nowrap ${
            groupByIndustry ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-600 border-gray-300 hover:border-gray-500'
          }`}>
          {groupByIndustry ? <Layers className="h-4 w-4" /> : <LayoutList className="h-4 w-4" />}
          {groupByIndustry ? 'グループ表示中' : 'グループ表示'}
        </button>
      </div>

      {/* 絞り込みパネル */}
      {showFilters && (
        <div className="card p-4 mb-4 space-y-4">
          {/* 業種 */}
          {allIndustries.length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">業種</p>
              <div className="flex flex-wrap gap-1.5">
                <button onClick={() => setIndustryFilter(null)}
                  className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${!industryFilter ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-600 border-gray-300 hover:border-gray-500'}`}>
                  すべて
                </button>
                {allIndustries.map(ind => {
                  const count = cards.filter(c => Array.isArray(c.industry) && c.industry.includes(ind)).length
                  return (
                    <button key={ind} onClick={() => setIndustryFilter(industryFilter === ind ? null : ind)}
                      className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                        industryFilter === ind ? 'bg-green-600 text-white border-green-600' : 'bg-white text-gray-600 border-gray-300 hover:border-green-400 hover:text-green-700'
                      }`}>{ind} ({count})</button>
                  )
                })}
              </div>
            </div>
          )}
          {/* 取引区分 */}
          {allTxTypes.length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">取引区分</p>
              <div className="flex flex-wrap gap-1.5">
                <button onClick={() => setTxFilter(null)}
                  className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${!txFilter ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-600 border-gray-300 hover:border-gray-500'}`}>
                  すべて
                </button>
                {allTxTypes.map(t => {
                  const count = cards.filter(c => c.transaction_type === t).length
                  return (
                    <button key={t} onClick={() => setTxFilter(txFilter === t ? null : t)}
                      className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                        txFilter === t ? 'bg-gray-700 text-white border-gray-700' : `bg-white border-gray-300 hover:border-gray-500 text-gray-600`
                      }`}>{t} ({count})</button>
                  )
                })}
              </div>
            </div>
          )}
          {/* 資格 */}
          {allQualifications.length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">資格</p>
              <div className="flex flex-wrap gap-1.5">
                <button onClick={() => setQualFilter(null)}
                  className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${!qualFilter ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-600 border-gray-300 hover:border-gray-500'}`}>
                  すべて
                </button>
                {allQualifications.map(q => {
                  const count = cards.filter(c => Array.isArray(c.qualifications) && c.qualifications.includes(q)).length
                  return (
                    <button key={q} onClick={() => setQualFilter(qualFilter === q ? null : q)}
                      className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                        qualFilter === q ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400 hover:text-blue-700'
                      }`}>{q} ({count})</button>
                  )
                })}
              </div>
            </div>
          )}
          {activeFilterCount > 0 && (
            <div className="flex justify-end pt-1 border-t border-gray-100">
              <button onClick={() => { setIndustryFilter(null); setTxFilter(null); setQualFilter(null) }}
                className="text-xs text-red-500 hover:text-red-700">
                絞り込みをクリア
              </button>
            </div>
          )}
        </div>
      )}

      {/* 名刺一覧 */}
      <div className="card">
        {loading ? (
          <div className="p-12 text-center text-gray-400">
            <Loader2 className="h-8 w-8 mx-auto mb-3 animate-spin opacity-30" />読み込み中...
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <Contact className="h-12 w-12 mx-auto mb-3 opacity-20" />
            <p className="font-medium">名刺がありません</p>
            {(search || industryFilter || txFilter || qualFilter) ? (
              <p className="text-sm mt-1">検索・絞り込み条件を変更してください</p>
            ) : (
              <div className="flex gap-2 justify-center mt-3 flex-wrap">
                <button onClick={() => { setPanel('csv'); setCsvFile(null); setCsvRows([]); setCsvError('') }}
                  className="bg-green-600 hover:bg-green-700 text-white text-sm font-medium px-4 py-2 rounded-lg flex items-center gap-1.5">
                  <FileText className="h-4 w-4" />CSVインポート
                </button>
                <button onClick={() => togglePanel('manual')} className="btn-primary text-sm">手動で入力する</button>
                <button onClick={() => togglePanel('scan')}
                  className="bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium px-4 py-2 rounded-lg">
                  AIスキャンで読み取る
                </button>
              </div>
            )}
          </div>
        ) : groupByIndustry ? (
          <div>
            {groups.map(({ label, items }) => (
              <div key={label}>
                <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-100 flex items-center gap-2 sticky top-0">
                  <span className={`w-2 h-2 rounded-full ${label === '未分類' ? 'bg-gray-300' : 'bg-green-500'}`} />
                  <span className="text-sm font-semibold text-gray-700">{label}</span>
                  <span className="text-xs text-gray-400 bg-gray-200 px-1.5 py-0.5 rounded-full">{items.length}件</span>
                </div>
                <div className="divide-y divide-gray-50">
                  {tableHeader}
                  {items.map(c => renderRow(c))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {tableHeader}
            {filtered.map(c => renderRow(c))}
          </div>
        )}
      </div>
    </div>
  )
}
