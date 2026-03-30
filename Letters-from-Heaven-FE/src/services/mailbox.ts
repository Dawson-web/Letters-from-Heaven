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

export interface DeleteReplyPayload {
  deleted: boolean
  id: string
}

export interface CreateLetterRequest extends LetterDraft {
  testMode?: boolean
}

export function fetchMailbox() {
  return apiRequest<MailboxPayload>({
    path: '/api/mailbox',
  })
}

export function createLetter(payload: CreateLetterRequest) {
  return apiRequest<CreateLetterPayload, CreateLetterRequest>({
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

export function updateReply(replyId: string, payload: Pick<ReplyRecord, 'subject'>) {
  return apiRequest<ReplyRecord, Pick<ReplyRecord, 'subject'>>({
    path: `/api/replies/${replyId}`,
    method: 'PATCH',
    data: payload,
  })
}

export function deleteReply(replyId: string) {
  return apiRequest<DeleteReplyPayload>({
    path: `/api/replies/${replyId}`,
    method: 'DELETE',
  })
}

export function clearMailbox() {
  return apiRequest<ClearMailboxPayload>({
    path: '/api/mailbox',
    method: 'DELETE',
  })
}
