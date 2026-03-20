import { Input, Text, View } from '@tarojs/components'
import Taro, { useDidShow, useRouter } from '@tarojs/taro'
import { useEffect, useMemo, useState } from 'react'
import { observer } from 'mobx-react-lite'

import { AnimatedView } from '@/components/animation/animated-view'
import { ArcoButton } from '@/components/arco/button'
import { ArcoCard } from '@/components/arco/card'
import { ArcoNotice } from '@/components/arco/notice'
import { ArcoTag } from '@/components/arco/tag'
import { RELATION_OPTIONS } from '@/constants/relations'
import { PageShell } from '@/components/layout/page-shell'
import { getErrorMessage } from '@/services/request'
import { useRootStore } from '@/stores/root-store'
import type { MemorialEvent, MemorialEventType } from '@/types/memorial'

const EVENT_TYPES: { type: MemorialEventType; label: string }[] = [
  { type: 'qingming', label: '清明' },
  { type: 'birthday', label: '生日' },
  { type: 'anniversary', label: '周年' },
  { type: 'custom', label: '自定义' },
]

const DEFAULT_EVENT = {
  type: 'qingming' as MemorialEventType,
  month: 4,
  day: 4,
  label: '',
  windowStartDays: -1,
  windowEndDays: 1,
  deliverAtHour: 9,
  enabled: true,
}

