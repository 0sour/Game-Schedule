import * as cheerio from 'cheerio'
import { CalendarActivity } from '../types'
import { fetchJSON, fetchText } from '../utils/fetch'
import dayjs from 'dayjs'
import customParseFormat from 'dayjs/plugin/customParseFormat'

dayjs.extend(customParseFormat)

const LIST_URL = 'https://ak-webview.hypergryph.com/api/game/bulletinList?target=IOS'
const DETAIL_URL = 'https://ak-webview.hypergryph.com/api/game/bulletin'

const titleReg = /[一二三四五六七八九十]{1,2}、[^一二三四五六七八九十]+?(?=活动时间：)/gm
const timeReg = /[一二三四五六七八九十]{1,2}、[^一二三四五六七八九十]+?活动时间：.+?-.+?\d{1,2}:\d{2}/gm
const timeSimpleReg = /\d{1,2}月\d{1,2}日.+?-.+?\d{1,2}:\d{1,2}/

function parseTime(str: string, displayTime: string) {
  const parts = str.replace(/活动时间：/, '').split('-')
  if (parts.length < 2) return null
  const [startStr, endStr] = parts.map(s => s.trim())
  let start = dayjs(startStr, ['YYYY MM DD HH:mm', 'MM DD HH:mm', 'MM DD'], 'zh-cn')
  let end = dayjs(endStr, ['YYYY MM DD HH:mm', 'MM DD HH:mm', 'MM DD'], 'zh-cn')
  if (!start.isValid() || !end.isValid()) return null
  if (!startStr.includes(':')) start = start.hour(16).minute(0)
  if (!endStr.includes(':')) end = end.hour(4).minute(0)
  const publishTime = dayjs(displayTime)
  if (!startStr.includes('年') && publishTime.isValid()) {
    const py = publishTime.year()
    if (start.year() !== py) {
      start = start.year(py)
      end = end.year(py)
    }
  }
  if (startStr.includes('年') && !endStr.includes('年') && start.isAfter(end)) {
    end = end.add(1, 'year')
  }
  if (!startStr.includes('年') && endStr.includes('年') && start.isAfter(end)) {
    start = start.subtract(1, 'year')
  }
  return {
    start_time: start.format('YYYY-MM-DD HH:mm'),
    end_time: end.format('YYYY-MM-DD HH:mm'),
  }
}

// 按公告段落结构提取每个活动的 banner：遍历段落元素，遇到「一、标题」开启新活动，
// 段落内或段落前的第一个 <img> 归该活动（公告常见 banner 在标题上方或下方两种布局）
function extractBanners($: cheerio.CheerioAPI): Map<string, string> {
  const map = new Map<string, string>()
  let lastTitle: string | null = null
  let pendingImg: string | null = null
  $('p, div, h1, h2, h3, h4, h5, h6, li').each((_, el) => {
    const $el = $(el)
    const text = $el.text().trim()
    const m = text.match(/^[一二三四五六七八九十]{1,2}、(.+)/)
    if (m) {
      const title = m[1].trim()
      if (pendingImg && !map.has(title)) {
        map.set(title, pendingImg)
      }
      pendingImg = null
      lastTitle = title
      return
    }
    const img = $el.find('img').first()
    if (img.length) {
      const src = img.attr('src') || ''
      if (!src) return
      if (lastTitle && !map.has(lastTitle)) {
        map.set(lastTitle, src)
      } else {
        pendingImg = src
      }
    }
  })
  return map
}

async function fetchDetail(cid: string): Promise<CalendarActivity[]> {
  try {
    const url = `${DETAIL_URL}/${cid}?target=IOS`
    const data = await fetchJSON(url)
    const item = data?.data
    if (!item?.content) return []
    const content = item.content
    const text = content.replace(/<[^>]*>/g, ' ')
    const titles = text.match(titleReg)?.map((t: string) => t.trim()) || []
    const times = text.match(timeReg)?.map((t: string) => t.replace(titleReg, '').trim()) || []
    if (!titles.length || !times.length) return []
    const $ = cheerio.load(content)
    const banners = extractBanners($)
    const results: CalendarActivity[] = []
    for (let i = 0; i < titles.length && i < times.length; i++) {
      const parsed = parseTime(times[i], item.displayTime)
      if (!parsed) continue
      const title = titles[i].replace(/^[一二三四五六七八九十]+、/, '').trim()
      results.push({
        id: `${item.cid}-${i}`,
        title,
        game: 'ak',
        gameName: '明日方舟',
        start_time: parsed.start_time,
        end_time: parsed.end_time,
        banner: banners.get(title) || '',
        linkUrl: item.jumpLink || '',
        tag: '活动',
      })
    }
    return results
  } catch {
    return []
  }
}

export async function fetchArknights(): Promise<CalendarActivity[]> {
  try {
    const data = await fetchJSON(LIST_URL)
    const items: any[] = data?.data?.list || []
    const events = items.filter((item: any) => item.category === 1)
    const results = await Promise.all(events.map((e: any) => fetchDetail(e.cid)))
    return results.flat()
  } catch {
    return []
  }
}
