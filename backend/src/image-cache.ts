import * as fs from 'fs'
import * as path from 'path'
import * as crypto from 'crypto'
import { CalendarActivity } from './types'
import { fetchBuffer } from './utils/fetch'

const IMAGES_DIR = path.resolve(process.env.DATA_DIR || path.resolve(__dirname, '../../data'), 'images')

function ensureDir(): void {
  if (!fs.existsSync(IMAGES_DIR)) {
    fs.mkdirSync(IMAGES_DIR, { recursive: true })
  }
}

function urlToFilename(url: string): string {
  const hash = crypto.createHash('md5').update(url).digest('hex')
  const ext = path.extname(new URL(url).pathname).toLowerCase() || '.png'
  return hash + ext
}

async function downloadImage(url: string): Promise<string | null> {
  const filename = urlToFilename(url)
  const filepath = path.join(IMAGES_DIR, filename)
  if (fs.existsSync(filepath)) return filename
  try {
    const buf = await fetchBuffer(url)
    fs.writeFileSync(filepath, buf)
    return filename
  } catch {
    return null
  }
}

export async function cacheImages(events: CalendarActivity[]): Promise<CalendarActivity[]> {
  ensureDir()
  const bannerUrls = [...new Set(events.map(e => e.banner).filter(Boolean) as string[])]
  const results = await Promise.allSettled(bannerUrls.map(url => downloadImage(url)))
  const map = new Map<string, string | null>()
  for (let i = 0; i < bannerUrls.length; i++) {
    map.set(bannerUrls[i], results[i].status === 'fulfilled' ? (results[i] as PromiseFulfilledResult<string | null>).value : null)
  }
  return events.map(e => {
    if (!e.banner) return e
    const filename = map.get(e.banner)
    if (filename) {
      return { ...e, banner: `/i/${filename}` }
    }
    return e
  })
}
