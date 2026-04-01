import Taro from '@tarojs/taro'
import { makeAutoObservable, runInAction } from 'mobx'

import { EMPTY_DRAFT } from '@/constants/relations'
import {
  clearMailbox as clearMailboxRequest,
  createLetter as createLetterRequest,
  deleteReply as deleteReplyRequest,
  fetchMailbox,
  fetchReplyDetail,
  updateReply as updateReplyRequest,
} from '@/services/mailbox'
import { getErrorMessage } from '@/services/request'
import type {
  LetterDraft,
  LetterRecord,
  PersistedMailboxState,
  ReplyFeedbackScore,
  ReplyRecord,
  SendLetterOptions,
} from '@/types/mail'

const STORAGE_KEY = 'yunduan-huixin-mailbox'

export class MailboxStore {
  boundaryAccepted = false
  draft: LetterDraft = { ...EMPTY_DRAFT }
  letters: LetterRecord[] = []
  replies: ReplyRecord[] = []
  hydrated = false
  syncing = false
  detailSyncing = false
  sending = false
  resetting = false
  lastError = ''

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

  get hasRemoteLetters() {
    return this.letters.length > 0 || this.replies.length > 0
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
      this.clearLocalState()
    }

    this.hydrated = true
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

  replaceRemoteState(nextState: Pick<PersistedMailboxState, 'letters' | 'replies'>) {
    this.letters = nextState.letters
    this.replies = nextState.replies
  }

  upsertLetter(letter?: LetterRecord | null) {
    if (!letter) {
      return
    }

    this.letters = [letter, ...this.letters.filter((item) => item.id !== letter.id)].sort(
      (a, b) => b.createdAt - a.createdAt
    )
  }

  upsertReply(reply?: ReplyRecord | null) {
    if (!reply) {
      return
    }

    this.replies = [reply, ...this.replies.filter((item) => item.id !== reply.id)].sort(
      (a, b) => b.createdAt - a.createdAt
    )
  }

  async refreshReplies(includeArchived = false) {
    if (!this.hydrated || this.syncing) {
      return
    }

    this.syncing = true

    try {
      const mailbox = await fetchMailbox({ includeArchived })

      runInAction(() => {
        this.replaceRemoteState(mailbox)
        this.lastError = ''
        this.persist()
      })
    } catch (error) {
      console.warn('refresh mailbox failed', error)

      runInAction(() => {
        this.lastError = getErrorMessage(error)
      })
    } finally {
      runInAction(() => {
        this.syncing = false
      })
    }
  }

  async sendLetter(payload: LetterDraft, options: SendLetterOptions = {}) {
    if (this.sending) {
      throw new Error('这封信还在投递中，请再等一会儿')
    }

    this.sending = true

    try {
      const requestPayload = options.testMode
        ? { ...payload, testMode: true }
        : payload
      const result = await createLetterRequest(requestPayload)

      runInAction(() => {
        this.upsertLetter(result.letter)
        this.upsertReply(result.reply)
        this.draft = { ...EMPTY_DRAFT }
        this.lastError = ''
        this.persist()
      })

      return result.reply
    } catch (error) {
      runInAction(() => {
        this.lastError = getErrorMessage(error)
      })

      throw error
    } finally {
      runInAction(() => {
        this.sending = false
      })
    }
  }

  async refreshReplyDetail(id?: string) {
    if (!id) {
      return undefined
    }

    this.detailSyncing = true

    try {
      const detail = await fetchReplyDetail(id)

      runInAction(() => {
        this.upsertLetter(detail.letter)
        this.upsertReply(detail.reply)
        this.lastError = ''
        this.persist()
      })

      return detail.reply
    } catch (error) {
      console.warn('refresh reply detail failed', error)

      runInAction(() => {
        this.lastError = getErrorMessage(error)
      })

      return this.getReply(id)
    } finally {
      runInAction(() => {
        this.detailSyncing = false
      })
    }
  }

  getReply(id?: string) {
    if (!id) {
      return undefined
    }

    return this.replies.find((item) => item.id === id)
  }

  getLetter(letterId?: string) {
    if (!letterId) {
      return undefined
    }

    return this.letters.find((item) => item.id === letterId)
  }

  async updateReplySubject(id: string, subject: string) {
    const reply = await updateReplyRequest(id, { subject })

    runInAction(() => {
      this.upsertReply(reply)
      this.lastError = ''
      this.persist()
    })

    return reply
  }

  async markReplyRead(id: string, read = true) {
    const reply = await updateReplyRequest(id, {
      readAt: read ? Date.now() : null,
    })

    runInAction(() => {
      this.upsertReply(reply)
      this.lastError = ''
      this.persist()
    })

    return reply
  }

  async toggleReplyFavorite(id: string, favorite?: boolean) {
    const current = this.getReply(id)
    const target = favorite ?? !Boolean(current?.favorite)
    const reply = await updateReplyRequest(id, { favorite: target })

    runInAction(() => {
      this.upsertReply(reply)
      this.lastError = ''
      this.persist()
    })

    return reply
  }

  async toggleReplyArchived(id: string, archived?: boolean) {
    const current = this.getReply(id)
    const target = archived ?? !Boolean(current?.archived)
    const reply = await updateReplyRequest(id, { archived: target })

    runInAction(() => {
      this.upsertReply(reply)
      this.lastError = ''
      this.persist()
    })

    return reply
  }

  async updateReplyFeedback(id: string, score: ReplyFeedbackScore | null, reason = '') {
    const reply = await updateReplyRequest(id, {
      feedbackScore: score,
      feedbackReason: reason,
    })

    runInAction(() => {
      this.upsertReply(reply)
      this.lastError = ''
      this.persist()
    })

    return reply
  }

  async deleteReply(id: string) {
    await deleteReplyRequest(id)

    runInAction(() => {
      this.replies = this.replies.filter((item) => item.id !== id)
      this.lastError = ''
      this.persist()
    })
  }

  clearLocalState() {
    this.boundaryAccepted = false
    this.draft = { ...EMPTY_DRAFT }
    this.letters = []
    this.replies = []
    this.lastError = ''
    Taro.removeStorageSync(STORAGE_KEY)
  }

  resetAll() {
    return this.clearAll()
  }

  async clearInboxItems() {
    this.resetting = true

    try {
      await clearMailboxRequest()

      runInAction(() => {
        this.letters = []
        this.replies = []
        this.lastError = ''
        this.persist()
      })
    } catch (error) {
      runInAction(() => {
        this.lastError = getErrorMessage(error)
      })

      throw error
    } finally {
      runInAction(() => {
        this.resetting = false
      })
    }
  }

  async clearAll() {
    this.resetting = true

    try {
      await clearMailboxRequest()

      runInAction(() => {
        this.clearLocalState()
      })
    } catch (error) {
      runInAction(() => {
        this.lastError = getErrorMessage(error)
      })

      throw error
    } finally {
      runInAction(() => {
        this.resetting = false
      })
    }
  }
}
