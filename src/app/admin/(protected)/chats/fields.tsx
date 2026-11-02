'use client'

import type { ReactNode } from 'react'

import { hintClass, inputClass, labelClass } from '@/app/admin/ui'
import { toDigits } from '@/personas/config'

// 設定フォームで使う入力欄。値はすべて文字列で持ち、サーバー側で検証する

export function Field(props: { label: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className={labelClass}>{props.label}</span>
      {props.children}
      {props.hint && <span className={`block ${hintClass}`}>{props.hint}</span>}
    </label>
  )
}

export function NumberInput(props: {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}) {
  return (
    <input
      inputMode="numeric"
      value={props.value}
      onChange={(e) => props.onChange(toDigits(e.target.value))}
      placeholder={props.placeholder}
      className={`${inputClass} max-w-40`}
    />
  )
}

export function PersonaSelect(props: {
  value: string
  onChange: (value: string) => void
  options: { id: string; name: string }[]
  emptyLabel: string
}) {
  return (
    <select
      value={props.value}
      onChange={(e) => props.onChange(e.target.value)}
      className={inputClass}
    >
      <option value="">{props.emptyLabel}</option>
      {props.options.map((persona) => (
        <option key={persona.id} value={persona.id}>
          {persona.name}
        </option>
      ))}
    </select>
  )
}
