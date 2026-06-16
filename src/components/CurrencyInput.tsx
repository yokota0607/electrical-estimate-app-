'use client'

import { useRef, useState, useEffect } from 'react'

interface Props {
  value: number | string
  onChange: (val: number) => void
  placeholder?: string
  className?: string
}

function fmt(v: number | string): string {
  const n = Number(String(v).replace(/,/g, ''))
  return isNaN(n) || n === 0 ? '' : n.toLocaleString('ja-JP')
}

export default function CurrencyInput({ value, onChange, placeholder = '0', className = '' }: Props) {
  const ref = useRef<HTMLInputElement>(null)
  const focused = useRef(false)
  const [display, setDisplay] = useState(() => fmt(value))

  useEffect(() => {
    if (!focused.current) setDisplay(fmt(value))
  }, [value])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const el = e.target
    const cursorPos = el.selectionStart ?? 0
    const rawBeforeCursor = el.value.slice(0, cursorPos).replace(/,/g, '').length

    const digits = el.value.replace(/[^0-9]/g, '')
    const n = digits === '' ? 0 : Number(digits)
    const formatted = digits === '' ? '' : n.toLocaleString('ja-JP')

    setDisplay(formatted)
    onChange(n)

    requestAnimationFrame(() => {
      if (!ref.current) return
      if (formatted === '') { ref.current.setSelectionRange(0, 0); return }
      let rawCount = 0
      let cursor = formatted.length
      if (rawBeforeCursor === 0) {
        cursor = 0
      } else {
        for (let i = 0; i < formatted.length; i++) {
          if (formatted[i] !== ',') rawCount++
          if (rawCount === rawBeforeCursor) { cursor = i + 1; break }
        }
      }
      ref.current.setSelectionRange(cursor, cursor)
    })
  }

  return (
    <input
      ref={ref}
      type="text"
      inputMode="numeric"
      className={className}
      value={display}
      onChange={handleChange}
      onFocus={() => { focused.current = true }}
      onBlur={() => {
        focused.current = false
        const n = Number(display.replace(/,/g, ''))
        setDisplay(isNaN(n) || n === 0 ? '' : n.toLocaleString('ja-JP'))
        onChange(isNaN(n) ? 0 : n)
      }}
      placeholder={placeholder}
    />
  )
}
