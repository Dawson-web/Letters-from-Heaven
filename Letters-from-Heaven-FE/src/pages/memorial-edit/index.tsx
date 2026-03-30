import { Input, Picker, Text, View } from '@tarojs/components';
import Taro, { useDidShow, useRouter } from '@tarojs/taro';
import { useEffect, useMemo, useState } from 'react';
import { observer } from 'mobx-react-lite';

import { ArcoButton } from '@/components/arco/button';
import { ArcoCard } from '@/components/arco/card';
import { FormField } from '@/components/arco/form-field';
import { ArcoNotice } from '@/components/arco/notice';
import { SectionHeading } from '@/components/arco/section-heading';
import { ArcoTag } from '@/components/arco/tag';
import { PageShell } from '@/components/layout/page-shell';
import { RELATION_OPTIONS } from '@/constants/relations';
import { getErrorMessage } from '@/services/request';
import { useRootStore } from '@/stores/root-store';
import type { MemorialEvent, MemorialEventType } from '@/types/memorial';
import { formatDateTime } from '@/utils/time';

const EVENT_TYPES: { type: MemorialEventType; label: string }[] = [
  { type: 'qingming', label: '清明' },
  { type: 'birthday', label: '生日' },
  { type: 'anniversary', label: '周年' },
  { type: 'custom', label: '自定义' },
];

const WINDOW_VALUES = Array.from({ length: 29 }, (_, index) => index - 14);
const WINDOW_PRESETS = [
  { label: '只在当天', start: 0, end: 0 },
  { label: '前后 1 天', start: -1, end: 1 },
  { label: '前后 3 天', start: -3, end: 3 },
];

const DEFAULT_EVENT = {
  type: 'qingming' as MemorialEventType,
  month: 4,
  day: 4,
  label: '',
  windowStartDays: -1,
  windowEndDays: 1,
  deliverAtHour: 9,
  deliverAtMinute: 0,
  enabled: true,
};

function pad(value: number) {
  return value.toString().padStart(2, '0');
}

function getCurrentYear() {
  return new Date().getFullYear();
}

function formatMonthDay(month: number, day: number) {
  return `${pad(month)} 月 ${pad(day)} 日`;
}

function formatTimeValue(hour: number, minute: number) {
  return `${pad(hour)}:${pad(minute)}`;
}

function buildDatePickerValue(month: number, day: number) {
  return `${getCurrentYear()}-${pad(month)}-${pad(day)}`;
}

function parseDatePickerValue(value: string) {
  const [, rawMonth, rawDay] = value.split('-');

  return {
    month: Number(rawMonth || 1),
    day: Number(rawDay || 1),
  };
}

function buildTimePickerValue(hour: number, minute: number) {
  return `${pad(hour)}:${pad(minute)}`;
}

function parseTimePickerValue(value: string) {
  const [rawHour, rawMinute] = value.split(':');

  return {
    hour: Number(rawHour || 0),
    minute: Number(rawMinute || 0),
  };
}

function formatWindowOffsetLabel(value: number) {
  if (value === 0) {
    return '当天';
  }

  if (value < 0) {
    return `提前 ${Math.abs(value)} 天`;
  }

  return `延后 ${value} 天`;
}

function formatWindowRange(start: number, end: number) {
  if (start === end) {
    return formatWindowOffsetLabel(start);
  }

  return `${formatWindowOffsetLabel(start)} 到 ${formatWindowOffsetLabel(end)}`;
}

function getEventTypeLabel(event: Pick<MemorialEvent, 'type' | 'label'>) {
  switch (event.type) {
    case 'qingming':
      return '清明';
    case 'birthday':
      return '生日';
    case 'anniversary':
      return '周年';
    default:
      return event.label || '自定义';
  }
}

