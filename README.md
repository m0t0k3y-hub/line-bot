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
cp .env.example .env.local   # 値を埋める（DATABASE_URL は Neon の開発用ブランチ）
pnpm db:migrate              # テーブルを作る
pnpm db:seed                 # 最初のペルソナと設定を入れる
pnpm dev
```

`http://localhost:3000/api/health` で DB に接続できるかを確認できます。

## LINE から手元の環境を動かす

開発用 LINE チャネルの Webhook URL は `https://dedicate-pointed-aggregate.ngrok-free.dev/api/line/webhook` に設定してあります。
`pnpm dev` と別のターミナルで ngrok を起動します。

```bash
ngrok http --url=dedicate-pointed-aggregate.ngrok-free.dev 3000
```

## Vercel 上の DB

Vercel の本番と Preview のビルドでは、ビルドの前に `pnpm db:deploy` がマイグレーションと初期データの投入を行います（`vercel.json`）。
Preview は Neon が Git のブランチごとに作る Preview 用ブランチにつながるので、本番の DB には影響しません。
手元では何もしないので、開発用ブランチには `pnpm db:migrate` を手で実行します。

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
