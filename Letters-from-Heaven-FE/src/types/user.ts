export interface WechatAuthorizationDraft {
  nickName: string
  avatarUrl: string
  gender?: number
  country?: string
  province?: string
  city?: string
}

export interface AuthorizedUserProfile {
  displayName: string
  avatarUrl: string
  gender?: number
  country?: string
  province?: string
  city?: string
  authorizedAt: number
}

export interface PersistedUserState {
  profile: AuthorizedUserProfile | null
}
