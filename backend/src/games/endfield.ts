import * as cheerio from 'cheerio'
import { CalendarActivity } from '../types'
import { fetchText } from '../utils/fetch'

const URL = 'https://end.wiki/zh-Hans/activities/'

export async function fetchEndfield(): Promise<CalendarActivity[]> {
  try {
    const html = await fetchText(URL)
    const $ = cheerio.load(html)
    const results: CalendarActivity[] = []
    $('.activity-card').each((_, el) => {
      const card = $(el)
      const openTs = card.attr('data-open')
      if (!openTs) return
      const openMs = parseInt(openTs, 10)
      if (isNaN(openMs)) return
      const closeTs = card.attr('data-close')
      const closeMs = closeTs ? parseInt(closeTs, 10) : 0
      // end.wiki 的时间戳是 UTC，这里统一转成北京时间（UTC+8）输出
      const toBeijing = (ms: number) => new Date(ms + 8 * 3600 * 1000).toISOString().slice(0, 16).replace('T', ' ')
      const start_time = toBeijing(openMs)
      const end_time = closeMs ? toBeijing(closeMs) : ''
      const img = card.find('img')
      const banner = img.attr('src') || ''
      const nameEl = card.find('.activity-card-name')
      const title = nameEl.text().trim() || img.attr('alt') || ''
      const href = card.attr('href') || ''
      results.push({
        id: `endfield-${openMs}-${title}`,
        title,
        game: 'endfield',
        gameName: '终末地',
        start_time,
        end_time,
        banner: banner.startsWith('//') ? 'https:' + banner : banner,
        linkUrl: href ? 'https://end.wiki' + href : '',
        tag: '活动',
      })
    })
    return results
  } catch {
    return []
  }
}
