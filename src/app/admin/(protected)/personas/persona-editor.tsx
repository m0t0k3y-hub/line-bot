'use client'

import { useState, useTransition } from 'react'

import {
  errorTextClass,
  hintClass,
  inputClass,
  labelClass,
  primaryButtonClass,
  secondaryButtonClass,
  successTextClass,
} from '@/app/admin/ui'
import { modelSuggestions, type Provider, providerLabels, providers } from '@/lib/providers'
import type { PersonaConfigForm } from '@/personas/config'
import { Playground } from '../playground/playground'
import { type ActionState, savePersonaAction } from './actions'

// プロバイダー別のオプションの入力例
const optionExamples: Record<Provider, string> = {
  anthropic: '{ "effort": "low" }',
  openai: '{ "reasoningEffort": "low" }',
  google: '{ "thinkingConfig": { "thinkingLevel": "low" } }',
}

type Props = {
  availableProviders: Provider[]
  initialConfig: PersonaConfigForm
} & (
  | { mode: 'create'; personaId?: undefined }
  | { mode: 'edit'; personaId: string; currentVersionNo: number }
)

export function PersonaEditor(props: Props) {
  const [config, setConfig] = useState(props.initialConfig)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [note, setNote] = useState('')
  const [state, setState] = useState<ActionState>({})
  const [pending, startTransition] = useTransition()

  function update<K extends keyof PersonaConfigForm>(key: K, value: PersonaConfigForm[K]) {
    setConfig((prev) => ({ ...prev, [key]: value }))
  }

  function updateShot(index: number, key: 'user' | 'assistant', value: string) {
    update(
      'fewShots',
      config.fewShots.map((shot, i) => (i === index ? { ...shot, [key]: value } : shot)),
    )
  }

  function save() {
    startTransition(async () => {
      const result = await savePersonaAction({
        personaId: props.personaId,
        name,
        description,
        config,
        note,
      })
      setState(result)
      if (result.success) setNote('')
    })
  }

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <form
        className="space-y-5"
        onSubmit={(e) => {
          e.preventDefault()
          save()
        }}
      >
        {props.mode === 'create' && (
          <>
            <div className="space-y-1">
              <label className={labelClass} htmlFor="name">
                名前
              </label>
              <input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={inputClass}
                placeholder="例：博多のおばちゃん"
              />
            </div>
            <div className="space-y-1">
              <label className={labelClass} htmlFor="description">
                説明（管理者向けのメモ。LLM には渡さない）
              </label>
              <input
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className={inputClass}
              />
            </div>
          </>
        )}

        <div className="space-y-1">
          <label className={labelClass} htmlFor="systemPrompt">
            システムプロンプト
          </label>
          <p className={hintClass}>
            方言のルール、キャラクター設定、話し方の指示など。会話の場所（1対1・グループ）の補足は自動で末尾に付きます。
          </p>
          <textarea
            id="systemPrompt"
            value={config.systemPrompt}
            onChange={(e) => update('systemPrompt', e.target.value)}
            rows={18}
            className={`${inputClass} font-mono`}
          />
        </div>

        <fieldset className="space-y-2">
          <legend className={labelClass}>会話例（few-shot）</legend>
          <p className={hintClass}>会話の履歴の前に、過去のやり取りとして LLM に渡します。</p>
          {config.fewShots.map((shot, i) => (
            <div
              key={i}
              className="space-y-2 rounded-md border border-zinc-200 p-3 dark:border-zinc-800"
            >
              <div className="flex items-center justify-between">
                <span className={hintClass}>#{i + 1}</span>
                <button
                  type="button"
                  onClick={() =>
                    update(
                      'fewShots',
                      config.fewShots.filter((_, j) => j !== i),
                    )
                  }
                  className="text-xs text-red-600 hover:underline"
                >
                  削除
                </button>
              </div>
              <textarea
                value={shot.user}
                onChange={(e) => updateShot(i, 'user', e.target.value)}
                rows={2}
                placeholder="ユーザーの発言"
                className={inputClass}
              />
              <textarea
                value={shot.assistant}
                onChange={(e) => updateShot(i, 'assistant', e.target.value)}
                rows={3}
                placeholder="理想の返答"
                className={inputClass}
              />
            </div>
          ))}
          <button
            type="button"
            onClick={() => update('fewShots', [...config.fewShots, { user: '', assistant: '' }])}
            className={secondaryButtonClass}
          >
            会話例を追加
          </button>
        </fieldset>

        <fieldset className="grid gap-4 sm:grid-cols-2">
          <legend className={`mb-2 ${labelClass}`}>モデル</legend>
          <div className="space-y-1">
            <label className={hintClass} htmlFor="provider">
              プロバイダー
            </label>
            <select
              id="provider"
              value={config.provider}
              onChange={(e) => update('provider', e.target.value as Provider)}
              className={inputClass}
            >
              {providers.map((provider) => (
                <option
                  key={provider}
                  value={provider}
                  disabled={!props.availableProviders.includes(provider)}
                >
                  {providerLabels[provider]}
                  {!props.availableProviders.includes(provider) && '（API キー未設定）'}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className={hintClass} htmlFor="model">
              モデル ID
            </label>
            <input
              id="model"
              list="model-suggestions"
              value={config.model}
              onChange={(e) => update('model', e.target.value)}
              className={inputClass}
            />
            <datalist id="model-suggestions">
              {modelSuggestions[config.provider].map((model) => (
                <option key={model} value={model} />
              ))}
            </datalist>
          </div>
          <div className="space-y-1">
            <label className={hintClass} htmlFor="maxOutputTokens">
              最大出力トークン数
            </label>
            <input
              id="maxOutputTokens"
              inputMode="numeric"
              value={config.maxOutputTokens}
              onChange={(e) => update('maxOutputTokens', e.target.value)}
              className={inputClass}
            />
            <p className={hintClass}>
              考える過程（thinking）もここに含まれるモデルがあるので、余裕を持たせてください。
            </p>
          </div>
          <div className="space-y-1 sm:col-span-2">
            <label className={hintClass} htmlFor="providerOptions">
              プロバイダー別のオプション（JSON・上級者向け）
            </label>
            <textarea
              id="providerOptions"
              value={config.providerOptions}
              onChange={(e) => update('providerOptions', e.target.value)}
              rows={3}
              placeholder={`例：${optionExamples[config.provider]}`}
              className={`${inputClass} font-mono`}
            />
          </div>
        </fieldset>

        <div className="space-y-1">
          <label className={labelClass} htmlFor="note">
            版のメモ（任意）
          </label>
          <input
            id="note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="例：語尾の「〜けん」を増やした"
            className={inputClass}
          />
        </div>

        <div className="flex items-center gap-3">
          <button type="submit" disabled={pending} className={primaryButtonClass}>
            {props.mode === 'create' ? '作成' : `版${props.currentVersionNo + 1}として保存`}
          </button>
          {props.mode === 'edit' && (
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                setConfig(props.initialConfig)
                setState({})
              }}
              className={secondaryButtonClass}
            >
              現行版に戻す
            </button>
          )}
        </div>
        {state.error && <p className={errorTextClass}>{state.error}</p>}
        {state.success && <p className={successTextClass}>{state.success}</p>}
      </form>

      <div className="xl:sticky xl:top-6 xl:h-[calc(100vh-3rem)]">
        <h2 className="mb-2 text-sm font-semibold">プレイグラウンド（保存前の内容で試せます）</h2>
        <Playground getConfig={() => config} />
      </div>
    </div>
  )
}
