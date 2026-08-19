const GAME_ICONS = {
  genshin: '/icons/genshin.png', starrail: '/icons/starrail.png', zzz: '/icons/zzz.png',
  mc: '/icons/mc.png', ak: '/icons/ak.png', endfield: '/icons/endfield.png',
}
const GAME_COLORS = {
  genshin: '#3B82F6', starrail: '#A855F7', zzz: '#DC2626',
  mc: '#06B6D4', ak: '#22C55E', endfield: '#6366F1',
}
const GAME_NAMES = {
  genshin: '原神', starrail: '星穹铁道', zzz: '绝区零',
  mc: '鸣潮', ak: '明日方舟', endfield: '终末地',
}

let allEvents = []
let hiddenGames = new Set()
let loading = false
let viewMode = 'group' // 'group' | 'timeline'
const expanded = {}
// 渲染时维护的索引表：卡片/折叠按钮通过数字索引引用事件，避免内联 JSON 的转义问题
let renderedEvents = []
let renderedGroups = []

function getDateStr() {
  const d = new Date()
  const pad = n => String(n).padStart(2, '0')
  return `${pad(d.getMonth() + 1)}.${pad(d.getDate())}`
}

function getDayName() {
  return ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][new Date().getDay()]
}

function daysBetween(a, b) {
  const diff = new Date(b) - new Date(a)
  return Math.floor(diff / (1000 * 60 * 60 * 24))
}

function hoursUntil(dt) {
  return (new Date(dt) - new Date()) / (1000 * 60 * 60)
}

function getEventStatus(event) {
  const now = new Date()
  const end = new Date(event.end_time)
  const start = new Date(event.start_time)
  if (end < now) return 'ended'
  if (start > now) return 'upcoming'
  return 'ongoing'
}

function getUrgency(event) {
  const now = new Date()
  const end = new Date(event.end_time)
  const days = daysBetween(now, end)
  if (days <= 3) return 1
  if (days <= 7) return 2
  return 3
}

function getProgress(event) {
  const start = new Date(event.start_time).getTime()
  const end = new Date(event.end_time).getTime()
  const now = Date.now()
  if (now <= start) return 0
  if (now >= end) return 100
  return Math.round(((now - start) / (end - start)) * 100)
}

function getDayColor(days) {
  if (days <= 3) return 'red'
  if (days <= 7) return 'orange'
  return 'gray'
}

function formatDateRange(event) {
  const s = event.start_time.slice(5, 16)
  const e = event.end_time.slice(5, 16)
  return `${s} → ${e}`
}

