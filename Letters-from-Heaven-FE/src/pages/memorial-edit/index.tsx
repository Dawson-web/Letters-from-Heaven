import { Input, Text, View } from '@tarojs/components';
import Taro, { useDidShow, useRouter } from '@tarojs/taro';
import { useEffect, useMemo, useState } from 'react';
import { observer } from 'mobx-react-lite';

import { ArcoButton } from '@/components/arco/button';
import { ArcoCard } from '@/components/arco/card';
import { FormField } from '@/components/arco/form-field';
import { ArcoNotice } from '@/components/arco/notice';
import { SectionHeading } from '@/components/arco/section-heading';
import { ArcoTag } from '@/components/arco/tag';
import { RELATION_OPTIONS } from '@/constants/relations';
import { PageShell } from '@/components/layout/page-shell';
import { getErrorMessage } from '@/services/request';
import { useRootStore } from '@/stores/root-store';
import type { MemorialEvent, MemorialEventType } from '@/types/memorial';

const EVENT_TYPES: { type: MemorialEventType; label: string }[] = [
  { type: 'qingming', label: '清明' },
  { type: 'birthday', label: '生日' },
  { type: 'anniversary', label: '周年' },
  { type: 'custom', label: '自定义' },
];

const DEFAULT_EVENT = {
  type: 'qingming' as MemorialEventType,
  month: 4,
  day: 4,
  label: '',
  windowStartDays: -1,
  windowEndDays: 1,
  deliverAtHour: 9,
  enabled: true,
};

