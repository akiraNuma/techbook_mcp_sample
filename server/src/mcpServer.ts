import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { completable } from '@modelcontextprotocol/sdk/server/completable.js'
import { z } from 'zod'

export function getMcpServer(): McpServer {
  const server = new McpServer({
    name: process.env.MCP_SERVER_NAME || 'techbook-mcp-server',
    version: process.env.MCP_SERVER_VERSION || '1.0.0',
  })

  // ツール
  server.registerTool(
    'get_weather',
    {
      title: 'Weather Tool',
      description: 'Gets the current weather information for a specified city.',
      inputSchema: {
        city: z
          .string()
          .describe('The name of the city to get the weather for'),
        datetime: z
          .string()
          .optional()
          .describe('Optional datetime to get the weather for'),
      },
    },
    (args: { city?: string; datetime?: string }) => {
      const rand = (max: number) => Math.floor(Math.random() * max)
      const { city, datetime } = args
      const descriptions = ['Sunny', 'Cloudy', 'Rainy', 'Snowy']
      const weatherInfo = {
        city,
        temperature: `${15 + rand(20)}°C`,
        feelsLike: `${15 + rand(20)}°C`,
        humidity: `${rand(60)}%`,
        pressure: `${950 + rand(100)} hPa`,
        description: descriptions[rand(descriptions.length)],
        windSpeed: `${rand(10)} m/s`,
        timestamp: new Date(datetime ? datetime : Date.now()).toISOString(),
      }
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(weatherInfo, null, 2),
          },
        ],
      }
    }
  )

  // リソース
  server.registerResource(
    'status-resource',
    'customscheme://server_status',
    {
      title: 'Server Status',
      description: 'Current server status information',
      mimeType: 'application/json',
    },
    () => {
      const status = {
        timestamp: new Date().toISOString(),
        status: 'running',
      }

      return {
        contents: [
          {
            uri: 'customscheme://server_status',
            text: JSON.stringify(status, null, 2),
          },
        ],
      }
    }
  )

  // プロンプト
  server.registerPrompt(
    'character_speech_converter',
    {
      title: '語尾変換ツール',
      description: 'テキストに指定した語尾を付けて変換します',
      argsSchema: {
        text: z.string().describe('変換したいテキスト'),
        gobi: completable(z.string().describe('語尾'), (value) => {
          return ['にゃん', 'ですわ', 'だぜ', 'だゾ'].filter((d) =>
            d.startsWith(value || '')
          )
        }),
      },
    },
    (args: { text: string; gobi: string }) => {
      const { text, gobi } = args

      // 日本語でプロンプトを構築
      let prompt = `次のテキストを「${gobi}」という語尾をつけて変換してください。\n`
      prompt += `元のテキスト：「${text}」\n`

      return {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: prompt,
            },
          },
        ],
      }
    }
  )

  return server
}