const MemorialEditPage = observer(() => {
  const { params } = useRouter()
  const { memorialStore } = useRootStore()
  const profileId = params.id
  const profile = memorialStore.profiles.find((item) => item.id === profileId)

  const [relation, setRelation] = useState(profile?.relation || '')
  const [displayName, setDisplayName] = useState(profile?.displayName || '')
  const [keywords, setKeywords] = useState(profile?.keywords || '')
  const [note, setNote] = useState(profile?.note || '')
  const [timezone, setTimezone] = useState(profile?.timezone || 'Asia/Shanghai')
  const [saving, setSaving] = useState(false)

  const [editingEventId, setEditingEventId] = useState('')
  const [eventForm, setEventForm] = useState(DEFAULT_EVENT)

  useDidShow(() => {
    void memorialStore.refreshProfiles()
    if (profileId) {
      void memorialStore.refreshEvents(profileId)
    }
  })

  useEffect(() => {
    if (!profile) {
      return
    }

    setRelation(profile.relation)
    setDisplayName(profile.displayName)
    setKeywords(profile.keywords)
    setNote(profile.note || '')
    setTimezone(profile.timezone)
  }, [profile])

  const events = profileId ? memorialStore.eventsByProfile[profileId] || [] : []

  const canSave = useMemo(() => Boolean(relation), [relation])

  const resetEventForm = () => {
    setEditingEventId('')
    setEventForm(DEFAULT_EVENT)
  }

  const handleSaveProfile = async () => {
    if (!canSave || saving) {
      return
    }

    setSaving(true)

    try {
      const payload = {
        relation,
        displayName: displayName.trim(),
        keywords: keywords.trim(),
        note: note.trim(),
        timezone: timezone.trim() || 'Asia/Shanghai',
      }

      if (profileId) {
        await memorialStore.updateProfile(profileId, payload)
        Taro.showToast({ title: '已保存', icon: 'none' })
      } else {
        const created = await memorialStore.createProfile(payload)
        Taro.showToast({ title: '已创建', icon: 'none' })
        Taro.redirectTo({ url: `/pages/memorial-edit/index?id=${created.id}` })
      }
    } catch (error) {
      Taro.showToast({ title: getErrorMessage(error), icon: 'none' })
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteProfile = async () => {
    if (!profileId) {
      return
    }

    const result = await Taro.showModal({
      title: '删除纪念档案',
      content: '删除后无法恢复，但不会影响已有回响。',
    })

    if (!result.confirm) {
      return
    }

    try {
      await memorialStore.deleteProfile(profileId)
      Taro.showToast({ title: '已删除', icon: 'none' })
      Taro.redirectTo({ url: '/pages/memorial/index' })
    } catch (error) {
      Taro.showToast({ title: getErrorMessage(error), icon: 'none' })
    }
  }

  const handleSaveEvent = async () => {
    if (!profileId) {
      Taro.showToast({ title: '请先保存档案', icon: 'none' })
      return
    }

    try {
      const payload = {
        type: eventForm.type,
        month: eventForm.type === 'qingming' ? 4 : Number(eventForm.month),
        day: eventForm.type === 'qingming' ? 4 : Number(eventForm.day),
        label: eventForm.label.trim(),
        windowStartDays: Number(eventForm.windowStartDays),
        windowEndDays: Number(eventForm.windowEndDays),
        deliverAtHour: Number(eventForm.deliverAtHour),
        enabled: Boolean(eventForm.enabled),
      }

      if (editingEventId) {
        await memorialStore.updateEvent(editingEventId, payload)
        Taro.showToast({ title: '纪念日已更新', icon: 'none' })
      } else {
        await memorialStore.createEvent(profileId, payload)
        Taro.showToast({ title: '纪念日已添加', icon: 'none' })
      }

      resetEventForm()
    } catch (error) {
      Taro.showToast({ title: getErrorMessage(error), icon: 'none' })
    }
  }

  const handleEditEvent = (event: MemorialEvent) => {
    setEditingEventId(event.id)
    setEventForm({
      type: event.type,
      month: event.month,
      day: event.day,
      label: event.label,
      windowStartDays: event.windowStartDays,
      windowEndDays: event.windowEndDays,
      deliverAtHour: event.deliverAtHour,
      enabled: event.enabled,
    })
  }

  const handleDeleteEvent = async (eventId: string) => {
    const result = await Taro.showModal({
      title: '删除纪念日',
      content: '删除后无法恢复。',
    })

    if (!result.confirm) {
      return
    }

    try {
      await memorialStore.deleteEvent(eventId)
      Taro.showToast({ title: '已删除', icon: 'none' })
    } catch (error) {
      Taro.showToast({ title: getErrorMessage(error), icon: 'none' })
    }
  }

  return (
    <PageShell
      title='纪念档案'
      subtitle='档案越完整，回响越贴近记忆。'
    >
      <ArcoCard delay={1}>
        <Text className='text-body font-semibold text-charcoal'>关联关系</Text>
        <View className='mt-4 flex flex-wrap gap-2'>
          {RELATION_OPTIONS.map((item) => (
            <ArcoTag
              key={item}
              active={relation === item}
              onClick={() => setRelation(item)}
            >
              {item}
            </ArcoTag>
          ))}
        </View>
      </ArcoCard>

      <AnimatedView animation='fade-in-up' delay={2}>
        <ArcoCard>
          <Text className='text-body font-semibold text-charcoal'>纪念对象</Text>
          <Input
            className='mt-4 text-body text-charcoal'
            placeholder='称呼或名字（可选）'
            placeholderStyle='color: #C7C2BA'
            value={displayName}
            maxlength={32}
            onInput={(event) => setDisplayName(event.detail.value)}
          />
          <Input
            className='mt-4 text-body text-charcoal'
            placeholder='关键词（如：秋天、厨房、港口）'
            placeholderStyle='color: #C7C2BA'
            value={keywords}
            maxlength={128}
            onInput={(event) => setKeywords(event.detail.value)}
          />
          <Input
            className='mt-4 text-body text-charcoal'
            placeholder='备注或想补充的线索'
            placeholderStyle='color: #C7C2BA'
            value={note}
            maxlength={400}
            onInput={(event) => setNote(event.detail.value)}
          />
          <Input
            className='mt-4 text-body text-charcoal'
            placeholder='时区（默认 Asia/Shanghai）'
            placeholderStyle='color: #C7C2BA'
            value={timezone}
            maxlength={64}
            onInput={(event) => setTimezone(event.detail.value)}
          />
        </ArcoCard>
      </AnimatedView>

      <AnimatedView animation='fade-in-up' delay={3}>
        <ArcoNotice
          title='体验边界'
          description='纪念回响由系统生成，用于承接思念，不代表逝者真实态度。'
        />
      </AnimatedView>

      <AnimatedView animation='fade-in-up' delay={4}>
        <ArcoButton disabled={!canSave} loading={saving} onClick={handleSaveProfile}>
          {profileId ? '保存档案' : '创建档案'}
        </ArcoButton>
      </AnimatedView>

      {profileId ? (
        <AnimatedView animation='fade-in-up' delay={5}>
          <ArcoButton variant='text' className='text-terracotta' onClick={handleDeleteProfile}>
            删除档案
          </ArcoButton>
        </AnimatedView>
      ) : null}

      <View className='divider-fade my-6' />

      <AnimatedView animation='fade-in-up' delay={6}>
        <Text className='text-heading text-charcoal'>纪念日设置</Text>
        <Text className='mt-2 block text-caption text-driftwood'>
          每个纪念日每年只会触发一次回响。
        </Text>
      </AnimatedView>

      {events.length === 0 ? (
        <ArcoCard delay={7}>
          <Text className='text-body text-driftwood'>还没有设置纪念日</Text>
        </ArcoCard>
      ) : (
        events.map((event, index) => (
          <ArcoCard key={event.id} delay={Math.min(index + 7, 10)}>
            <View className='flex items-center justify-between gap-3'>
              <Text className='text-body font-semibold text-charcoal'>
                {event.type === 'qingming'
                  ? '清明'
                  : event.type === 'birthday'
                  ? '生日'
                  : event.type === 'anniversary'
                  ? '周年'
                  : event.label || '自定义'}
              </Text>
              <Text className='text-overline text-fog'>
                {event.month}月{event.day}日
              </Text>
            </View>
            <Text className='mt-2 block text-caption text-driftwood'>
              窗口：{event.windowStartDays} ~ {event.windowEndDays} 天 · {event.deliverAtHour}点
            </Text>
            <View className='mt-4 flex items-center gap-3'>
              <ArcoButton variant='text' onClick={() => handleEditEvent(event)}>
                编辑
              </ArcoButton>
              <ArcoButton variant='text' className='text-terracotta' onClick={() => handleDeleteEvent(event.id)}>
                删除
              </ArcoButton>
            </View>
          </ArcoCard>
        ))
      )}

      <AnimatedView animation='fade-in-up' delay={10}>
        <ArcoCard>
          <Text className='text-body font-semibold text-charcoal'>
            {editingEventId ? '编辑纪念日' : '新增纪念日'}
          </Text>
          <View className='mt-4 flex flex-wrap gap-2'>
            {EVENT_TYPES.map((item) => (
              <ArcoTag
                key={item.type}
                active={eventForm.type === item.type}
                onClick={() =>
                  setEventForm((prev) => ({
                    ...prev,
                    type: item.type,
                    month: item.type === 'qingming' ? 4 : prev.month,
                    day: item.type === 'qingming' ? 4 : prev.day,
                    label: item.type === 'custom' ? prev.label : prev.label,
                  }))
                }
              >
                {item.label}
              </ArcoTag>
            ))}
          </View>

          <View className='mt-4 flex items-center gap-3'>
            <Input
              className='text-body text-charcoal'
              placeholder='月'
              placeholderStyle='color: #C7C2BA'
              value={String(eventForm.month)}
              type='number'
              disabled={eventForm.type === 'qingming'}
              onInput={(event) =>
                setEventForm((prev) => ({
                  ...prev,
                  month: Number(event.detail.value || 1),
                }))
              }
            />
            <Input
              className='text-body text-charcoal'
              placeholder='日'
              placeholderStyle='color: #C7C2BA'
              value={String(eventForm.day)}
              type='number'
              disabled={eventForm.type === 'qingming'}
              onInput={(event) =>
                setEventForm((prev) => ({
                  ...prev,
                  day: Number(event.detail.value || 1),
                }))
              }
            />
            <Input
              className='text-body text-charcoal'
              placeholder='标签（可选）'
              placeholderStyle='color: #C7C2BA'
              value={eventForm.label}
              maxlength={32}
              onInput={(event) =>
                setEventForm((prev) => ({
                  ...prev,
                  label: event.detail.value,
                }))
              }
            />
          </View>

          <View className='mt-4 flex items-center gap-3'>
            <Input
              className='text-body text-charcoal'
              placeholder='开始天数'
              placeholderStyle='color: #C7C2BA'
              value={String(eventForm.windowStartDays)}
              type='number'
              onInput={(event) =>
                setEventForm((prev) => ({
                  ...prev,
                  windowStartDays: Number(event.detail.value || 0),
                }))
              }
            />
            <Input
              className='text-body text-charcoal'
              placeholder='结束天数'
              placeholderStyle='color: #C7C2BA'
              value={String(eventForm.windowEndDays)}
              type='number'
              onInput={(event) =>
                setEventForm((prev) => ({
                  ...prev,
                  windowEndDays: Number(event.detail.value || 0),
                }))
              }
            />
            <Input
              className='text-body text-charcoal'
              placeholder='送达时点'
              placeholderStyle='color: #C7C2BA'
              value={String(eventForm.deliverAtHour)}
              type='number'
              onInput={(event) =>
                setEventForm((prev) => ({
                  ...prev,
                  deliverAtHour: Number(event.detail.value || 0),
                }))
              }
            />
          </View>

          <View className='mt-4 flex items-center gap-3'>
            <ArcoButton
              variant='text'
              onClick={() =>
                setEventForm((prev) => ({
                  ...prev,
                  enabled: !prev.enabled,
                }))
              }
            >
              {eventForm.enabled ? '已启用' : '已停用'}
            </ArcoButton>
            <ArcoButton variant='text' onClick={resetEventForm}>
              取消编辑
            </ArcoButton>
          </View>

          <View className='mt-4'>
            <ArcoButton onClick={handleSaveEvent}>
              {editingEventId ? '保存纪念日' : '添加纪念日'}
            </ArcoButton>
          </View>
        </ArcoCard>
      </AnimatedView>
    </PageShell>
  )
})

export default MemorialEditPage
