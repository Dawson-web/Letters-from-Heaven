import { apiRequest } from '@/services/request'
import type { UserPreferences } from '@/types/preferences'

export function fetchPreferences() {
  return apiRequest<UserPreferences>({
    path: '/api/preferences',
  })
}

export function updatePreferences(payload: Partial<UserPreferences>) {
  return apiRequest<UserPreferences, Partial<UserPreferences>>({
    path: '/api/preferences',
    method: 'PATCH',
    data: payload,
  })
}
