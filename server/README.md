# MCP Server Application

## 概要
このディレクトリは、Express + TypeScript + MCP SDK を使ったMCPサーバーのサンプルプロジェクトです。

## セットアップ手順

1. 依存関係のインストール
```bash
npm install
```

2. 環境変数の設定
```bash
cp .env.example .env
# .envファイルを編集して適切な値を設定してください
```

3. サーバー起動(開発モード)
```bash
npm run dev
```

## エンドポイント

- `http://localhost:3000/mcp`(デフォルト設定の場合)

## デバッグ用ツール

```bash
npx @modelcontextprotocol/inspector
```