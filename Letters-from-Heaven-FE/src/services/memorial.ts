import type { MemorialEvent, MemorialProfile } from '@/types/memorial'

import { apiRequest } from '@/services/request'

export function fetchMemorialProfiles() {
  return apiRequest<MemorialProfile[]>({
    path: '/api/memorial-profiles',
  })
}

export function createMemorialProfile(payload: Partial<MemorialProfile>) {
  return apiRequest<MemorialProfile, Partial<MemorialProfile>>({
    path: '/api/memorial-profiles',
    method: 'POST',
    data: payload,
  })
}

export function updateMemorialProfile(id: string, payload: Partial<MemorialProfile>) {
  return apiRequest<MemorialProfile, Partial<MemorialProfile>>({
    path: `/api/memorial-profiles/${id}`,
    method: 'PATCH',
    data: payload,
  })
}

export function deleteMemorialProfile(id: string) {
  return apiRequest<MemorialProfile>({
    path: `/api/memorial-profiles/${id}`,
    method: 'DELETE',
  })
}

export function fetchMemorialEvents(profileId: string) {
  return apiRequest<MemorialEvent[]>({
    path: `/api/memorial-profiles/${profileId}/events`,
  })
}

export function createMemorialEvent(profileId: string, payload: Partial<MemorialEvent>) {
  return apiRequest<MemorialEvent, Partial<MemorialEvent>>({
    path: `/api/memorial-profiles/${profileId}/events`,
    method: 'POST',
    data: payload,
  })
}

export function updateMemorialEvent(id: string, payload: Partial<MemorialEvent>) {
  return apiRequest<MemorialEvent, Partial<MemorialEvent>>({
    path: `/api/memorial-events/${id}`,
    method: 'PATCH',
    data: payload,
  })
}

export function deleteMemorialEvent(id: string) {
  return apiRequest<{ deleted: boolean }>({
    path: `/api/memorial-events/${id}`,
    method: 'DELETE',
  })
}
