import express from 'express'
import * as path from 'path'
import * as fs from 'fs'
import * as http from 'http'
import { GAMES } from './games/registry'
import { readEvents } from './store'
import { fetchAllGames } from './fetcher'
import { stopScheduler, startScheduler } from './scheduler'

const PORT = parseInt(process.env.PORT || '2444', 10)
const FRONTEND_DIR = path.resolve(process.env.FRONTEND_DIR || path.resolve(__dirname, '../../frontend'))
const DATA_DIR = path.resolve(process.env.DATA_DIR || path.resolve(__dirname, '../../data'))

const app = express()
app.use(express.json())

app.get('/api/events', (_req, res) => {
  const data = readEvents()
  const all: any[] = []
  for (const events of Object.values(data.games)) {
    for (const e of events) {
      all.push(e)
    }
  }
  res.json({ code: 200, data: all })
})

app.get('/api/events/:gameId', (req, res) => {
  const data = readEvents()
  const events = data.games[req.params.gameId]
  if (!events) {
    res.status(404).json({ code: 404, error: `Unknown game: ${req.params.gameId}` })
    return
  }
  res.json({ code: 200, data: events })
})

app.post('/api/refresh', async (_req, res) => {
  try {
    const games = await fetchAllGames()
    const all: any[] = []
    for (const events of Object.values(games)) {
      for (const e of events) {
        all.push(e)
      }
    }
    res.json({ code: 200, data: all })
  } catch (err: any) {
    res.status(500).json({ code: 500, error: err.message })
  }
})

app.get('/api/status', (_req, res) => {
  const data = readEvents()
  const perGame: Record<string, number> = {}
  for (const [id, events] of Object.entries(data.games)) {
    perGame[id] = events.length
  }
  res.json({
    code: 200,
    data: {
      lastUpdated: data.lastUpdated,
      games: perGame,
    },
  })
})

app.get('/api/about', (_req, res) => {
  // 本地开发：backend/dist/../../README.md；容器内：/app/dist/../README.md
  const candidates = [
    process.env.README_PATH,
    path.resolve(__dirname, '../../README.md'),
    path.resolve(__dirname, '../README.md'),
  ].filter(Boolean) as string[]
  for (const mdPath of candidates) {
    try {
      const md = fs.readFileSync(mdPath, 'utf-8')
      res.json({ code: 200, data: md })
      return
    } catch {
      // 尝试下一个候选路径
    }
  }
  res.json({ code: 200, data: '# Game Event Calendar\n\nA single-page game event calendar.' })
})

app.get('/api/games', (_req, res) => {
  res.json({ code: 200, data: GAMES })
})

app.get('/api/health', (_req, res) => {
  const data = readEvents()
  const gameCount = Object.values(data.games).filter(g => g.length > 0).length
  res.json({
    status: 'ok',
    lastUpdated: data.lastUpdated,
    gameCount,
    totalEvents: Object.values(data.games).reduce((sum, g) => sum + g.length, 0),
  })
})

const IMAGES_DIR = path.resolve(DATA_DIR, 'images')
app.get('/i/:filename', (req, res) => {
  const filepath = path.resolve(IMAGES_DIR, req.params.filename)
  if (!filepath.startsWith(IMAGES_DIR)) {
    res.status(403).end()
    return
  }
  if (!fs.existsSync(filepath)) {
    res.status(404).end()
    return
  }
  const ext = path.extname(filepath).toLowerCase()
  const ct: Record<string, string> = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp' }
  res.set('Content-Type', ct[ext] || 'application/octet-stream')
  res.set('Cache-Control', 'public, max-age=86400')
  fs.createReadStream(filepath).pipe(res)
})
app.use(express.static(FRONTEND_DIR))

app.get('*', (_req, res) => {
  res.sendFile(path.join(FRONTEND_DIR, 'index.html'))
})

const server: http.Server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`[server] running on http://0.0.0.0:${PORT}`)
  startScheduler()
})

function shutdown(signal: string) {
  console.log(`[server] received ${signal}, shutting down...`)
  stopScheduler()
  server.close(() => {
    console.log('[server] closed')
    process.exit(0)
  })
  setTimeout(() => {
    console.error('[server] forced exit')
    process.exit(1)
  }, 10000)
}

process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))
