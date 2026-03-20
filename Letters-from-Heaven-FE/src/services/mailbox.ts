import type { LetterDraft, LetterRecord, ReplyRecord } from '@/types/mail'

import { apiRequest } from '@/services/request'

export interface MailboxPayload {
  letters: LetterRecord[]
  replies: ReplyRecord[]
  readyCount: number
  waitingCount: number
}

export interface CreateLetterPayload {
  letter: LetterRecord
  reply: ReplyRecord
}

export interface ReplyDetailPayload {
  reply: ReplyRecord
  letter: LetterRecord | null
}

export interface ClearMailboxPayload {
  deletedLetters: number
  deletedReplies: number
}

export function fetchMailbox() {
  return apiRequest<MailboxPayload>({
    path: '/api/mailbox',
  })
}

export function createLetter(payload: LetterDraft) {
  return apiRequest<CreateLetterPayload, LetterDraft>({
    path: '/api/letters',
    method: 'POST',
    data: payload,
  })
}

export function fetchReplyDetail(replyId: string) {
  return apiRequest<ReplyDetailPayload>({
    path: `/api/replies/${replyId}`,
  })
}

export function clearMailbox() {
  return apiRequest<ClearMailboxPayload>({
    path: '/api/mailbox',
    method: 'DELETE',
  })
}
