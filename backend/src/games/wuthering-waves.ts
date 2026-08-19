import { CalendarActivity } from '../types'
import { fetchJSON } from '../utils/fetch'

const KURO_API = 'https://api.kurobbs.com/wiki/core/homepage/getPage'

export async function fetchWutheringWaves(): Promise<CalendarActivity[]> {
  try {
    const raw: any = await fetchJSON(KURO_API, {
      method: 'POST',
      headers: { Wiki_type: '9', 'Content-Type': 'application/json' },
      body: '{}',
    })
    const contentJson = raw?.data?.contentJson
    if (!contentJson) return []
    const cj = typeof contentJson === 'string' ? JSON.parse(contentJson) : contentJson
    const sideModules = cj.sideModules || []
    const target = sideModules.find((s: any) => s.title === '版本活动')
    if (!target) return []
    const items: any[] = target.content || []
    return items
      .filter((item: any) => item.countDown?.dateRange)
      .map((item: any) => {
        const [start_time, end_time] = item.countDown.dateRange
        return {
          id: item.linkConfig?.entryId ?? `mc-${start_time}-${item.title || ''}`,
          title: item.title || '',
          game: 'mc',
          gameName: '鸣潮',
          start_time: start_time || '',
          end_time: end_time || '',
          banner: item.contentUrl || '',
          linkUrl: item.linkConfig?.linkUrl || '',
          tag: '活动',
        }
      })
  } catch {
    return []
  }
}
