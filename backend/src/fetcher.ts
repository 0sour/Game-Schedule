import { CalendarActivity } from './types'
import { writeEvents } from './store'
import { cacheImages } from './image-cache'
import { nowStr } from './utils/time'
import { fetchGenshin } from './games/genshin'
import { fetchStarRail } from './games/starrail'
import { fetchZZZ } from './games/zzz'
import { fetchWutheringWaves } from './games/wuthering-waves'
import { fetchArknights } from './games/arknights'
import { fetchEndfield } from './games/endfield'

let refreshing = false

export async function fetchAllGames(): Promise<Record<string, CalendarActivity[]>> {
  if (refreshing) {
    const { readEvents } = await import('./store')
    return readEvents().games
  }
  refreshing = true
  try {
    const results = await Promise.allSettled([
      fetchGenshin(),
      fetchStarRail(),
      fetchZZZ(),
      fetchWutheringWaves(),
      fetchArknights(),
      fetchEndfield(),
    ])
    const games: Record<string, CalendarActivity[]> = {
      genshin: extract(results[0]),
      starrail: extract(results[1]),
      zzz: extract(results[2]),
      mc: extract(results[3]),
      ak: extract(results[4]),
      endfield: extract(results[5]),
    }
    const allEvents = Object.values(games).flat()
    const cached = await cacheImages(allEvents)
    const grouped: Record<string, CalendarActivity[]> = {}
    for (const e of cached) {
      if (!grouped[e.game]) grouped[e.game] = []
      grouped[e.game].push(e)
    }
    writeEvents({ lastUpdated: nowStr(), games: grouped })
    return grouped
  } finally {
    refreshing = false
  }
}

function extract(result: PromiseSettledResult<CalendarActivity[]>): CalendarActivity[] {
  return result.status === 'fulfilled' ? result.value : []
}
