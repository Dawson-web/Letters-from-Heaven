import { Input, Picker, Text, View } from '@tarojs/components';
import Taro, { useDidShow } from '@tarojs/taro';
import { useState } from 'react';
import { observer } from 'mobx-react-lite';

import { ArcoButton } from '@/components/arco/button';
import { ArcoCard } from '@/components/arco/card';
import { SectionHeading } from '@/components/arco/section-heading';
import { ArcoTag } from '@/components/arco/tag';
import { PageShell } from '@/components/layout/page-shell';
import { fetchPreferences, updatePreferences } from '@/services/preferences';
import { getErrorMessage } from '@/services/request';
import { useRootStore } from '@/stores/root-store';
import type { DeliveryPace, ReminderChannel, UserPreferences } from '@/types/preferences';

const DELIVERY_PACE_OPTIONS: Array<{ value: DeliveryPace; label: string; hint: string }> = [
  { value: 'fast', label: '快速', hint: '更早收到回响' },
  { value: 'balanced', label: '均衡', hint: '默认推荐节奏' },
  { value: 'slow', label: '慢速', hint: '让时间拉得更长' },
];

const REMINDER_CHANNEL_OPTIONS: Array<{ value: ReminderChannel; label: string; hint: string }> = [
  { value: 'none', label: '不提醒', hint: '只在小程序内查看' },
  { value: 'mini_program_subscribe', label: '小程序提醒', hint: '通过订阅消息提醒' },
  { value: 'official_account', label: '公众号提醒', hint: '通过公众号模板消息提醒' },
];

const DEFAULT_PREFERENCES: UserPreferences = {
  deliveryPace: 'balanced',
  quietStartMinute: null,
  quietEndMinute: null,
  reminderEnabled: false,
  reminderChannel: 'none',
  officialAccountOpenId: '',
  miniProgramTemplateId: '',
  officialAccountTemplateId: '',
  notifyLanguage: 'zh_CN',
};

function pad(value: number) {
  return value.toString().padStart(2, '0');
}

function minuteToTime(value: number | null) {
  if (value === null || value === undefined) {
    return '22:00';
  }

  const minute = Math.max(0, Math.min(1439, Number(value)));
  const hour = Math.floor(minute / 60);
  const rest = minute % 60;
  return `${pad(hour)}:${pad(rest)}`;
}

function timeToMinute(value: string) {
  const [hour, minute] = value.split(':').map(Number);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) {
    return null;
  }

  return hour * 60 + minute;
}

