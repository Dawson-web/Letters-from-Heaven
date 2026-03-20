export type MemorialEventType = 'qingming' | 'birthday' | 'anniversary' | 'custom'

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
  month: number
  day: number
  label: string
  windowStartDays: number
  windowEndDays: number
  deliverAtHour: number
  enabled: boolean
  nextTriggerAtMs: number
  lastTriggeredYear: number
}