const MemorialEditPage = observer(() => {
  const { params } = useRouter();
  const { memorialStore } = useRootStore();
  const profileId = params.id;
  const profile = memorialStore.profiles.find((item) => item.id === profileId);

  const [relation, setRelation] = useState(profile?.relation || '');
  const [displayName, setDisplayName] = useState(profile?.displayName || '');
  const [keywords, setKeywords] = useState(profile?.keywords || '');
  const [note, setNote] = useState(profile?.note || '');
  const [timezone, setTimezone] = useState(profile?.timezone || 'Asia/Shanghai');
  const [saving, setSaving] = useState(false);

  const [editingEventId, setEditingEventId] = useState('');
  const [eventForm, setEventForm] = useState(DEFAULT_EVENT);

  useDidShow(() => {
    void memorialStore.refreshProfiles();
    if (profileId) {
      void memorialStore.refreshEvents(profileId);
    }
  });

  useEffect(() => {
    if (!profile) {
      return;
    }

    setRelation(profile.relation);
    setDisplayName(profile.displayName);
    setKeywords(profile.keywords);
    setNote(profile.note || '');
    setTimezone(profile.timezone);
  }, [profile]);

  const events = profileId ? memorialStore.eventsByProfile[profileId] || [] : [];
  const canSave = useMemo(() => Boolean(relation), [relation]);

  const resetEventForm = () => {
    setEditingEventId('');
    setEventForm(DEFAULT_EVENT);
  };

  const handleSaveProfile = async () => {
    if (!canSave || saving) {
      return;
    }

    setSaving(true);

    try {
      const payload = {
        relation,
        displayName: displayName.trim(),
        keywords: keywords.trim(),
        note: note.trim(),
        timezone: timezone.trim() || 'Asia/Shanghai',
      };

      if (profileId) {
        await memorialStore.updateProfile(profileId, payload);
        Taro.showToast({ title: '这份档案已经存好了', icon: 'none' });
      } else {
        const created = await memorialStore.createProfile(payload);
        Taro.showToast({ title: '这份档案已经收好了', icon: 'none' });
        Taro.redirectTo({ url: `/pages/memorial-edit/index?id=${created.id}` });
      }
    } catch (error) {
      Taro.showToast({ title: getErrorMessage(error), icon: 'none' });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteProfile = async () => {
    if (!profileId) {
      return;
    }

    const result = await Taro.showModal({
      title: '要删除这份纪念档案吗',
      content: '删除后不能恢复，但已经收到的回响不会受影响。',
    });

    if (!result.confirm) {
      return;
    }

    try {
      await memorialStore.deleteProfile(profileId);
      Taro.showToast({ title: '这份档案已经删除', icon: 'none' });
      Taro.redirectTo({ url: '/pages/memorial/index' });
    } catch (error) {
      Taro.showToast({ title: getErrorMessage(error), icon: 'none' });
    }
  };

  const handleSaveEvent = async () => {
    if (!profileId) {
      Taro.showToast({ title: '先把这份档案存下来，再继续添加纪念日', icon: 'none' });
      return;
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
      };

      if (editingEventId) {
        await memorialStore.updateEvent(editingEventId, payload);
        Taro.showToast({ title: '这个纪念日已经更新好了', icon: 'none' });
      } else {
        await memorialStore.createEvent(profileId, payload);
        Taro.showToast({ title: '这个纪念日已经放进时间线了', icon: 'none' });
      }

      resetEventForm();
    } catch (error) {
      Taro.showToast({ title: getErrorMessage(error), icon: 'none' });
    }
  };

  const handleEditEvent = (event: MemorialEvent) => {
    setEditingEventId(event.id);
    setEventForm({
      type: event.type,
      month: event.month,
      day: event.day,
      label: event.label,
      windowStartDays: event.windowStartDays,
      windowEndDays: event.windowEndDays,
      deliverAtHour: event.deliverAtHour,
      enabled: event.enabled,
    });
  };

  const handleDeleteEvent = async (eventId: string) => {
    const result = await Taro.showModal({
      title: '要删除这个纪念日吗',
      content: '删除后不能恢复。',
    });

    if (!result.confirm) {
      return;
    }

    try {
      await memorialStore.deleteEvent(eventId);
      Taro.showToast({ title: '这个纪念日已经删除', icon: 'none' });
    } catch (error) {
      Taro.showToast({ title: getErrorMessage(error), icon: 'none' });
    }
  };

  return (
    <PageShell
      eyebrow='纪念档案'
      title={profileId ? '把这份记忆再整理一下' : '为想念留一份新的档案'}
      subtitle='你不需要一次写得很完整，只要把最想留下的线索轻轻放进来。'
      footer={(
        <View className='sticky-cta-stack'>
          <ArcoButton className='w-full' size='lg' disabled={!canSave} loading={saving} onClick={handleSaveProfile}>
            {profileId ? '先把这份档案存好' : '把这份档案存好'}
          </ArcoButton>
          {profileId ? (
            <ArcoButton variant='text' onClick={handleDeleteProfile}>
              删除这份档案
            </ArcoButton>
          ) : null}
        </View>
      )}
    >
      <ArcoCard tone='emphasis' padding='lg' delay={1}>
        <SectionHeading
          eyebrow='关联关系'
          title='先想一想，你最自然会怎样称呼他或她'
          description='这个称呼会帮助之后的回响更贴近你心里真正的关系。'
        />
        <View className='mt-5 flex flex-wrap gap-2'>
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

      <ArcoCard tone='default' padding='lg' delay={2}>
        <SectionHeading
          eyebrow='纪念对象'
          title='先用几条最舍不得忘记的线索，把这个人留住'
          description='不用写得齐全，留下你最熟悉的称呼、习惯和片段就够了。'
        />

        <View className='mt-6 flex flex-col gap-6'>
          <FormField
            label='你会怎么叫他或她'
            hint='可选。写下你心里最自然的称呼，回响也会更贴近这份亲近。'
          >
            <Input
              className='field-control'
              placeholder='例如：妈妈、外婆、阿成'
              placeholderStyle='color: #B5AB9C'
              value={displayName}
              maxlength={32}
              onInput={(event) => setDisplayName(event.detail.value)}
            />
          </FormField>

          <FormField
            label='记忆线索'
            hint='写下 2 到 5 个你一看到就会想起他或她的词。'
          >
            <Input
              className='field-control'
              placeholder='比如：秋天、厨房、港口'
              placeholderStyle='color: #B5AB9C'
              value={keywords}
              maxlength={128}
              onInput={(event) => setKeywords(event.detail.value)}
            />
          </FormField>

          <FormField
            label='还想补充些什么'
            hint='可选。可以写一句口头禅、一段小事，或一种你忘不掉的语气。'
          >
            <Input
              className='field-control'
              placeholder='还想留下的一点记忆'
              placeholderStyle='color: #B5AB9C'
              value={note}
              maxlength={400}
              onInput={(event) => setNote(event.detail.value)}
            />
          </FormField>

          <FormField
            label='时区'
            hint='回响会按这个时区的时间慢慢抵达，默认是 Asia/Shanghai。'
          >
            <Input
              className='field-control'
              placeholder='Asia/Shanghai'
              placeholderStyle='color: #B5AB9C'
              value={timezone}
              maxlength={64}
              onInput={(event) => setTimezone(event.detail.value)}
            />
          </FormField>
        </View>
      </ArcoCard>

      <ArcoNotice
        tone='warning'
        title='也请记得这条边界'
        description='纪念回响由系统生成，用来陪你安放思念，不代表逝者真实态度，也不能替代真实的人。'
      />

      <ArcoCard tone='muted' padding='lg' delay={3}>
        <SectionHeading
          eyebrow='纪念日设置'
          title='把想见的日子，轻轻放进时间里'
          description='每个纪念日每年只会来一次回响，你可以决定它在前后几天、什么时刻来到。'
        />

        {events.length === 0 ? (
          <Text className='mt-5 block text-body text-driftwood'>还没把任何纪念日放进来。</Text>
        ) : (
          <View className='mt-5 flex flex-col gap-4'>
            {events.map((event) => (
              <ArcoCard key={event.id} tone='default' padding='md'>
                <View className='flex items-start justify-between gap-4'>
                  <View className='flex-1'>
                    <Text className='text-body font-semibold text-charcoal'>
                      {event.type === 'qingming'
                        ? '清明'
                        : event.type === 'birthday'
                        ? '生日'
                        : event.type === 'anniversary'
                        ? '周年'
                        : event.label || '自定义'}
                    </Text>
                    <Text className='mt-2 block text-caption text-driftwood'>
                      {event.month}月{event.day}日 · 前后窗口 {event.windowStartDays} ~ {event.windowEndDays} 天 · {event.deliverAtHour} 点送达
                    </Text>
                  </View>
                  <View className='meta-chip'>{event.enabled ? '正在启用' : '暂时停用'}</View>
                </View>

                <View className='mt-4 flex flex-wrap gap-3'>
                  <ArcoButton variant='text' onClick={() => handleEditEvent(event)}>
                    调整这个纪念日
                  </ArcoButton>
                  <ArcoButton variant='text' className='text-terracotta' onClick={() => handleDeleteEvent(event.id)}>
                    删除这个纪念日
                  </ArcoButton>
                </View>
              </ArcoCard>
            ))}
          </View>
        )}
      </ArcoCard>

      <ArcoCard tone='emphasis' padding='lg' delay={4}>
        <SectionHeading
          eyebrow={editingEventId ? '调整纪念日' : '添加纪念日'}
          title={editingEventId ? '把这一天调到更适合你的节奏' : '为这份想念添一个会再回来的一天'}
          description='先选类型，再慢慢设定日期和触发窗口。清明会默认落在 4 月 4 日。'
        />

        <View className='mt-5 flex flex-wrap gap-2'>
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
                }))
              }
            >
              {item.label}
            </ArcoTag>
          ))}
        </View>

        <View className='mt-6 flex flex-col gap-6'>
          <FormField
            label='日期与标签'
            hint='如果是自定义纪念日，可以写下这个日子在你心里的名字。'
          >
            <View className='field-row field-row--triple'>
              <Input
                className='field-control'
                placeholder='月份'
                placeholderStyle='color: #B5AB9C'
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
                className='field-control'
                placeholder='日期'
                placeholderStyle='color: #B5AB9C'
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
                className='field-control'
                placeholder='这个日子的名字（可选）'
                placeholderStyle='color: #B5AB9C'
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
          </FormField>

          <FormField
            label='触发窗口'
            hint='例如开始 -1、结束 1，代表它会在前后 1 天里挑一个更合适的时刻来到。'
          >
            <View className='field-row field-row--triple'>
              <Input
                className='field-control'
                placeholder='开始前几天'
                placeholderStyle='color: #B5AB9C'
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
                className='field-control'
                placeholder='结束后几天'
                placeholderStyle='color: #B5AB9C'
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
                className='field-control'
                placeholder='送达小时'
                placeholderStyle='color: #B5AB9C'
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
          </FormField>
        </View>

        <View className='mt-6 flex flex-wrap gap-3'>
          <ArcoButton
            variant='outline'
            onClick={() =>
              setEventForm((prev) => ({
                ...prev,
                enabled: !prev.enabled,
              }))
            }
          >
            {eventForm.enabled ? '当前：会送达' : '当前：暂不送达'}
          </ArcoButton>
          <ArcoButton variant='text' onClick={resetEventForm}>
            先不改这个了
          </ArcoButton>
        </View>

        <View className='mt-6'>
          <ArcoButton onClick={handleSaveEvent}>
            {editingEventId ? '存好这个纪念日' : '把这个纪念日放进来'}
          </ArcoButton>
        </View>
      </ArcoCard>
    </PageShell>
  );
});

export default MemorialEditPage;
