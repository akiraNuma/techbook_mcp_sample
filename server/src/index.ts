import 'dotenv/config'
import express from 'express'
import cors from 'cors'

const app = express()
const PORT = process.env.MCP_SERVER_PORT || 3000

// ミドルウェア設定
app.use(cors())
app.use(express.json())

// ルート設定
app.get('/', (req, res) => {
  res.json({
    message: 'MCP Server Sample is running! (Hot reload test)',
  })
})

app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
  })
})

// サーバー起動
app.listen(PORT, () => {
  console.log(`🚀 MCP Server is running on http://localhost:${PORT}`)
  console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`)
  console.log(`🔧 Node.js version: ${process.version}`)
})

export default app