function buildDefaultTestMoment() {
  const now = new Date(Date.now() + 2 * 60 * 60 * 1000);
  now.setMinutes(Math.ceil(now.getMinutes() / 5) * 5, 0, 0);

  return {
    date: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`,
    time: `${pad(now.getHours())}:${pad(now.getMinutes())}`,
  };
}

function buildSendAtMs(dateValue: string, timeValue: string) {
  const [year, month, day] = dateValue.split('-').map(Number);
  const [hour, minute] = timeValue.split(':').map(Number);

  return new Date(year, month - 1, day, hour, minute, 0, 0).getTime();
}

const MemorialEditPage = observer(() => {
  const { params } = useRouter();
  const { mailboxStore, memorialStore } = useRootStore();
  const profileId = params.id;
  const profile = memorialStore.profiles.find((item) => item.id === profileId);
  const defaultTestMoment = useMemo(() => buildDefaultTestMoment(), []);

  const [relation, setRelation] = useState(profile?.relation || '');
  const [displayName, setDisplayName] = useState(profile?.displayName || '');
  const [keywords, setKeywords] = useState(profile?.keywords || '');
  const [note, setNote] = useState(profile?.note || '');
  const [timezone, setTimezone] = useState(profile?.timezone || 'Asia/Shanghai');
  const [saving, setSaving] = useState(false);

  const [editingEventId, setEditingEventId] = useState('');
  const [eventForm, setEventForm] = useState(DEFAULT_EVENT);
  const [selectedTestEventId, setSelectedTestEventId] = useState('');
  const [testDate, setTestDate] = useState(defaultTestMoment.date);
  const [testTime, setTestTime] = useState(defaultTestMoment.time);
  const [testingDelivery, setTestingDelivery] = useState(false);
  const rawEvents = profileId ? memorialStore.eventsByProfile[profileId] : undefined;

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

  const events = useMemo(() => rawEvents || [], [rawEvents]);
  const canSave = useMemo(() => Boolean(relation), [relation]);
  const selectedTestEvent = events.find((item) => item.id === selectedTestEventId);
  const windowOptionLabels = useMemo(
    () => WINDOW_VALUES.map((value) => formatWindowOffsetLabel(value)),
    []
  );
  const windowStartIndex = Math.max(WINDOW_VALUES.indexOf(eventForm.windowStartDays), 0);
  const windowEndIndex = Math.max(WINDOW_VALUES.indexOf(eventForm.windowEndDays), 0);
  const activeWindowPreset = WINDOW_PRESETS.find(
    (preset) =>
      preset.start === eventForm.windowStartDays && preset.end === eventForm.windowEndDays
  );

  useEffect(() => {
    if (editingEventId) {
      setSelectedTestEventId(editingEventId);
      return;
    }

    if (!events.length) {
      setSelectedTestEventId('');
      return;
    }

    if (!events.some((item) => item.id === selectedTestEventId)) {
      setSelectedTestEventId(events[0].id);
    }
  }, [editingEventId, events, selectedTestEventId]);

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
        deliverAtMinute: Number(eventForm.deliverAtMinute),
        enabled: Boolean(eventForm.enabled),
      };

      if (editingEventId) {
        await memorialStore.updateEvent(editingEventId, payload);
        Taro.showToast({ title: '这个纪念日已经更新好了', icon: 'none' });
      } else {
        const created = await memorialStore.createEvent(profileId, payload);
        setSelectedTestEventId(created.id);
        Taro.showToast({ title: '这个纪念日已经放进时间线了', icon: 'none' });
      }

      resetEventForm();
    } catch (error) {
      Taro.showToast({ title: getErrorMessage(error), icon: 'none' });
    }
  };

  const handleEditEvent = (event: MemorialEvent) => {
    setEditingEventId(event.id);
    setSelectedTestEventId(event.id);
    setEventForm({
      type: event.type,
      month: event.month,
      day: event.day,
      label: event.label,
      windowStartDays: event.windowStartDays,
      windowEndDays: event.windowEndDays,
      deliverAtHour: event.deliverAtHour,
      deliverAtMinute: event.deliverAtMinute,
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
      if (selectedTestEventId === eventId) {
        setSelectedTestEventId('');
      }
      if (editingEventId === eventId) {
        resetEventForm();
      }
      Taro.showToast({ title: '这个纪念日已经删除', icon: 'none' });
    } catch (error) {
      Taro.showToast({ title: getErrorMessage(error), icon: 'none' });
    }
  };

  const handleScheduleTestDelivery = async () => {
    if (!profileId || !selectedTestEventId || testingDelivery) {
      return;
    }

    const sendAtMs = buildSendAtMs(testDate, testTime);
    if (sendAtMs < Date.now() + 60 * 1000) {
      Taro.showToast({ title: '测试送达至少要比现在晚 1 分钟', icon: 'none' });
      return;
    }

    setTestingDelivery(true);

    try {
      const reply = await memorialStore.testEventDelivery(profileId, selectedTestEventId, sendAtMs);
      mailboxStore.upsertReply(reply);
      mailboxStore.persist();
      Taro.showToast({ title: '测试回响已经排进收件箱', icon: 'none' });
      Taro.navigateTo({ url: `/pages/sent/index?id=${reply.id}` });
    } catch (error) {
      Taro.showToast({ title: getErrorMessage(error), icon: 'none' });
    } finally {
      setTestingDelivery(false);
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
          description='现在可以直接点选日期、时间和窗口，不必再手填零散数字。'
        />

        {events.length === 0 ? (
          <Text className='mt-5 block text-body text-driftwood'>还没把任何纪念日放进来。</Text>
        ) : (
          <View className='mt-5 flex flex-col gap-4'>
            {events.map((event) => (
              <ArcoCard key={event.id} tone='default' padding='md' className='memorial-event-card'>
                <View className='flex items-start justify-between gap-4'>
                  <View className='flex-1'>
                    <Text className='text-body font-semibold text-charcoal'>
                      {getEventTypeLabel(event)}
                    </Text>
                    <Text className='mt-2 block text-caption text-driftwood'>
                      {formatMonthDay(event.month, event.day)} · {formatTimeValue(event.deliverAtHour, event.deliverAtMinute)} · {formatWindowRange(event.windowStartDays, event.windowEndDays)}
                    </Text>
                    <Text className='mt-2 block text-caption text-fog'>
                      {event.enabled
                        ? `下一次窗口会从 ${formatDateTime(event.nextTriggerAtMs)} 开始`
                        : '当前已经停用，不会自动送达'}
                    </Text>
                  </View>
                  <View className='meta-chip'>{event.enabled ? '正在启用' : '暂时停用'}</View>
                </View>

                <View className='mt-4 flex flex-wrap gap-3'>
                  <ArcoButton variant='text' onClick={() => handleEditEvent(event)}>
                    调整这个纪念日
                  </ArcoButton>
                  <ArcoButton variant='text' onClick={() => setSelectedTestEventId(event.id)}>
                    用它测试送达
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
          description='先选类型，再点日期和时间。清明会默认锁在 4 月 4 日。'
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

        <View className='memorial-event-spotlight'>
          <Text className='memorial-event-spotlight-kicker'>当前设定</Text>
          <Text className='memorial-event-spotlight-title'>
            {formatMonthDay(eventForm.month, eventForm.day)} · {formatTimeValue(eventForm.deliverAtHour, eventForm.deliverAtMinute)}
          </Text>
          <Text className='memorial-event-spotlight-copy'>
            {getEventTypeLabel({ type: eventForm.type, label: eventForm.label })} · {formatWindowRange(eventForm.windowStartDays, eventForm.windowEndDays)}
          </Text>
        </View>

        <View className='mt-6 flex flex-col gap-6'>
          <FormField
            label='日期与标签'
            hint='日期可以直接点选，不需要再手填月份和日期。如果是自定义纪念日，也可以补一个名字。'
          >
            <View className='field-row field-row--double'>
              <Picker
                mode='date'
                end={`${getCurrentYear()}-12-31`}
                fields='day'
                start={`${getCurrentYear()}-01-01`}
                value={buildDatePickerValue(eventForm.month, eventForm.day)}
                disabled={eventForm.type === 'qingming'}
                onChange={(event) => {
                  const next = parseDatePickerValue(event.detail.value);
                  setEventForm((prev) => ({
                    ...prev,
                    month: next.month,
                    day: next.day,
                  }));
                }}
              >
                <View className={`picker-field ${eventForm.type === 'qingming' ? 'picker-field--disabled' : ''}`}>
                  <Text className='picker-field-label'>日期</Text>
                  <Text className='picker-field-value'>{formatMonthDay(eventForm.month, eventForm.day)}</Text>
                  <Text className='picker-field-note'>
                    {eventForm.type === 'qingming' ? '清明默认固定日期' : '点这里重新选择'}
                  </Text>
                </View>
              </Picker>

              <View className='picker-field picker-field--static'>
                <Text className='picker-field-label'>纪念日名字</Text>
                <Input
                  className='picker-field-input'
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
            </View>
          </FormField>

          <FormField
            label='送达时刻'
            hint='可以精确到分钟。比如你想让它在 3 月 30 日 21:03 到来，就直接点出来。'
          >
            <Picker
              mode='time'
              value={buildTimePickerValue(eventForm.deliverAtHour, eventForm.deliverAtMinute)}
              onChange={(event) => {
                const next = parseTimePickerValue(event.detail.value);
                setEventForm((prev) => ({
                  ...prev,
                  deliverAtHour: next.hour,
                  deliverAtMinute: next.minute,
                }));
              }}
            >
              <View className='picker-field'>
                <Text className='picker-field-label'>送达时间</Text>
                <Text className='picker-field-value'>{formatTimeValue(eventForm.deliverAtHour, eventForm.deliverAtMinute)}</Text>
                <Text className='picker-field-note'>点这里调整到具体分钟</Text>
              </View>
            </Picker>
          </FormField>

          <FormField
            label='送达窗口'
            hint='常用范围可以一键套用；如果想更细一点，也可以继续单独调整开始和结束。'
          >
            <View className='window-preset-row'>
              {WINDOW_PRESETS.map((preset) => (
                <ArcoTag
                  key={preset.label}
                  active={activeWindowPreset?.label === preset.label}
                  onClick={() =>
                    setEventForm((prev) => ({
                      ...prev,
                      windowStartDays: preset.start,
                      windowEndDays: preset.end,
                    }))
                  }
                >
                  {preset.label}
                </ArcoTag>
              ))}
            </View>

            <View className='field-row field-row--double mt-4'>
              <Picker
                mode='selector'
                range={windowOptionLabels}
                value={windowStartIndex}
                onChange={(event) =>
                  setEventForm((prev) => ({
                    ...prev,
                    windowStartDays: WINDOW_VALUES[Number(event.detail.value)] ?? prev.windowStartDays,
                  }))
                }
              >
                <View className='picker-field'>
                  <Text className='picker-field-label'>窗口开始</Text>
                  <Text className='picker-field-value'>{formatWindowOffsetLabel(eventForm.windowStartDays)}</Text>
                  <Text className='picker-field-note'>点这里改开始位置</Text>
                </View>
              </Picker>

              <Picker
                mode='selector'
                range={windowOptionLabels}
                value={windowEndIndex}
                onChange={(event) =>
                  setEventForm((prev) => ({
                    ...prev,
                    windowEndDays: WINDOW_VALUES[Number(event.detail.value)] ?? prev.windowEndDays,
                  }))
                }
              >
                <View className='picker-field'>
                  <Text className='picker-field-label'>窗口结束</Text>
                  <Text className='picker-field-value'>{formatWindowOffsetLabel(eventForm.windowEndDays)}</Text>
                  <Text className='picker-field-note'>点这里改结束位置</Text>
                </View>
              </Picker>
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

      <ArcoCard tone='default' padding='lg' delay={5}>
        <SectionHeading
          eyebrow='测试送达'
          title='挑一个具体时刻，先排一封测试回响'
          description='这不会改掉周年规则，只会额外投一封测试回响到收件箱，方便你验证时间和展示。'
        />

        {!profileId ? (
          <Text className='mt-5 block text-body text-driftwood'>先把这份档案存好，才能安排测试送达。</Text>
        ) : events.length === 0 ? (
          <Text className='mt-5 block text-body text-driftwood'>先存好至少一个纪念日，再挑它来测试。</Text>
        ) : (
          <View className='mt-5 flex flex-col gap-6'>
            <View>
              <Text className='picker-group-label'>先选要测试的纪念日</Text>
              <View className='mt-3 flex flex-wrap gap-2'>
                {events.map((event) => (
                  <ArcoTag
                    key={event.id}
                    active={selectedTestEventId === event.id}
                    onClick={() => setSelectedTestEventId(event.id)}
                  >
                    {getEventTypeLabel(event)}
                  </ArcoTag>
                ))}
              </View>
            </View>

            {selectedTestEvent ? (
              <View className='memorial-test-summary'>
                <Text className='memorial-test-summary-title'>当前测试对象</Text>
                <Text className='memorial-test-summary-copy'>
                  {getEventTypeLabel(selectedTestEvent)} · 常规规则是 {formatMonthDay(selectedTestEvent.month, selectedTestEvent.day)} {formatTimeValue(selectedTestEvent.deliverAtHour, selectedTestEvent.deliverAtMinute)}
                </Text>
              </View>
            ) : null}

            <View className='field-row field-row--double'>
              <Picker
                mode='date'
                fields='day'
                value={testDate}
                start={`${getCurrentYear()}-01-01`}
                end={`${getCurrentYear() + 1}-12-31`}
                onChange={(event) => setTestDate(event.detail.value)}
              >
                <View className='picker-field'>
                  <Text className='picker-field-label'>测试日期</Text>
                  <Text className='picker-field-value'>{testDate.split('-').join('.')}</Text>
                  <Text className='picker-field-note'>点这里改成你要验证的那一天</Text>
                </View>
              </Picker>

              <Picker
                mode='time'
                value={testTime}
                onChange={(event) => setTestTime(event.detail.value)}
              >
                <View className='picker-field'>
                  <Text className='picker-field-label'>测试时间</Text>
                  <Text className='picker-field-value'>{testTime}</Text>
                  <Text className='picker-field-note'>点这里改到具体分钟</Text>
                </View>
              </Picker>
            </View>

            <ArcoNotice
              title='测试按钮会做什么'
              description='它会按你选的精确时刻创建一封等待中的纪念回响。你可以立刻去收件箱检查等待态和送达后的展示。'
            />

            <View className='sticky-cta-stack'>
              <ArcoButton
                className='w-full'
                loading={testingDelivery}
                disabled={!selectedTestEventId}
                onClick={handleScheduleTestDelivery}
              >
                按这个时刻投进收件箱
              </ArcoButton>
            </View>
          </View>
        )}
      </ArcoCard>
    </PageShell>
  );
});

export default MemorialEditPage;
