export type RelationOption =
  | '妈妈'
  | '爸爸'
  | '爷爷'
  | '奶奶'
  | '外公'
  | '外婆'
  | '爱人'
  | '朋友'
  | '其他'

export type ReplyStatus = 'waiting' | 'ready'
export type ReplySourceType = 'letter' | 'memorial'

export interface LetterDraft {
  title: string
  body: string
  relation: RelationOption | ''
  signature: string
}

export interface LetterRecord extends LetterDraft {
  id: string
  createdAt: number
  replyId: string
}

export interface ReplyRecord {
  id: string
  letterId: string
  sourceType: ReplySourceType
  memorialProfileId?: string | null
  memorialEventId?: string | null
  sourceLetterId?: string | null
  status: ReplyStatus
  createdAt: number
  availableAt: number
  subject: string
  preview: string
  body: string
}

export interface PersistedMailboxState {
  boundaryAccepted: boolean
  draft: LetterDraft
  letters: LetterRecord[]
  replies: ReplyRecord[]
}
