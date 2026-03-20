import Taro from '@tarojs/taro'

import type { PersistedUserState } from '@/types/user'

export const USER_STORAGE_KEY = 'yunduan-huixin-user'

export function hasAuthorizedUserProfile() {
  try {
    const stored = Taro.getStorageSync(USER_STORAGE_KEY) as PersistedUserState | ''

    return Boolean(
      stored &&
        typeof stored === 'object' &&
        stored.profile?.displayName &&
        stored.profile?.avatarUrl
    )
  } catch (error) {
    console.warn('read user auth failed', error)
    return false
  }
}

export function ensureAuthorizedUser(message = '请先完成微信授权') {
  if (!hasAuthorizedUserProfile()) {
    throw new Error(message)
  }
}

export function navigateToAuthorizationHome() {
  return Taro.reLaunch({ url: '/pages/home/index' })
}