function render() {
  const now = new Date()
  const container = document.getElementById('event-container')
  const statsContainer = document.getElementById('stats')
  const urgencyContainer = document.getElementById('urgency-items')
  const filterContainer = document.getElementById('filter-row')
  const lastUpdatedEl = document.getElementById('last-updated')
  const dateEl = document.getElementById('date-display')

  dateEl.innerHTML = `${getDateStr()}<div class="sub">${getDayName()}</div>`

  if (loading) {
    container.innerHTML = '<div class="loading-overlay"><div class="spinner"></div><div>加载中...</div></div>'
    return
  }

  renderedEvents = []
  renderedGroups = []

  let filtered = allEvents.filter(e => !hiddenGames.has(e.game))
  let activeGames = new Set(filtered.map(e => e.game))

  const ongoing = filtered.filter(e => getEventStatus(e) === 'ongoing').sort((a, b) => new Date(a.end_time) - new Date(b.end_time))
  const upcoming = filtered.filter(e => getEventStatus(e) === 'upcoming').sort((a, b) => new Date(a.start_time) - new Date(b.start_time))
  const ended = filtered.filter(e => getEventStatus(e) === 'ended').sort((a, b) => new Date(b.end_time) - new Date(a.end_time))

  statsContainer.innerHTML = `
    <div class="stat-cell"><div class="num green">${ongoing.length}</div><div class="label">正在进行</div></div>
    <div class="stat-cell"><div class="num orange">${upcoming.length}</div><div class="label">即将开始</div></div>
    <div class="stat-cell"><div class="num" style="color:#9CA3AF">${ended.length}</div><div class="label">已结束</div></div>
    <div class="stat-cell"><div class="num" style="color:var(--text)">${activeGames.size}</div><div class="label">活跃游戏</div></div>
  `

  const urgentItems = ongoing.filter(e => getUrgency(e) <= 1).slice(0, 8)
  if (urgentItems.length > 0) {
    urgencyContainer.innerHTML = urgentItems.map(e => {
      const h = hoursUntil(e.end_time)
      const dayText = h <= 0 ? '即将结束' : h <= 24 ? '今天截止' : h <= 48 ? '明天截止' : `${Math.ceil(h / 24)}天后截止`
      return `<div class="urgency-item"><span class="game">${GAME_NAMES[e.game] || e.game}</span> <span class="name">${esc(e.title)}</span> <span class="day">${dayText}</span></div>`
    }).join('')
  } else {
    urgencyContainer.innerHTML = '<div class="urgency-item" style="color:#9CA3AF">暂无即将截止的活动</div>'
  }

  const filterGames = [...new Set(allEvents.map(e => e.game))].sort()
  const absentGames = Object.keys(GAME_NAMES).filter(g => !filterGames.includes(g))

  let filterHtml = '<span class="f ' + (hiddenGames.size === 0 ? 'active' : '') + '" data-game="ALL">ALL</span>'
  for (const g of filterGames) {
    const muted = hiddenGames.has(g)
    const icon = GAME_ICONS[g] || '🎮'
    const iconHtml = typeof icon === 'string' && icon.startsWith('/') ? `<img src="${icon}" style="width:14px;height:14px;vertical-align:middle;margin-right:2px">` : icon
    filterHtml += `<span class="f ${muted ? 'muted' : ''}" data-game="${g}">${iconHtml} ${GAME_NAMES[g] || g}</span>`
  }
  for (const g of absentGames) {
    const icon = GAME_ICONS[g] || '🎮'
    const iconHtml = typeof icon === 'string' && icon.startsWith('/') ? `<img src="${icon}" style="width:14px;height:14px;vertical-align:middle;margin-right:2px">` : icon
    filterHtml += `<span class="f muted" data-game="${g}" style="opacity:0.2">${iconHtml} ${GAME_NAMES[g] || g}</span>`
  }
  filterHtml += `<button class="refresh-btn" id="refresh-btn" onclick="triggerRefresh()">🔄 刷新数据</button>`
  filterContainer.innerHTML = filterHtml

  document.querySelectorAll('.filter-row .f').forEach(el => {
    el.addEventListener('click', () => {
      const game = el.dataset.game
      if (game === 'ALL') {
        hiddenGames = new Set()
      } else {
        if (hiddenGames.has(game)) hiddenGames.delete(game)
        else hiddenGames.add(game)
      }
      render()
    })
  })

  let html = ''
  if (viewMode === 'timeline') {
    html = renderTimeline(filtered, now)
  } else {
    html += renderSection('🟢 正在进行', ongoing, now, '#00BD7D')
    html += renderSection('📅 即将开始', upcoming, now, '#D97706')
    html += renderSection('📄 已结束', ended, now, '#9CA3AF')
  }

  if (!html) html = '<div class="no-events">暂无活动数据</div>'

  container.innerHTML = html
}

// 全局时间线视图：所有活动按开始时间排序，按日期分组为垂直时间轴
function renderTimeline(events, now) {
  if (events.length === 0) return ''

  const sorted = [...events].sort((a, b) => new Date(a.start_time) - new Date(b.start_time))
  const byDay = new Map()
  for (const e of sorted) {
    const day = e.start_time.slice(0, 10)
    if (!byDay.has(day)) byDay.set(day, [])
    byDay.get(day).push(e)
  }

  const today = now.toISOString().slice(0, 10)
  const pad = n => String(n).padStart(2, '0')
  const dayLabel = day => {
    const d = new Date(day + 'T00:00:00')
    const diff = Math.round((new Date(day + 'T00:00:00') - new Date(today + 'T00:00:00')) / (1000 * 60 * 60 * 24))
    const week = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][d.getDay()]
    const rel = diff === 0 ? '今天' : diff === 1 ? '明天' : diff === -1 ? '昨天' : diff > 0 ? `${diff} 天后` : `${-diff} 天前`
    return `${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${week} · ${rel}`
  }

  let html = ''
  for (const [day, dayEvents] of byDay) {
    const isToday = day === today
    html += `<div class="tl-day ${isToday ? 'today' : ''}">
      <div class="tl-date"><span class="tl-dot"></span>${dayLabel(day)}</div>
      <div class="tl-events">${dayEvents.map(e => renderTimelineItem(e, now)).join('')}</div>
    </div>`
  }
  return html
}

