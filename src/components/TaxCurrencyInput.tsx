'use client'

import { useState } from 'react'
import CurrencyInput from './CurrencyInput'

interface Props {
  /** 常に税抜金額を保持・返却する */
  value: number | string
  onChange: (val: number) => void
  className?: string
}

const TAX_RATE = 1.1

/**
 * 税込で金額を入力しても、内部的には常に税抜金額として保存されるCurrencyInput。
 * 「税込」ボタンを押すと、入力欄には税込金額を表示し、
 * 入力された値は自動で税抜（÷1.1）に変換してonChangeに渡す。
 */
export default function TaxCurrencyInput({ value, onChange, className = '' }: Props) {
  const [mode, setMode] = useState<'excl' | 'incl'>('excl')

  const exclValue = Number(value) || 0
  const displayValue = mode === 'incl' ? Math.round(exclValue * TAX_RATE) : exclValue

  const handleChange = (v: number) => {
    if (mode === 'incl') {
      onChange(Math.round(v / TAX_RATE))
    } else {
      onChange(v)
    }
  }

  return (
    <div>
      <div className="flex justify-end gap-1 mb-1">
        <button
          type="button"
          onClick={() => setMode('excl')}
          className={`text-[10px] px-2 py-0.5 rounded-full border transition-colors ${
            mode === 'excl'
              ? 'bg-blue-600 text-white border-blue-600'
              : 'text-gray-500 border-gray-300 hover:border-blue-400'
          }`}
        >
          税抜
        </button>
        <button
          type="button"
          onClick={() => setMode('incl')}
          className={`text-[10px] px-2 py-0.5 rounded-full border transition-colors ${
            mode === 'incl'
              ? 'bg-blue-600 text-white border-blue-600'
              : 'text-gray-500 border-gray-300 hover:border-blue-400'
          }`}
        >
          税込
        </button>
      </div>
      <CurrencyInput className={className} value={displayValue} onChange={handleChange} />
    </div>
  )
}
