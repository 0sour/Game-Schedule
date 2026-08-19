import { CalendarActivity } from '../types'
import { fetchJSON } from '../utils/fetch'

const HOYOLAB_HEADERS = {
  'Origin': 'https://www.hoyolab.com',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
}

function parseDateFromText(text: string): { start: string; end: string } {
  const re = /(\d{4})\/(\d{1,2})\/(\d{1,2})\s+(\d{1,2}):(\d{2})/g
  const matches = [...text.matchAll(re)]
  if (matches.length >= 2) {
    const fmt = (m: RegExpMatchArray) => `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')} ${m[4].padStart(2, '0')}:${m[5]}`
    return { start: fmt(matches[0]), end: fmt(matches[matches.length - 1]) }
  }
  return { start: '', end: '' }
}

export async function fetchZZZ(): Promise<CalendarActivity[]> {
  try {
    const [res1, res2] = await Promise.all([
      fetchJSON('https://bbs-api-os.hoyolab.com/community/post/wapi/getNewsList?gids=8&page_size=10&type=1&lang=zh-cn', { headers: HOYOLAB_HEADERS }),
      fetchJSON('https://bbs-api-os.hoyolab.com/community/post/wapi/getNewsList?gids=8&page_size=10&type=2&lang=zh-cn', { headers: HOYOLAB_HEADERS }),
    ])
    const posts: any[] = []
    const seen = new Set<number>()
    for (const item of [...(res1?.data?.list || []), ...(res2?.data?.list || [])]) {
      const p = item.post
      if (!p || seen.has(p.post_id)) continue
      seen.add(p.post_id)
      posts.push(p)
    }
    const results: CalendarActivity[] = []
    const postsToFetch = posts.slice(0, 15)
    // 分批并发拉详情，避免 15 个请求串行拖慢刷新
    for (let i = 0; i < postsToFetch.length; i += 5) {
      const batch = postsToFetch.slice(i, i + 5)
      const batchResults = await Promise.all(batch.map(async (post) => {
        try {
          const detail = await fetchJSON(
            `https://bbs-api-os.hoyolab.com/community/post/wapi/getPostFull?gids=8&post_id=${post.post_id}&lang=zh-cn`,
            { headers: HOYOLAB_HEADERS }
          )
          const full = detail?.data?.post?.post || post
          const desc = full.desc || post.desc || ''
          const content = full.content || ''
          const text = desc + '\n' + content
          const { start, end } = parseDateFromText(text)
          const mi = post.multi_language_info || full.multi_language_info || {}
          const zhTitle = mi?.lang_subject?.['zh-cn'] || ''
          return {
            id: post.post_id,
            title: zhTitle || post.subject || '',
            game: 'zzz',
            gameName: '绝区零',
            start_time: start,
            end_time: end,
            banner: post.cover || '',
            linkUrl: `https://www.hoyolab.com/article/${post.post_id}`,
            tag: '活动',
          }
        } catch {
          return null
        }
      }))
      for (const r of batchResults) {
        if (r) results.push(r)
      }
    }
    return results.filter(e => e.start_time && e.end_time)
  } catch {
    return []
  }
}
