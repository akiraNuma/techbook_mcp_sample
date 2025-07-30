# コードで学ぶMCP 実装入門

技術書のサンプルコードリポジトリです。

## 概要

このリポジトリは、Model Context Protocol (MCP) の実装を学ぶためのサンプルプロジェクトです。
サーバー側とクライアント側（ホストアプリ）の両方の実装例を含むモノレポ構成になっています。

## プロジェクト構成

```
techbook_mcp_sample/
├── server/          # MCPサーバー (Node.js + Express.js + TypeScript)
├── client/          # MCPホストアプリ (Vue.js + TypeScript)
├── .node-version    # Node.jsバージョン指定
└── README.md        # このファイル
```

## 共通環境要件

### Node.js バージョン
- **推奨バージョン**: Node.js 22.17.1 (プロジェクトルートの `.node-version` で指定)

### バージョン管理ツールでのセットアップ
```bash
# nodenv を使用している場合
nodenv install 22.17.1
nodenv local 22.17.1

# nvm を使用している場合
nvm install 22.17.1
nvm use 22.17.1
```

## 各プロジェクトのセットアップ

### サーバー側 (MCPサーバー)
```bash
cd server
npm install
npm run dev
```

詳細な手順は [server/README.md](./server/README.md) を参照してください。

### クライアント側 (MCPホストアプリ)
```bash
cd client
npm install
npm run dev
```

詳細な手順は [client/README.md](./client/README.md) を参照してください。

## 技術スタック

### サーバー側
- **Node.js** + **Express.js**
- **TypeScript**
- **MCP SDK** (`@modelcontextprotocol/sdk`)
- **ESLint** + **Prettier**

### クライアント側
- **Vue.js 3**
- **TypeScript**
- **MCP SDK** (`@modelcontextprotocol/sdk`)
- **ESLint** + **Prettier**

## 開発の進め方

1. **環境構築**: 上記の共通環境要件に従ってNode.jsをセットアップ
2. **サーバー開発**: `server/` ディレクトリでMCPサーバーを実装・起動
3. **クライアント開発**: `client/` ディレクトリでMCPホストアプリを実装・起動
4. **動作確認**: サーバーとクライアント間でMCP通信が正常に行われることを確認

## ライセンス

このプロジェクトは技術書のサンプルコードとして提供されています。
詳細は [LICENSE](./LICENSE) ファイルを参照してください。
