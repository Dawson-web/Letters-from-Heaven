import { Text, View } from '@tarojs/components';
import Taro, { useDidShow } from '@tarojs/taro';
import { observer } from 'mobx-react-lite';

import { ArcoButton } from '@/components/arco/button';
import { ArcoCard } from '@/components/arco/card';
import { ArcoEmpty } from '@/components/arco/empty';
import { LoadingState } from '@/components/arco/loading-state';
import { PageShell } from '@/components/layout/page-shell';
import { useRootStore } from '@/stores/root-store';
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
      title='收件箱'
      subtitle='等待你愿意打开的那一刻。'
    >
      <ArcoCard delay={1} className='card-primary'>
        <Text className='text-overline text-driftwood'>当前状态</Text>
        <View className='mt-5 flex'>
          <View className='flex-1'>
            <View className='mb-3 flex items-center gap-2'>
              <View className='dot-ready' />
              <Text className='text-overline text-driftwood'>已送达</Text>
            </View>
            <Text className='text-display text-charcoal stat-number'>
              {mailboxStore.readyCount}
            </Text>
          </View>
          <View className='w-px bg-linen-edge' />
          <View className='flex-1'>
            <View className='mb-3 flex items-center gap-2'>
              <View className='dot-waiting' />
              <Text className='text-overline text-driftwood'>酝酿中</Text>
            </View>
            <Text className='text-display text-charcoal stat-number'>
              {mailboxStore.waitingCount}
            </Text>
          </View>
        </View>
      </ArcoCard>

      {mailboxStore.lastError ? (
        <ArcoCard delay={2}>
          <Text className='text-body font-semibold text-charcoal'>同步遇到一点问题</Text>
          <Text className='mt-2 block text-caption text-driftwood'>
            {mailboxStore.lastError}
          </Text>
          <View className='mt-4'>
            <ArcoButton variant='text' onClick={() => void mailboxStore.refreshReplies()}>
              重新同步
            </ArcoButton>
          </View>
        </ArcoCard>
      ) : null}

      {mailboxStore.syncing && mailboxStore.inboxItems.length === 0 ? (
        <LoadingState text='正在同步信箱…' />
      ) : mailboxStore.inboxItems.length === 0 ? (
        <ArcoEmpty
          title='还没有回响'
          description='写下第一封信后，这里会开始有故事。'
          actionText='去写信'
          onAction={() => Taro.navigateTo({ url: '/pages/write/index' })}
        />
      ) : (
        mailboxStore.inboxItems.map((reply, index) => (
          <ArcoCard
            key={reply.id}
            className='flex flex-col gap-4'
            delay={Math.min(index + 2, 9)}
            onClick={() =>
              Taro.navigateTo({
                url: `/pages/reply/index?id=${reply.id}`,
              })
            }
          >
            {/* 标题行 */}
            <View className='flex items-center gap-2'>
              <View
                className={
                  reply.status === 'ready'
                    ? 'dot-ready'
                    : 'dot-waiting'
                }
              />
              <Text className='flex-1 text-heading text-charcoal'>
                {reply.subject}
              </Text>
              <View className='postmark'>
                {formatDateTime(reply.createdAt).slice(5, 10).replace('-', '.')}
              </View>
            </View>

            {/* 时间戳 */}
            <Text className='text-overline text-driftwood'>
              写于 {formatDateTime(reply.createdAt)}
            </Text>

            {reply.sourceType === 'memorial' ? (
              <Text className='text-overline text-fog'>
                {getMemorialLabel(reply.memorialEventId)}
              </Text>
            ) : null}

            {/* 预览 */}
            <Text className='line-clamp-2 text-caption text-driftwood'>
              {reply.status === 'ready'
                ? reply.preview
                : `预计 ${formatRemaining(reply.availableAt)}`}
            </Text>

            {/* 操作提示 */}
            <Text className='text-caption font-medium text-stone'>
              {reply.status === 'ready' ? '打开回响 →' : '等待中…'}
            </Text>
          </ArcoCard>
        ))
      )}
    </PageShell>
  );
});

export default InboxPage;