function renderTimelineItem(event, now) {
  const status = getEventStatus(event)
  const color = GAME_COLORS[event.game] || '#111827'
  const idx = renderedEvents.length
  renderedEvents.push(event)
  const statusLabel = status === 'ongoing' ? '进行中' : status === 'upcoming' ? '即将开始' : '已结束'
  const statusClass = status === 'ongoing' ? 'ongoing' : status === 'upcoming' ? 'upcoming' : 'ended'
  const timeText = `${event.start_time.slice(5, 16)} → ${event.end_time.slice(5, 16)}`
  return `<div class="tl-item ${statusClass}" onclick="openModalAt(${idx})">
    <span class="tl-bar" style="background:${color}"></span>
    <div class="tl-info">
      <div class="tl-title">${esc(event.title)}</div>
      <div class="tl-meta"><span class="tag" style="background:${color}">${GAME_NAMES[event.game] || event.game}</span> ${timeText}</div>
    </div>
    <div class="tl-status">${statusLabel}</div>
  </div>`
}

function renderSection(title, events, now, color) {
  if (events.length === 0) return ''
  const byGame = {}
  for (const e of events) {
    if (!byGame[e.game]) byGame[e.game] = []
    byGame[e.game].push(e)
  }

  let sectionHtml = `<div class="section-title"><h3 style="color:${color}">${title}</h3><span class="fill"></span><span class="count">${events.length} 个活动</span></div>`

  for (const [game, gameEvents] of Object.entries(byGame)) {
    const limit = 3
    const total = gameEvents.length
    const key = `${title}-${game}`
    const isExpanded = expanded[key] === true

    if (total <= limit) {
      sectionHtml += gameEvents.map(e => renderCard(e, now)).join('')
    } else {
      for (let i = 0; i < limit; i++) {
        sectionHtml += renderCard(gameEvents[i], now)
      }
      const hiddenHtml = gameEvents.slice(limit).map(e => renderCard(e, now)).join('')
      const gc = GAME_COLORS[game] || '#111827'
      const gi = GAME_ICONS[game] || '🎮'
      const giHtml = typeof gi === 'string' && gi.startsWith('/') ? `<img src="${gi}" style="width:18px;height:18px;display:block">` : gi
      const gn = GAME_NAMES[game] || game
      const toggleLabel = isExpanded ? `收起 ${gn} 的全部活动` : `查看 ${gn} 全部 ${total} 个活动`
      const toggleArrow = isExpanded ? '▲' : '▼'
      const groupIdx = renderedGroups.length
      renderedGroups.push(key)
      sectionHtml += `<div class="collapse-wrap ${isExpanded ? 'open' : ''}" data-collapse="${groupIdx}"><div class="collapse-inner">${hiddenHtml}</div></div>`
      sectionHtml += `<div class="toggle-card" onclick="toggleGameGroup(${groupIdx})">
        <div class="tc-icon" style="border-color:${gc}">${giHtml}</div>
        <div class="tc-info"><div class="tc-title">${toggleLabel}</div></div>
        <div class="tc-arrow">${toggleArrow}</div>
      </div>`
    }
  }

  return sectionHtml
}

function toggleGameGroup(groupIdx) {
  const key = renderedGroups[groupIdx]
  if (key === undefined) return
  if (expanded[key]) {
    const wrap = document.querySelector(`[data-collapse="${groupIdx}"]`)
    if (wrap) {
      wrap.classList.remove('open')
      wrap.addEventListener('transitionend', function handler() {
        wrap.removeEventListener('transitionend', handler)
        expanded[key] = false
        render()
      })
      return
    }
  }
  expanded[key] = true
  render()
  requestAnimationFrame(() => {
    const wrap = document.querySelector(`[data-collapse="${groupIdx}"]`)
    if (wrap) wrap.classList.add('open')
  })
}

function openModalAt(idx) {
  const event = renderedEvents[idx]
  if (event) openModal(event)
}

