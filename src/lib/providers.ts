// クライアントからも使うため、DB のスキーマとは別のファイルに置く
export const providers = ['anthropic', 'openai', 'google'] as const
export type Provider = (typeof providers)[number]

export const providerLabels: Record<Provider, string> = {
  anthropic: 'Anthropic（Claude）',
  openai: 'OpenAI',
  google: 'Google（Gemini）',
}

// 管理画面で候補として出すモデル。ここにないモデル ID も自由に入力できる
export const modelSuggestions: Record<Provider, string[]> = {
  anthropic: ['claude-opus-5-5', 'claude-sonnet-5-5', 'claude-haiku-5-5', 'claude-fable-5-1'],
  openai: ['gpt-6-sol', 'gpt-6-luna', 'gpt-5.6', 'gpt-5.4-mini'],
  google: ['gemini-flash-latest', 'gemini-pro-latest', 'gemini-flash-lite-latest'],
}
