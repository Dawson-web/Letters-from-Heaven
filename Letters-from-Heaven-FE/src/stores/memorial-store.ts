import { makeAutoObservable, runInAction } from 'mobx'

import {
  createMemorialEvent,
  createMemorialProfile,
  deleteMemorialEvent,
  deleteMemorialProfile,
  fetchMemorialEvents,
  fetchMemorialProfiles,
  updateMemorialEvent,
  updateMemorialProfile,
} from '@/services/memorial'
import { getErrorMessage } from '@/services/request'
import type { MemorialEvent, MemorialProfile } from '@/types/memorial'

export class MemorialStore {
  profiles: MemorialProfile[] = []
  eventsByProfile: Record<string, MemorialEvent[]> = {}
  syncing = false
  lastError = ''

  constructor() {
    makeAutoObservable(this, {}, { autoBind: true })
  }

  getEvent(eventId?: string | null) {
    if (!eventId) {
      return undefined
    }

    for (const events of Object.values(this.eventsByProfile)) {
      const event = events.find((item) => item.id === eventId)
      if (event) {
        return event
      }
    }

    return undefined
  }

  async refreshProfiles() {
    if (this.syncing) {
      return
    }

    this.syncing = true

    try {
      const profiles = await fetchMemorialProfiles()
      runInAction(() => {
        this.profiles = profiles
        this.lastError = ''
      })
    } catch (error) {
      runInAction(() => {
        this.lastError = getErrorMessage(error)
      })
    } finally {
      runInAction(() => {
        this.syncing = false
      })
    }
  }

  async refreshEvents(profileId: string) {
    try {
      const events = await fetchMemorialEvents(profileId)
      runInAction(() => {
        this.eventsByProfile[profileId] = events
      })
    } catch (error) {
      runInAction(() => {
        this.lastError = getErrorMessage(error)
      })
    }
  }

  async refreshOverview() {
    await this.refreshProfiles()
    await Promise.all(this.profiles.map((profile) => this.refreshEvents(profile.id)))
  }

  async createProfile(payload: Partial<MemorialProfile>) {
    const profile = await createMemorialProfile(payload)
    runInAction(() => {
      this.profiles = [profile, ...this.profiles]
    })
    return profile
  }

  async updateProfile(id: string, payload: Partial<MemorialProfile>) {
    const profile = await updateMemorialProfile(id, payload)
    runInAction(() => {
      this.profiles = this.profiles.map((item) => (item.id === id ? profile : item))
    })
    return profile
  }

  async deleteProfile(id: string) {
    await deleteMemorialProfile(id)
    runInAction(() => {
      this.profiles = this.profiles.filter((item) => item.id !== id)
      delete this.eventsByProfile[id]
    })
  }

  async createEvent(profileId: string, payload: Partial<MemorialEvent>) {
    const event = await createMemorialEvent(profileId, payload)
    runInAction(() => {
      const next = this.eventsByProfile[profileId] || []
      this.eventsByProfile[profileId] = [...next, event]
    })
    return event
  }

  async updateEvent(id: string, payload: Partial<MemorialEvent>) {
    const event = await updateMemorialEvent(id, payload)
    runInAction(() => {
      const list = this.eventsByProfile[event.profileId] || []
      this.eventsByProfile[event.profileId] = list.map((item) =>
        item.id === id ? event : item
      )
    })
    return event
  }

  async deleteEvent(eventId: string) {
    const event = this.getEvent(eventId)
    await deleteMemorialEvent(eventId)
    if (!event) {
      return
    }

    runInAction(() => {
      const list = this.eventsByProfile[event.profileId] || []
      this.eventsByProfile[event.profileId] = list.filter((item) => item.id !== eventId)
    })
  }
}
