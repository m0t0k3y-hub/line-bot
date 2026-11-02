'use client'

import type { PersonaConfigForm } from '@/personas/config'
import { Playground } from './playground'

// サーバーコンポーネントからは関数を渡せないため、決まった設定を返す関数をここで作る
export function PlaygroundWithConfig({ config }: { config: PersonaConfigForm }) {
  return (
    <div className="h-[70vh]">
      <Playground getConfig={() => config} />
    </div>
  )
}