function openModal(event) {
  const overlay = document.getElementById('modal-overlay')
  const img = document.getElementById('modal-img')
  const title = document.getElementById('modal-title')
  const game = document.getElementById('modal-game')
  const time = document.getElementById('modal-time')
  const link = document.getElementById('modal-link')

  title.textContent = event.title || ''
  game.textContent = (GAME_NAMES[event.game] || event.game) + (event.tag ? ' · ' + event.tag : '')
  time.textContent = formatDateRange(event)
  if (event.banner && event.game !== 'mc') {
    img.src = event.banner
    img.style.display = 'block'
  } else {
    img.style.display = 'none'
  }
  if (event.linkUrl) {
    link.href = event.linkUrl
    link.style.display = 'inline-block'
  } else {
    link.style.display = 'none'
  }
  overlay.classList.add('open')
}

function closeModal() {
  document.getElementById('modal-overlay').classList.remove('open')
}

function openAbout() {
  const overlay = document.getElementById('about-overlay')
  const content = document.getElementById('about-content')
  fetch('/api/about').then(r => r.json()).then(d => {
    if (d.code === 200) {
      content.innerHTML = renderMarkdown(d.data)
    } else {
      content.textContent = 'Failed to load about info'
    }
  }).catch(() => {
    content.textContent = 'Failed to load about info'
  })
  overlay.classList.add('open')
}

function closeAbout() {
  document.getElementById('about-overlay').classList.remove('open')
}

function renderMarkdown(md) {
  const lines = md.split('\n')
  let inTable = false
  let html = ''
  for (const line of lines) {
    if (line.startsWith('# ')) html += `<h3 style="margin:12px 0 6px;font-size:16px">${line.slice(2)}</h3>`
    else if (line.startsWith('## ')) html += `<h4 style="margin:10px 0 4px;font-size:14px">${line.slice(3)}</h4>`
    else if (line.startsWith('- ')) html += `<div>• ${line.slice(2)}</div>`
    else if (line.startsWith('| ') && line.endsWith('|')) {
      if (!inTable) { inTable = true; html += '<table style="width:100%;border-collapse:collapse;margin:8px 0;font-size:12px"><tr>' }
      const cells = line.split('|').filter(Boolean)
      const isHeader = /^[-]+$/.test(cells[0]?.trim())
      if (isHeader) continue
      html += '<tr>' + cells.map(c => `<td style="padding:4px 8px;border:1px solid var(--border-light)">${c.trim()}</td>`).join('') + '</tr>'
    } else {
      if (inTable) { html += '</table>'; inTable = false }
      if (line.trim()) html += `<p style="margin:4px 0">${line}</p>`
    }
  }
  if (inTable) html += '</table>'
  return html
}

function renderCard(event, now) {
  const status = getEventStatus(event)
  const days = daysBetween(now, new Date(event.end_time))
  const progress = getProgress(event)
  const dayColor = status === 'ended' ? 'gray' : getDayColor(days)
  let dayLabel = ''
  let displayDays = 0
  if (status === 'ended') {
    displayDays = Math.ceil((now - new Date(event.end_time)) / (1000 * 60 * 60 * 24))
    dayLabel = '天前结束'
  } else if (status === 'upcoming') {
    displayDays = daysBetween(now, new Date(event.start_time))
    dayLabel = '天后开始'
  } else {
    displayDays = days
    dayLabel = displayDays <= 0 ? '今天结束' : '天后结束'
  }
  const color = GAME_COLORS[event.game] || '#111827'
  const idx = renderedEvents.length
  renderedEvents.push(event)

  const gameIcon = GAME_ICONS[event.game] || '🎮'
  const isImageIcon = typeof gameIcon === 'string' && gameIcon.startsWith('/')
  const iconHtml = event.game === 'mc' && event.banner
    ? `<img class="icon-box icon-img" style="border-color:${color}" src="${esc(event.banner)}" alt="">`
    : isImageIcon
      ? `<img class="icon-box icon-img" style="border-color:${color}" src="${esc(gameIcon)}" alt="">`
      : `<div class="icon-box" style="border-color:${color}">${gameIcon}</div>`

  return `<div class="card" onclick="openModalAt(${idx})">
    ${iconHtml}
    <div class="info">
      <div class="title">${esc(event.title)}</div>
      <div class="meta"><span class="tag" style="background:${color}">${GAME_NAMES[event.game] || event.game}</span> ${formatDateRange(event)}${event.tag ? ' · ' + event.tag : ''}</div>
    </div>
    <div class="right"><div class="days ${dayColor}">${displayDays < 0 ? 0 : displayDays}</div><div class="label">${dayLabel}</div></div>
    <div class="progress-track"><div class="bar ${dayColor}" style="width:${Math.min(progress, 100)}%"></div></div>
  </div>`
}