const ProfilePage = observer(() => {
  const { mailboxStore } = useRootStore();
  const [preferences, setPreferences] = useState<UserPreferences>(DEFAULT_PREFERENCES);
  const [loadingPreferences, setLoadingPreferences] = useState(false);
  const [preferencesLoaded, setPreferencesLoaded] = useState(false);
  const [savingPreferences, setSavingPreferences] = useState(false);

  useDidShow(() => {
    void (async () => {
      if (!preferencesLoaded) {
        setLoadingPreferences(true);
      }
      try {
        const latest = await fetchPreferences();
        setPreferences({ ...DEFAULT_PREFERENCES, ...latest });
      } catch (error) {
        Taro.showToast({ title: getErrorMessage(error), icon: 'none' });
      } finally {
        setPreferencesLoaded(true);
        setLoadingPreferences(false);
      }
    })();
  });

  const handleClearDraft = () => {
    mailboxStore.clearDraft();
    Taro.showToast({ title: '草稿已经清空', icon: 'none' });
  };

  const handleReset = () => {
    Taro.showModal({
      title: '要清空这只信箱吗',
      content: '这会带走当前账号下的草稿、信件和回响，而且不能恢复。',
      success: (result) => {
        if (result.confirm) {
          void mailboxStore
            .resetAll()
            .then(() => {
              Taro.showToast({ title: '信箱已经清空', icon: 'none' });
            })
            .catch((error) => {
              Taro.showToast({
                title: getErrorMessage(error),
                icon: 'none',
              });
            });
        }
      },
    });
  };

  const handleSavePreferences = async () => {
    if (savingPreferences) {
      return;
    }

    if (
      preferences.reminderEnabled &&
      preferences.reminderChannel === 'official_account' &&
      !preferences.officialAccountOpenId.trim()
    ) {
      Taro.showToast({ title: '开启公众号提醒前，请先填写公众号 OpenID', icon: 'none' });
      return;
    }

    setSavingPreferences(true);
    try {
      const saved = await updatePreferences(preferences);
      setPreferences({ ...DEFAULT_PREFERENCES, ...saved });
      Taro.showToast({ title: '偏好设置已保存', icon: 'none' });
    } catch (error) {
      Taro.showToast({ title: getErrorMessage(error), icon: 'none' });
    } finally {
      setSavingPreferences(false);
    }
  };

  const quietEnabled = preferences.quietStartMinute !== null && preferences.quietEndMinute !== null;

  return (
    <PageShell
      stabilizeTransitions
      eyebrow='信箱管理'
      title='我的'
      subtitle='这里放着这只信箱的近况、边界提醒，以及几项需要你亲自决定的整理操作。'
    >
      <View className='metric-cluster'>
        <View className='metric-tile'>
          <Text className='metric-label'>信件数</Text>
          <Text className='metric-value stat-number'>{mailboxStore.letters.length}</Text>
          <Text className='metric-caption'>已经寄出去，留在邮路上的信。</Text>
        </View>

        <View className='metric-tile'>
          <Text className='metric-label'>草稿</Text>
          <Text className='metric-value stat-number'>{mailboxStore.draft.body ? '1' : '0'}</Text>
          <Text className='metric-caption'>还放在草稿里，等你哪天继续写。</Text>
        </View>
      </View>
      <ArcoCard tone='default' padding='lg' delay={2}>
        <SectionHeading
          eyebrow='回响节奏'
          title='设置回响节奏、静默时段和提醒通道'
          description='支持快速/均衡/慢速节奏；也可以限制夜间静默，并选择小程序或公众号提醒。'
        />

        {!preferencesLoaded && loadingPreferences ? (
          <Text className='mt-5 block text-caption text-driftwood'>正在加载偏好设置…</Text>
        ) : (
          <View className='mt-5 flex flex-col gap-6'>
            <View>
              <Text className='text-caption text-driftwood'>回响节奏偏好</Text>
              <View className='mt-3 flex flex-wrap gap-2'>
                {DELIVERY_PACE_OPTIONS.map((item) => (
                  <ArcoTag
                    key={item.value}
                    active={preferences.deliveryPace === item.value}
                    onClick={() =>
                      setPreferences((prev) => ({
                        ...prev,
                        deliveryPace: item.value,
                      }))
                    }
                  >
                    {item.label}
                  </ArcoTag>
                ))}
              </View>
              <Text className='mt-2 block text-caption text-fog'>
                {DELIVERY_PACE_OPTIONS.find((item) => item.value === preferences.deliveryPace)?.hint}
              </Text>
            </View>

            <View>
              <Text className='text-caption text-driftwood'>静默时段（该时段内不送达）</Text>
              <View className='mt-3 flex flex-wrap gap-2'>
                <ArcoTag
                  active={!quietEnabled}
                  onClick={() =>
                    setPreferences((prev) => ({
                      ...prev,
                      quietStartMinute: null,
                      quietEndMinute: null,
                    }))
                  }
                >
                  不限制
                </ArcoTag>
                <ArcoTag
                  active={quietEnabled}
                  onClick={() =>
                    setPreferences((prev) => ({
                      ...prev,
                      quietStartMinute: prev.quietStartMinute ?? 22 * 60,
                      quietEndMinute: prev.quietEndMinute ?? 8 * 60,
                    }))
                  }
                >
                  启用静默
                </ArcoTag>
              </View>

              {quietEnabled ? (
                <View className='field-row field-row--double mt-4'>
                  <Picker
                    mode='time'
                    value={minuteToTime(preferences.quietStartMinute)}
                    onChange={(event) => {
                      const minute = timeToMinute(event.detail.value)
                      setPreferences((prev) => ({
                        ...prev,
                        quietStartMinute: minute,
                      }))
                    }}
                  >
                    <View className='picker-field'>
                      <Text className='picker-field-label'>静默开始</Text>
                      <Text className='picker-field-value'>{minuteToTime(preferences.quietStartMinute)}</Text>
                      <Text className='picker-field-note'>点这里调整开始时间</Text>
                    </View>
                  </Picker>

                  <Picker
                    mode='time'
                    value={minuteToTime(preferences.quietEndMinute)}
                    onChange={(event) => {
                      const minute = timeToMinute(event.detail.value)
                      setPreferences((prev) => ({
                        ...prev,
                        quietEndMinute: minute,
                      }))
                    }}
                  >
                    <View className='picker-field'>
                      <Text className='picker-field-label'>静默结束</Text>
                      <Text className='picker-field-value'>{minuteToTime(preferences.quietEndMinute)}</Text>
                      <Text className='picker-field-note'>点这里调整结束时间</Text>
                    </View>
                  </Picker>
                </View>
              ) : null}
            </View>

            <View>
              <Text className='text-caption text-driftwood'>提醒方式</Text>
              <View className='mt-3 flex flex-wrap gap-2'>
                {REMINDER_CHANNEL_OPTIONS.map((item) => (
                  <ArcoTag
                    key={item.value}
                    active={preferences.reminderChannel === item.value}
                    onClick={() =>
                      setPreferences((prev) => ({
                        ...prev,
                        reminderChannel: item.value,
                      }))
                    }
                  >
                    {item.label}
                  </ArcoTag>
                ))}
              </View>
              <Text className='mt-2 block text-caption text-fog'>
                {REMINDER_CHANNEL_OPTIONS.find((item) => item.value === preferences.reminderChannel)?.hint}
              </Text>

              <View className='mt-3'>
                <ArcoButton
                  variant='outline'
                  onClick={() =>
                    setPreferences((prev) => ({
                      ...prev,
                      reminderEnabled: !prev.reminderEnabled,
                    }))
                  }
                >
                  {preferences.reminderEnabled ? '当前：提醒已启用' : '当前：提醒已关闭'}
                </ArcoButton>
              </View>

              {preferences.reminderChannel === 'mini_program_subscribe' ? (
                <View className='mt-4 flex flex-col gap-3'>
                  <Input
                    className='field-control'
                    placeholder='可选：小程序订阅模板 ID（留空用服务端默认）'
                    placeholderStyle='color: #B5AB9C'
                    value={preferences.miniProgramTemplateId}
                    maxlength={128}
                    onInput={(event) =>
                      setPreferences((prev) => ({
                        ...prev,
                        miniProgramTemplateId: event.detail.value,
                      }))
                    }
                  />
                </View>
              ) : null}

              {preferences.reminderChannel === 'official_account' ? (
                <View className='mt-4 flex flex-col gap-3'>
                  <Input
                    className='field-control'
                    placeholder='公众号 OpenID（需先在公众号侧完成绑定）'
                    placeholderStyle='color: #B5AB9C'
                    value={preferences.officialAccountOpenId}
                    maxlength={128}
                    onInput={(event) =>
                      setPreferences((prev) => ({
                        ...prev,
                        officialAccountOpenId: event.detail.value,
                      }))
                    }
                  />
                  <Input
                    className='field-control'
                    placeholder='可选：公众号模板 ID（留空用服务端默认）'
                    placeholderStyle='color: #B5AB9C'
                    value={preferences.officialAccountTemplateId}
                    maxlength={128}
                    onInput={(event) =>
                      setPreferences((prev) => ({
                        ...prev,
                        officialAccountTemplateId: event.detail.value,
                      }))
                    }
                  />
                </View>
              ) : null}
            </View>

            <View className='sticky-cta-stack'>
              <ArcoButton
                className='w-full'
                loading={savingPreferences}
                onClick={() => void handleSavePreferences()}
              >
                保存节奏与提醒设置
              </ArcoButton>
            </View>
          </View>
        )}
      </ArcoCard>

      <ArcoCard tone='muted' padding='lg' delay={3}>
        <SectionHeading
          eyebrow='轻一点的整理'
          title='先处理那些不会把记忆一下子清空的事'
          description='如果你只是想收拾一下，先从草稿开始会更轻一些。'
        />
        <View className='mt-5 flex flex-col gap-3'>
          <ArcoButton variant='text' onClick={handleClearDraft}>
            清空当前草稿
          </ArcoButton>
        </View>
      </ArcoCard>

      <ArcoCard tone='danger' padding='lg' delay={4}>
        <SectionHeading
          eyebrow='危险操作'
          title='如果你决定告一段落，可以清空整只信箱'
          description='这会删除当前账号下的草稿、信件和回响记录，而且不能恢复。'
        />
        <View className='mt-5'>
          <ArcoButton variant='text' className='text-terracotta' onClick={handleReset}>
            清空整只信箱
          </ArcoButton>
        </View>
      </ArcoCard>
    </PageShell>
  );
});

export default ProfilePage;
