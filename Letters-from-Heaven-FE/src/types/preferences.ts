export type DeliveryPace = 'fast' | 'balanced' | 'slow'
export type ReminderChannel = 'none' | 'mini_program_subscribe' | 'official_account'

export interface UserPreferences {
  deliveryPace: DeliveryPace
  quietStartMinute: number | null
  quietEndMinute: number | null
  reminderEnabled: boolean
  reminderChannel: ReminderChannel
  officialAccountOpenId: string
  miniProgramTemplateId: string
  officialAccountTemplateId: string
  notifyLanguage: string
}
