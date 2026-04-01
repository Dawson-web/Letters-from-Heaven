export type MemorialEventType =
  | 'qingming'
  | 'birthday'
  | 'anniversary'
  | 'death_anniversary'
  | 'custom'
export type MemorialCalendarType = 'solar' | 'lunar'

export interface MemorialProfile {
  id: string
  userId: string
  relation: string
  displayName: string
  keywords: string
  note?: string | null
  timezone: string
  active: boolean
  createdAtMs: number
  updatedAtMs: number
}

export interface MemorialEvent {
  id: string
  profileId: string
  type: MemorialEventType
  calendarType: MemorialCalendarType
  month: number
  day: number
  label: string
  windowStartDays: number
  windowEndDays: number
  deliverAtHour: number
  deliverAtMinute: number
  enabled: boolean
  nextTriggerAtMs: number
  lastTriggeredYear: number
}
