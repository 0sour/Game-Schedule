import { fetchAllGames } from './fetcher'
import { readEvents } from './store'

function getNextRun(): number {
  const now = new Date()
  const h = now.getHours()
  const m = now.getMinutes()
  const current = h * 60 + m
  const t1 = 5 * 60
  const t2 = 12 * 60
  let next: number
  if (current < t1) next = t1
  else if (current < t2) next = t2
  else next = t1 + 24 * 60
  return (next - current) * 60 * 1000
}

let timer: ReturnType<typeof setTimeout> | null = null

function schedule(): void {
  const delay = getNextRun()
  console.log(`[scheduler] next fetch at ${new Date(Date.now() + delay).toLocaleString('zh-CN')}`)
  timer = setTimeout(async () => {
    console.log('[scheduler] fetching all games...')
    await fetchAllGames()
    console.log('[scheduler] done')
    schedule()
  }, delay)
}

export function startScheduler(): void {
  const events = readEvents()
  const hasData = Object.keys(events.games).length > 0
  if (!hasData) {
    console.log('[scheduler] no cached data, fetching immediately...')
    fetchAllGames().then(() => schedule())
  } else {
    console.log(`[scheduler] cached data found (${events.lastUpdated}), scheduling...`)
    schedule()
  }
}

export function stopScheduler(): void {
  if (timer) {
    clearTimeout(timer)
    timer = null
  }
}
