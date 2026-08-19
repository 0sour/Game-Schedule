export interface CalendarActivity {
  id: number | string
  title: string
  game: string
  gameName: string
  start_time: string
  end_time: string
  banner?: string
  linkUrl?: string
  tag?: string
}

export interface GameConfig {
  id: string
  name: string
  icon: string
  color: string
}

export interface EventsData {
  lastUpdated: string
  games: Record<string, CalendarActivity[]>
}
