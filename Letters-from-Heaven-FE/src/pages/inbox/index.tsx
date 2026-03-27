import { Text, View } from '@tarojs/components';
import Taro, { useDidShow } from '@tarojs/taro';
import { observer } from 'mobx-react-lite';

import { ArcoButton } from '@/components/arco/button';
import { ArcoCard } from '@/components/arco/card';
import { ArcoEmpty } from '@/components/arco/empty';
import { LoadingState } from '@/components/arco/loading-state';
import { ArcoNotice } from '@/components/arco/notice';
import { SectionHeading } from '@/components/arco/section-heading';
import { PageShell } from '@/components/layout/page-shell';
import { useRootStore } from '@/stores/root-store';
import { cn } from '@/utils/cn';
import { formatDateTime, formatRemaining } from '@/utils/time';

const InboxPage = observer(() => {
  const { mailboxStore, memorialStore } = useRootStore();

  useDidShow(() => {
    void mailboxStore.refreshReplies();
    void memorialStore.refreshOverview();
  });

  const getMemorialLabel = (eventId?: string | null) => {
    const event = memorialStore.getEvent(eventId);
    if (!event) {
      return '纪念回响';
    }

    switch (event.type) {
      case 'qingming':
        return '清明回响';
      case 'birthday':
        return '生日回响';
      case 'anniversary':
        return '周年回响';
      default:
        return event.label || '纪念回响';
    }
  };

  return (
    <PageShell
      eyebrow='等待打开的那一刻'
      title='收件箱'
      subtitle='这里不会瞬时刷新情绪，它只在你愿意打开的时候给出回应。'
      meta={(
        <View className='page-shell-actions'>
          <ArcoButton
            size='md'
            onClick={() => Taro.navigateTo({ url: '/pages/write/index' })}
          >
            再写一封信
          </ArcoButton>
        </View>
      )}
    >
      <ArcoCard tone='emphasis' padding='lg' delay={1}>
        <SectionHeading
          eyebrow='当前状态'
          title='信箱里的回响正在积累'
          description='收件箱只展示此刻最值得打开的状态，不再用卡片堆叠制造层级。'
        />
        <View className='mt-6 metric-cluster'>
          <View className='metric-tile'>
            <View className='metric-label'>
              <View className='dot-ready' />
              已送达
            </View>
            <Text className='metric-value stat-number'>{mailboxStore.readyCount}</Text>
            <Text className='metric-caption'>现在就可以打开的回响。</Text>
          </View>

          <View className='metric-tile'>
            <View className='metric-label'>
              <View className='dot-waiting' />
              酝酿中
            </View>
            <Text className='metric-value stat-number'>{mailboxStore.waitingCount}</Text>
            <Text className='metric-caption'>仍在路上，还需要一点时间。</Text>
          </View>
        </View>
      </ArcoCard>

      {mailboxStore.lastError ? (
        <ArcoNotice
          tone='warning'
          title='同步遇到一点问题'
          description={mailboxStore.lastError}
        />
      ) : null}

      {mailboxStore.lastError ? (
        <View>
          <ArcoButton variant='text' onClick={() => void mailboxStore.refreshReplies()}>
            重新同步信箱
          </ArcoButton>
        </View>
      ) : null}

      {mailboxStore.syncing && mailboxStore.inboxItems.length === 0 ? (
        <LoadingState text='正在同步信箱…' />
      ) : mailboxStore.inboxItems.length === 0 ? (
        <ArcoEmpty
          title='还没有回响'
          description='写下第一封信后，这里会开始有故事，也会开始有等待。'
          actionText='去写信'
          onAction={() => Taro.navigateTo({ url: '/pages/write/index' })}
        />
      ) : (
        mailboxStore.inboxItems.map((reply, index) => {
          const isReady = reply.status === 'ready';
          const stamp = formatDateTime(reply.createdAt).slice(5, 10).replace('-', '.');
          const memorialLabel = reply.sourceType === 'memorial'
            ? getMemorialLabel(reply.memorialEventId)
            : '日常回响';
          const previewText = isReady
            ? reply.preview
            : '这封回响仍在路上，正在为你安静酝酿。';

          return (
            <ArcoCard
              key={reply.id}
              className={cn('inbox-mail-item', isReady ? 'inbox-mail-item--ready' : 'inbox-mail-item--waiting')}
              delay={Math.min(index + 2, 9)}
              tone={isReady ? 'default' : 'muted'}
              padding='md'
              onClick={() =>
                Taro.navigateTo({
                  url: `/pages/reply/index?id=${reply.id}`,
                })
              }
            >
              <View className='inbox-mail-body'>
                <View className='inbox-mail-head'>
                  <View className='inbox-mail-head-main'>
                    <View className='status-inline inbox-mail-status'>
                      <View className={isReady ? 'dot-ready' : 'dot-waiting'} />
                      <Text className='text-overline text-driftwood'>
                        {isReady ? '已送达' : '酝酿中'}
                      </Text>
                    </View>
                    <Text className='inbox-mail-subject'>{reply.subject}</Text>
                  </View>
                  <View className='postmark inbox-mail-postmark'>{stamp}</View>
                </View>

                <View className='inbox-mail-meta'>
                  <Text className='inbox-mail-time'>
                    写于 {formatDateTime(reply.createdAt)}
                  </Text>
                  <Text className='inbox-mail-chip'>{memorialLabel}</Text>
                </View>

                <Text className='inbox-mail-preview line-clamp-3'>
                  {previewText}
                </Text>

                <View className='inbox-mail-footer'>
                  <Text className='inbox-mail-action'>
                    {isReady ? '打开回响' : '继续等待'}
                  </Text>
                  <Text className='inbox-mail-hint'>
                    {isReady ? '轻触阅读这封已经抵达的回信。' : `预计 ${formatRemaining(reply.availableAt)}`}
                  </Text>
                </View>
              </View>
            </ArcoCard>
          );
        })
      )}
    </PageShell>
  );
});

export default InboxPage;
