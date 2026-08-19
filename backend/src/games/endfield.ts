import * as cheerio from 'cheerio'
import { CalendarActivity } from '../types'
import { fetchJSON } from '../utils/fetch'

// end.wiki 已失效（域名无 DNS 记录），改用 Endfield Talos Wiki（endfield.wiki.gg）
// 的 Event 页面：.mp-event 卡片含活动名、类型、banner、data-start/data-end（UTC ISO）
const API_URL = 'https://endfield.wiki.gg/api.php?action=parse&page=Event&prop=text&format=json'

function toLocal(iso: string): string {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  // 转北京时间（UTC+8）输出，与项目其他数据源一致
  return new Date(d.getTime() + 8 * 3600 * 1000).toISOString().slice(0, 16).replace('T', ' ')
}

export async function fetchEndfield(): Promise<CalendarActivity[]> {
  try {
    const data = await fetchJSON(API_URL)
    const html = data?.parse?.text?.['*']
    if (!html) return []
    const $ = cheerio.load(html)
    const results: CalendarActivity[] = []
    $('.mp-event').each((_, el) => {
      const card = $(el)
      const name = card.find('.mp-event-name').first().text().trim()
      if (!name) return
      // 取 Asia 服时间（第一个 timer 即 Asia）
      const timer = card.find('.mp-event-timer').first()
      const startIso = timer.attr('data-start') || ''
      const endIso = timer.attr('data-end') || ''
      const start_time = toLocal(startIso)
      const end_time = toLocal(endIso)
      if (!start_time || !end_time) return
      const type = card.find('.mp-event-type').first().text().trim()
      const img = card.find('.mp-event-image img').first()
      const banner = img.attr('src') || ''
      const href = card.find('.mp-event-image a').first().attr('href') || ''
      results.push({
        id: `endfield-${name}`,
        title: name,
        game: 'endfield',
        gameName: '终末地',
        start_time,
        end_time,
        banner: banner ? (banner.startsWith('//') ? 'https:' + banner : banner.startsWith('/') ? 'https://endfield.wiki.gg' + banner : banner) : '',
        linkUrl: href ? 'https://endfield.wiki.gg' + href : '',
        tag: type || '活动',
      })
    })
    return results
  } catch {
    return []
  }
}
