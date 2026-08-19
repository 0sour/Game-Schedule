import { CalendarActivity } from '../types'
import { fetchJSON } from '../utils/fetch'

const API_URL = 'https://hkrpg-api-static.mihoyo.com/common/hkrpg_cn/announcement/api/getAnnList?game=hkrpg&game_biz=hkrpg_cn&lang=zh-cn&bundle_id=hkrpg_cn&platform=pc&region=prod_gf_cn&level=30&uid=11111111'

const IGNORE_KEYWORDS = ['防沉迷', '公平运营', '问卷', '调查', '社媒', '无名勋礼', '版本更新说明', '优化', '内容专题页', '米游社', '有奖问卷', '反馈功能']

export async function fetchStarRail(): Promise<CalendarActivity[]> {
  try {
    const data = await fetchJSON(API_URL)
    const list = data?.data?.list || []
    const target = list.find((item: any) => item.type_id === 4)
    if (!target) return []
    const items: any[] = target.list || []
    return items
      .filter((item: any) => {
        const title = item.title || ''
        return !IGNORE_KEYWORDS.some(kw => title.includes(kw))
      })
      .map((item: any) => ({
        id: item.ann_id || item.id,
        title: item.title || '',
        game: 'starrail',
        gameName: '星穹铁道',
        start_time: item.start_time || '',
        end_time: item.end_time || '',
        banner: item.banner || '',
        linkUrl: '',
        tag: '活动',
      }))
      .filter(e => e.start_time && e.end_time)
  } catch {
    return []
  }
}
