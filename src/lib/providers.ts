// クライアントからも使うため、DB のスキーマとは別のファイルに置く
export const providers = ['anthropic', 'openai', 'google'] as const
export type Provider = (typeof providers)[number]

export const providerLabels: Record<Provider, string> = {
  anthropic: 'Anthropic（Claude）',
  openai: 'OpenAI',
  google: 'Google（Gemini）',
}

export type ModelTier = '軽量' | '標準' | '高性能'

// 管理画面で候補として出すモデル。軽量で安いものから並べ、先頭をプロバイダー切り替え時の初期値にする。
// ここにないモデル ID も自由に入力できる
export const modelSuggestions: Record<Provider, { id: string; tier: ModelTier }[]> = {
  anthropic: [
    { id: 'claude-haiku-5-5', tier: '軽量' },
    { id: 'claude-sonnet-5-5', tier: '標準' },
    { id: 'claude-opus-5-5', tier: '高性能' },
  ],
  openai: [
    { id: 'gpt-5.4-nano', tier: '軽量' },
    { id: 'gpt-5.4-mini', tier: '軽量' },
    { id: 'gpt-5.4', tier: '標準' },
  ],
  google: [
    { id: 'gemini-flash-lite-latest', tier: '軽量' },
    { id: 'gemini-flash-latest', tier: '標準' },
    { id: 'gemini-pro-latest', tier: '高性能' },
  ],
}