function esc(s) {
  if (!s) return ''
  const d = document.createElement('div')
  d.textContent = s
  return d.innerHTML
}

function showToast(msg, isError = false) {
  let toast = document.getElementById('toast')
  if (!toast) {
    toast = document.createElement('div')
    toast.id = 'toast'
    document.body.appendChild(toast)
  }
  toast.textContent = msg
  toast.classList.toggle('error', isError)
  toast.classList.add('show')
  clearTimeout(showToast._timer)
  showToast._timer = setTimeout(() => toast.classList.remove('show'), 3000)
}

async function fetchEvents() {
  loading = true
  render()
  try {
    const [eventsRes, statusRes] = await Promise.all([
      fetch('/api/events'),
      fetch('/api/status'),
    ])
    const eventsJson = await eventsRes.json()
    if (eventsJson.code === 200) {
      allEvents = eventsJson.data || []
    }
    const statusJson = await statusRes.json()
    if (statusJson.code === 200) {
      const el = document.getElementById('last-updated')
      const games = statusJson.data.games || {}
      const info = Object.entries(games)
        .filter(([, c]) => c > 0)
        .map(([id, c]) => `${GAME_NAMES[id] || id}(${c})`)
        .join(' · ')
      if (el && statusJson.data.lastUpdated) {
        el.innerHTML = `last updated · ${statusJson.data.lastUpdated}<br><span style="font-size:9px;opacity:0.5">${info}</span>`
      }
    }
  } catch {
    showToast('加载活动数据失败，请检查网络或稍后重试', true)
  }
  loading = false
  render()
}

async function triggerRefresh() {
  const btn = document.getElementById('refresh-btn')
  if (!btn || btn.disabled) return
  btn.disabled = true
  btn.textContent = '⏳ 刷新中...'
  try {
    const res = await fetch('/api/refresh', { method: 'POST' })
    const json = await res.json()
    if (json.code === 200) {
      allEvents = json.data || []
    }
    const statusRes = await fetch('/api/status')
    const statusJson = await statusRes.json()
    if (statusJson.code === 200) {
      const el = document.getElementById('last-updated')
      const games = statusJson.data.games || {}
      const info = Object.entries(games)
        .filter(([, c]) => c > 0)
        .map(([id, c]) => `${GAME_NAMES[id] || id}(${c})`)
        .join(' · ')
      if (el && statusJson.data.lastUpdated) {
        el.innerHTML = `last updated · ${statusJson.data.lastUpdated}<br><span style="font-size:9px;opacity:0.5">${info}</span>`
      }
    }
  } catch {
    showToast('刷新失败，请稍后重试', true)
  }
  btn.disabled = false
  btn.textContent = '🔄 刷新数据'
  render()
}

async function loadGames() {
  try {
    const res = await fetch('/api/games')
    const json = await res.json()
    if (json.code === 200 && json.data) {
      for (const g of json.data) {
        if (g.icon) GAME_ICONS[g.id] = g.icon
        if (g.color) GAME_COLORS[g.id] = g.color
        if (g.name) GAME_NAMES[g.id] = g.name
      }
    }
  } catch {
    showToast('加载游戏配置失败', true)
  }
}

function getTheme() {
  return localStorage.getItem('theme') || 'light'
}

function setTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme)
  localStorage.setItem('theme', theme)
  const btn = document.getElementById('theme-btn')
  if (btn) btn.textContent = theme === 'dark' ? '☀️' : '🌙'
}

function toggleTheme() {
  setTheme(getTheme() === 'dark' ? 'light' : 'dark')
}

function toggleView() {
  viewMode = viewMode === 'group' ? 'timeline' : 'group'
  const btn = document.getElementById('view-btn')
  if (btn) btn.textContent = viewMode === 'timeline' ? '▦ 分组' : '≡ 时间线'
  render()
}

(async function init() {
  setTheme(getTheme())
  await loadGames()
  await fetchEvents()
})()
