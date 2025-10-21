# MCP Server Application

## 概要
このディレクトリは、Express + TypeScript + MCP SDK を使ったMCPサーバーのサンプルプロジェクトです。

## 環境情報

### Node.js バージョン
- **推奨バージョン**: Node.js 22.17.1 ( `.node-version` で指定)

### バージョン管理ツールでのセットアップ
```bash
# nodenv を使用している場合
nodenv install 22.17.1
nodenv local 22.17.1

# nvm を使用している場合
nvm install 22.17.1
nvm use 22.17.1
```

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