# 方言チャットボット

LLM を使って、方言とキャラクターで会話する LINE Bot です。

- 仕様書：[docs/spec.md](docs/spec.md)
- 実装計画：[docs/plan.md](docs/plan.md)

## 必要なもの

- Node.js 24
- pnpm（`corepack enable pnpm` で使えるようになります）

## セットアップ

```bash
pnpm install
cp .env.example .env.local   # 値を埋める
pnpm dev
```

`http://localhost:3000/api/health` で DB に接続できるかを確認できます。

## よく使うコマンド

| コマンド                       | 内容                               |
| ------------------------------ | ---------------------------------- |
| `pnpm dev`                     | 開発サーバーを起動する             |
| `pnpm lint` / `pnpm typecheck` | 静的チェック                       |
| `pnpm format`                  | Prettier で整形する                |
| `pnpm test`                    | 単体テストを実行する               |
| `pnpm db:generate`             | スキーマからマイグレーションを作る |
| `pnpm db:migrate`              | マイグレーションを DB に適用する   |
| `pnpm db:studio`               | Drizzle Studio で DB の中身を見る  |
