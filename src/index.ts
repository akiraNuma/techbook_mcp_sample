import express, { Request, Response } from 'express'
import 'dotenv/config'
import cors from 'cors'
import { randomUUID } from 'crypto'
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js'
import { InMemoryEventStore } from '@modelcontextprotocol/sdk/examples/shared/inMemoryEventStore.js'
import { createMcpServer } from './mcpServer.js'
import { loggingMiddleware } from './loggingMiddleware.js'

export function createApp(): express.Application {
  const app = express()

  // ミドルウェアのセットアップ
  app.use(express.json())
  // デバッグログ表示
  app.use(loggingMiddleware)
  // CORS設定
  app.use(
    cors({
      origin: process.env.CORS_ORIGIN || '*', // TODO: 本番では特定のドメインに変更してください
      exposedHeaders: ['Mcp-Session-Id'],
      allowedHeaders: [
        'Content-Type',
        'mcp-session-id',
        'mcp-protocol-version',
        'x-custom-auth-headers', // クライアントサイドから独自の認証ヘッダー等を送信する場合などに追加
      ],
    })
  )

  // ルーティング
  // ルーティングの詳細については以下を参照
  // https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#streamable-http
  app.all('/mcp', mcpHandler)

  return app
}

// 各セッションに対応するトランスポートを管理するマップ
const transports: { [sessionId: string]: StreamableHTTPServerTransport } = {}

// MCPリクエストハンドラー
const mcpHandler = async (req: Request, res: Response) => {
  try {
    // セッション管理の仕組みについては以下を参照
    // https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#session-management
    // セッションIDを取得
    const sessionId = req.headers['mcp-session-id'] as string | undefined
    let transport: StreamableHTTPServerTransport | undefined

    // 無効なリクエストをチェック
    if (!sessionId && !isInitializeRequest(req.body)) {
      // セッションIDがないかつ初期化リクエストでもない場合は無効
      res.status(400).json({
        jsonrpc: '2.0',
        error: {
          code: -32000,
          message: 'Bad Request',
        },
        id: null,
      })
      return
    }

    // 新規セッションの処理
    if (!sessionId && isInitializeRequest(req.body)) {
      // 新規セッションを開始する場合はトランスポートを新規作成する
      const eventStore = new InMemoryEventStore()
      // トランスポートインスタンスを作成
      transport = new StreamableHTTPServerTransport({
        // トランスポートの設定（通信方式の設定）
        sessionIdGenerator: () => randomUUID(),
        eventStore, // Enable resumability
        enableJsonResponse: false, // SSEストリーム有効化(デフォルトの設定) trueにした場合、通常のJSONレスポンス(application/json)が返る
        onsessioninitialized: (sessionId) => {
          // セッション初期化時のコールバック
          // セッションとトランスポートを紐付けて保存する
          if (transport) {
            transports[sessionId] = transport
          }
        },
      })

      // Disconnect時の処理
      // クライアントからセッションを終了するためのDELETEリクエストが来た際に発火する
      // https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#session-management
      // TODO: DELETEメソッドのリクエストに紐づけて処理する必要はなく、DELETEメソッドでTransportのoncloseイベントを通るようになっている旨、本で説明
      transport.onclose = () => {
        console.log('Transport closed for session:', transport?.sessionId)
        const sessionId = transport?.sessionId
        if (sessionId && transports[sessionId]) {
          // セッションに紐づくトランスポートを破棄する
          delete transports[sessionId]
        }
      }

      // mcpServerクラスをtransportに接続
      const mcpServer = createMcpServer()
      await mcpServer.connect(transport)
    }

    // 既存セッションの処理
    if (sessionId && transports[sessionId]) {
      // 既存セッションが存在する場合、保存済みトランスポートを再利用する
      transport = transports[sessionId]
    }

    // トランスポートが設定されていない場合
    if (!transport) {
      // DELETEリクエストでセッションが終了させようとしている場合
      if (req.method === 'DELETE') {
        // 200 OKで応答し穏便に終了させる。要調査
        console.log('Session ended:', sessionId)
        // セッションに紐づくトランスポートを破棄する。存在しないはずだが念の為
        if (sessionId && transports[sessionId]) {
          delete transports[sessionId]
        }
        res.send(200)
        return
      }

      // エラーとして応答
      res.status(400).json({
        jsonrpc: '2.0',
        error: {
          code: -32000,
          message: 'Bad Request: No valid session ID provided',
        },
        id: null,
      })
      return
    }

    // トランスポートでリクエストを処理する
    await transport.handleRequest(req, res, req.body)
  } catch (error) {
    console.error('Error handling MCP request:', error)
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: '2.0',
        error: {
          code: -32603,
          message: 'Internal server error',
        },
        id: null,
      })
    }
  }
}

export function startServer() {
  const app = createApp()
  const PORT = process.env.MCP_SERVER_PORT || 3000

  const server = app.listen(PORT, (error?: Error) => {
    if (error) {
      console.error('Failed to start server:', error)
      process.exit(1)
    }
    console.log(`MCP Streamable HTTP Server listening on port ${PORT}`)
    console.log(`MCP endpoint available at: http://localhost:${PORT}/mcp`)
  })

  // Graceful shutdown
  const gracefulShutdown = async (signal: string) => {
    console.log(`\nReceived ${signal}. Shutting down gracefully...`)

    server.close((err) => {
      if (err) {
        console.error('Error during server shutdown:', err)
        process.exit(1)
      }

      console.log('Server closed successfully')
      process.exit(0)
    })

    // Force shutdown after 10 seconds
    setTimeout(() => {
      console.error(
        'Could not close connections in time, forcefully shutting down'
      )
      process.exit(1)
    }, 10000)
  }

  // Handle shutdown signals
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
  process.on('SIGINT', () => gracefulShutdown('SIGINT'))

  return server
}

startServer()
