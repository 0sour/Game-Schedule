import { CalendarActivity } from '../types'
import { fetchText, fetchJSON } from '../utils/fetch'

// 终末地数据源（混合）：
// 1. 官网公告（endfield.hypergryph.com/news）提供中文标题 + 官方 banner + 开始时间
// 2. Endfield Talos Wiki（endfield.wiki.gg）Event 页提供准确的 Asia 服起止时间，
//    按开始时间匹配补全官网公告缺失的结束时间（同一天开始的活动结束时间一致）
const NEWS_URL = 'https://endfield.hypergryph.com/news'
const WIKI_API = 'https://endfield.wiki.gg/api.php?action=parse&page=Event&prop=text&format=json'

interface Bulletin {
  cid: string
  title: string
  cover: string
}

// 从 Next.js flight 数据（转义 JSON）中提取公告列表
function parseBulletins(html: string): Bulletin[] {
  const i = html.indexOf('bulletins')
  if (i < 0) return []
  const seg = html.slice(i, i + 40000)
  const cids = [...seg.matchAll(/\\"cid\\":\\"(\d+)\\"/g)].map(m => m[1])
  const titles = [...seg.matchAll(/\\"title\\":\\"(.*?)\\",\\"author\\"/g)].map(m => m[1])
  const covers = [...seg.matchAll(/\\"cover\\":\\"(.*?)\\"/g)].map(m => m[1])
  const result: Bulletin[] = []
  for (let j = 0; j < cids.length; j++) {
    result.push({ cid: cids[j], title: titles[j] || '', cover: covers[j] || '' })
  }
  return result
}

// 从详情页正文提取「开放时间：」行（正文是 flight 转义 HTML，用正则匹配文本行）
function parseOpenTimes(html: string): { start: string; end: string }[] {
  const results: { start: string; end: string }[] = []
  const lines = [...html.matchAll(/开放时间[：:]\s*([^<]{0,120})/g)].map(m => m[1])
  for (const body of lines) {
    const times = [...body.matchAll(/(\d{4}\/\d{1,2}\/\d{1,2}\s+\d{1,2}:\d{2})/g)].map(x => x[1])
    if (times.length >= 2) {
      results.push({ start: times[0], end: times[1] })
    } else if (times.length === 1) {
      // 只有单个时间：若行首是「版本更新后」等相对描述（可能带「」前缀），则该时间是结束时间
      if (/版本更新后|维护后|更新后/.test(body) && !/^[\d]/.test(body)) {
        results.push({ start: '', end: times[0] })
      } else {
        results.push({ start: times[0], end: '' })
      }
    }
  }
  return results
}

// 从 wiki.gg Event 页提取 Asia 服起止时间（UTC ISO → 北京时间）
function parseWikiTimes(html: string): { start: string; end: string }[] {
  const results: { start: string; end: string }[] = []
  const timers = [...html.matchAll(/data-start="([^"]+)" data-end="([^"]+)"/g)]
  for (const m of timers) {
    const toLocal = (iso: string) => {
      const d = new Date(iso)
      if (isNaN(d.getTime())) return ''
      return new Date(d.getTime() + 8 * 3600 * 1000).toISOString().slice(0, 16).replace('T', ' ')
    }
    const start = toLocal(m[1])
    const end = toLocal(m[2])
    if (start && end) results.push({ start, end })
  }
  return results
}

function toLocal(dt: string): string {
  // 服务器时间即北京时间，格式 YYYY/MM/DD HH:mm → YYYY-MM-DD HH:mm
  const m = dt.match(/(\d{4})\/(\d{1,2})\/(\d{1,2})\s+(\d{1,2}):(\d{2})/)
  if (!m) return ''
  return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')} ${m[4].padStart(2, '0')}:${m[5]}`
}

export async function fetchEndfield(): Promise<CalendarActivity[]> {
  try {
    const [listHtml, wikiJson] = await Promise.all([
      fetchText(NEWS_URL),
      fetchJSON(WIKI_API).catch(() => null),
    ])
    const bulletins = parseBulletins(listHtml)
    const wikiTimes = wikiJson?.parse?.text?.['*'] ? parseWikiTimes(wikiJson.parse.text['*']) : []
    // 按开始时间索引 wiki 活动（同一天开始的活动结束时间一致，取第一个即可）
    const wikiByStart = new Map<string, string>()
    for (const t of wikiTimes) {
      if (!wikiByStart.has(t.start)) wikiByStart.set(t.start, t.end)
    }

    const results: CalendarActivity[] = []
    const seen = new Set<string>()
    for (const b of bulletins) {
      try {
        const detailHtml = await fetchText(`${NEWS_URL}/${b.cid}`)
        const times = parseOpenTimes(detailHtml)
        for (const t of times) {
          const start_time = toLocal(t.start)
          if (!start_time) continue
          const end_time = t.end ? toLocal(t.end) : (wikiByStart.get(start_time) || '')
          const key = `${b.cid}-${start_time}`
          if (seen.has(key)) continue
          seen.add(key)
          results.push({
            id: `endfield-${key}`,
            title: b.title,
            game: 'endfield',
            gameName: '终末地',
            start_time,
            end_time,
            banner: b.cover || '',
            linkUrl: `${NEWS_URL}/${b.cid}`,
            tag: '活动',
          })
        }
      } catch {
        // 单条公告失败不影响其他
      }
    }
    return results
  } catch {
    return []
  }
}
