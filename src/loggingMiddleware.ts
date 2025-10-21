import { Request, Response, NextFunction } from 'express'

export const loggingMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const sessionId = req.headers['mcp-session-id'] as string | undefined

  console.log(
    `\n=== ${req.method} ${req.path} - Session: ${sessionId || 'none'} ===`
  )

  // リクエストヘッダーを表示
  console.log('Request Headers:')
  console.log(JSON.stringify(req.headers, null, 2))

  if (req.body && Object.keys(req.body).length > 0) {
    console.log('Request Body:')
    console.log(JSON.stringify(req.body, null, 2))
  }

  const originalWrite = res.write
  const originalEnd = res.end
  const chunks: Buffer[] = []

  res.write = function (chunk: any, ...args: any[]): boolean {
    chunks.push(Buffer.from(chunk))
    return (originalWrite as any).apply(res, [chunk, ...args])
  }

  res.end = function (chunk?: any, ...args: any[]) {
    if (chunk) {
      chunks.push(Buffer.from(chunk))
    }

    console.log(`Response StatusCode: ${res.statusCode}`)
    const headers = res.getHeaders()
    if (Object.keys(headers).length > 0) {
      console.log('Response Headers:', JSON.stringify(headers, null, 2))
    }

    const body = Buffer.concat(chunks).toString('utf8')
    if (body) {
      console.log('Response Body:')
      try {
        console.log(JSON.stringify(JSON.parse(body), null, 2))
      } catch (e) {
        console.log(body)
      }
    }

    console.log('=== RESPONSE END ===\n')
    return (originalEnd as any).apply(res, [chunk, ...args])
  }

  next()
}
