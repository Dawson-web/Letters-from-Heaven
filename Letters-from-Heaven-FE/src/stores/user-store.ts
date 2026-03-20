import Taro from '@tarojs/taro'
import { makeAutoObservable, runInAction } from 'mobx'

import type {
  AuthorizedUserProfile,
  PersistedUserState,
  WechatAuthorizationDraft,
} from '@/types/user'
import { USER_STORAGE_KEY } from '@/utils/auth'

export class UserStore {
  profile: AuthorizedUserProfile | null = null
  hydrated = false
  authorizing = false
  lastError = ''

  constructor() {
    makeAutoObservable(this, {}, { autoBind: true })
  }

  get isAuthorized() {
    return Boolean(this.profile?.displayName && this.profile?.avatarUrl)
  }

  hydrate() {
    if (this.hydrated) {
      return
    }

    try {
      const stored = Taro.getStorageSync(USER_STORAGE_KEY) as PersistedUserState | ''

      if (stored && typeof stored === 'object' && stored.profile) {
        this.profile = stored.profile
      }
    } catch (error) {
      console.warn('hydrate user failed', error)
      this.clearLocalState()
    }

    this.hydrated = true
  }

  persist() {
    const payload: PersistedUserState = {
      profile: this.profile,
    }

    Taro.setStorageSync(USER_STORAGE_KEY, payload)
  }

  clearLocalState() {
    this.profile = null
    this.lastError = ''
    Taro.removeStorageSync(USER_STORAGE_KEY)
  }

  async authorizeProfile(payload: WechatAuthorizationDraft) {
    this.authorizing = true

    try {
      const displayName = payload.nickName.trim().slice(0, 20)
      const avatarUrl = payload.avatarUrl.trim()

      if (!displayName || !avatarUrl) {
        throw new Error('请先选择头像并填写昵称')
      }

      runInAction(() => {
        this.profile = {
          displayName,
          avatarUrl,
          gender: payload.gender,
          country: payload.country,
          province: payload.province,
          city: payload.city,
          authorizedAt: Date.now(),
        }
        this.lastError = ''
        this.persist()
      })
    } catch (error) {
      const nextMessage =
        error instanceof Error ? error.message : '授权失败，请稍后再试'

      runInAction(() => {
        this.lastError = nextMessage
      })

      throw error
    } finally {
      runInAction(() => {
        this.authorizing = false
      })
    }
  }
}
