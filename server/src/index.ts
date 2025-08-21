import express, { Request, Response } from 'express'
import 'dotenv/config'
import cors from 'cors'
import { randomUUID } from 'crypto'
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js'
import { InMemoryEventStore } from '@modelcontextprotocol/sdk/examples/shared/inMemoryEventStore.js'
import { getMcpServer } from './mcpServer.js'
import { loggingMiddleware } from './loggingMiddleware.js'

// Create Express application
export function createApp(): express.Application {
  const app = express()

  // ミドルウェアのセットアップ
  app.use(express.json())
  // デバッグログ表示
  app.use(loggingMiddleware)
  // CORS設定
  app.use(
    cors({
      origin: process.env.CORS_ORIGIN || '*', // TODO: change to specific origin in production
      credentials: process.env.CORS_CREDENTIALS === 'true',
      exposedHeaders: ['Mcp-Session-Id'],
      allowedHeaders: [
        'Content-Type',
        'mcp-session-id',
        'mcp-protocol-version',
      ],
    })
  )

  // ルーティング
  app.all('/mcp', mcpHandler)

  return app
}

// transportをセッションIDで管理するマップ
const transports: { [sessionId: string]: StreamableHTTPServerTransport } = {}

// MCPリクエストハンドラー
const mcpHandler = async (req: Request, res: Response) => {
  try {
    // SSE無効のため、GETリクエストは405を返す
    if (req.method === 'GET') {
      res.status(405).json({
        jsonrpc: '2.0',
        error: {
          code: -32000,
          message: 'Method not allowed.',
        },
        id: null,
      })
      return
    }

    // Check for existing session ID
    const sessionId = req.headers['mcp-session-id'] as string | undefined
    let transport: StreamableHTTPServerTransport

    if (sessionId && transports[sessionId]) {
      // Check if the transport is of the correct type
      const existingTransport = transports[sessionId]
      if (existingTransport instanceof StreamableHTTPServerTransport) {
        // Reuse existing transport
        transport = existingTransport
      } else {
        // Transport exists but is not a StreamableHTTPServerTransport (could be SSEServerTransport)
        res.status(400).json({
          jsonrpc: '2.0',
          error: {
            code: -32000,
            message:
              'Bad Request: Session exists but uses a different transport protocol',
          },
          id: null,
        })
        return
      }
    } else if (
      !sessionId &&
      req.method === 'POST' &&
      isInitializeRequest(req.body)
    ) {
      const eventStore = new InMemoryEventStore()
      transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        eventStore, // Enable resumability
        enableJsonResponse: true, // JSONレスポンスのみを使用（SSEストリーム無効）
        onsessioninitialized: (sessionId) => {
          // Store the transport by session ID when session is initialized
          transports[sessionId] = transport
        },
      })

      // Disconnect時の処理
      transport.onclose = () => {
        const sessionId = transport.sessionId
        if (sessionId && transports[sessionId]) {
          delete transports[sessionId]
        }
      }

      // Connect the transport to the MCP server
      const server = getMcpServer()
      await server.connect(transport)
    } else {
      // Invalid request - no session ID or not initialization request
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
    // Handle the request with the transport
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

  // Graceful shutdown handling
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
