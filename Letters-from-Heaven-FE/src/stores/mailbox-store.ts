import Taro from '@tarojs/taro'
import { makeAutoObservable } from 'mobx'

import { DEMO_REPLY_DELAY_MS, EMPTY_DRAFT } from '@/constants/relations'
import type {
  LetterDraft,
  LetterRecord,
  PersistedMailboxState,
  ReplyRecord
} from '@/types/mail'
import { createId } from '@/utils/id'
import { buildReply } from '@/utils/reply'

const STORAGE_KEY = 'yunduan-huixin-mailbox'

export class MailboxStore {
  boundaryAccepted = false
  draft: LetterDraft = { ...EMPTY_DRAFT }
  letters: LetterRecord[] = []
  replies: ReplyRecord[] = []
  hydrated = false

  constructor() {
    makeAutoObservable(this, {}, { autoBind: true })
  }

  get inboxItems() {
    return [...this.replies].sort((a, b) => b.createdAt - a.createdAt)
  }

  get readyCount() {
    return this.replies.filter((item) => item.status === 'ready').length
  }

  get waitingCount() {
    return this.replies.filter((item) => item.status === 'waiting').length
  }

  hydrate() {
    if (this.hydrated) {
      return
    }

    try {
      const stored = Taro.getStorageSync(STORAGE_KEY) as PersistedMailboxState | ''

      if (stored && typeof stored === 'object') {
        this.boundaryAccepted = Boolean(stored.boundaryAccepted)
        this.draft = { ...EMPTY_DRAFT, ...stored.draft }
        this.letters = Array.isArray(stored.letters) ? stored.letters : []
        this.replies = Array.isArray(stored.replies) ? stored.replies : []
      }
    } catch (error) {
      console.warn('hydrate mailbox failed', error)
      this.resetAll()
    }

    this.hydrated = true
    this.refreshReplies()
  }

  persist() {
    const payload: PersistedMailboxState = {
      boundaryAccepted: this.boundaryAccepted,
      draft: this.draft,
      letters: this.letters,
      replies: this.replies
    }

    Taro.setStorageSync(STORAGE_KEY, payload)
  }

  acceptBoundary() {
    this.boundaryAccepted = true
    this.persist()
  }

  saveDraft(nextDraft: Partial<LetterDraft>) {
    this.draft = { ...this.draft, ...nextDraft }
    this.persist()
  }

  clearDraft() {
    this.draft = { ...EMPTY_DRAFT }
    this.persist()
  }

  sendLetter(payload: LetterDraft) {
    const now = Date.now()
    const replyId = createId('reply')
    const letterId = createId('letter')
    const letter: LetterRecord = {
      ...payload,
      id: letterId,
      createdAt: now,
      replyId
    }
    const reply: ReplyRecord = {
      id: replyId,
      letterId,
      status: 'waiting',
      createdAt: now,
      availableAt: now + DEMO_REPLY_DELAY_MS,
      subject: `${payload.relation || '远方'}的回响`,
      preview: '回响正在酝酿，会在一段时间后送达。',
      body: ''
    }

    this.letters = [letter, ...this.letters]
    this.replies = [reply, ...this.replies]
    this.draft = { ...EMPTY_DRAFT }
    this.persist()

    return reply
  }

  refreshReplies() {
    let changed = false

    this.replies = this.replies.map((reply) => {
      if (reply.status !== 'waiting' || reply.availableAt > Date.now()) {
        return reply
      }

      const letter = this.letters.find((item) => item.id === reply.letterId)

      if (!letter) {
        return reply
      }

      changed = true
      return {
        ...reply,
        status: 'ready',
        ...buildReply(letter)
      }
    })

    if (changed) {
      this.persist()
    }
  }

  getReply(id?: string) {
    if (!id) {
      return undefined
    }

    this.refreshReplies()
    return this.replies.find((item) => item.id === id)
  }

  getLetter(letterId?: string) {
    if (!letterId) {
      return undefined
    }

    return this.letters.find((item) => item.id === letterId)
  }

  resetAll() {
    this.boundaryAccepted = false
    this.draft = { ...EMPTY_DRAFT }
    this.letters = []
    this.replies = []
    Taro.removeStorageSync(STORAGE_KEY)
  }
}
