import { diffLines } from 'diff'

import { providerLabels } from '@/lib/providers'
import type { PersonaConfig } from './config'

export type DiffPart = { kind: 'added' | 'removed' | 'same'; text: string }
export type DiffSection = { label: string; changed: boolean; parts: DiffPart[] }

/** 版を、違いを見せる単位（システムプロンプト・会話例・モデルの設定）のテキストにする */
function toSections(config: PersonaConfig): { label: string; text: string }[] {
  return [
    { label: 'システムプロンプト', text: config.systemPrompt },
    {
      label: '会話例',
      text: config.fewShots
        .map((shot, i) => `#${i + 1}\nユーザー：${shot.user}\n理想の返答：${shot.assistant}`)
        .join('\n\n'),
    },
    {
      label: 'モデルの設定',
      text: [
        `プロバイダー：${providerLabels[config.provider]}`,
        `モデル：${config.model}`,
        `最大出力トークン数：${config.maxOutputTokens}`,
        `オプション：${JSON.stringify(config.providerOptions, null, 2)}`,
      ].join('\n'),
    },
  ]
}

export function diffConfigs(before: PersonaConfig, after: PersonaConfig): DiffSection[] {
  const afterSections = toSections(after)
  return toSections(before).map((section, i) => {
    const parts: DiffPart[] = diffLines(
      ensureTrailingNewline(section.text),
      ensureTrailingNewline(afterSections[i].text),
    ).map((change) => ({
      kind: change.added ? 'added' : change.removed ? 'removed' : 'same',
      text: change.value,
    }))
    return {
      label: section.label,
      changed: parts.some((part) => part.kind !== 'same'),
      parts,
    }
  })
}

// 最終行の改行の有無だけで「変更あり」にならないようにする
function ensureTrailingNewline(text: string): string {
  return text === '' || text.endsWith('\n') ? text : `${text}\n`
}
