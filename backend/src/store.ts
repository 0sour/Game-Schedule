import * as fs from 'fs'
import * as path from 'path'
import { EventsData } from './types'

const DATA_DIR = path.resolve(__dirname, '../../data')
const DATA_FILE = path.join(DATA_DIR, 'events.json')

function ensureDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true })
  }
}

export function readEvents(): EventsData {
  try {
    ensureDir()
    if (!fs.existsSync(DATA_FILE)) {
      return { lastUpdated: '', games: {} }
    }
    const raw = fs.readFileSync(DATA_FILE, 'utf-8')
    return JSON.parse(raw) as EventsData
  } catch {
    return { lastUpdated: '', games: {} }
  }
}

export function writeEvents(data: EventsData): void {
  ensureDir()
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8')
}
