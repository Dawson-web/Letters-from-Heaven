import { Text, View } from '@tarojs/components';
import Taro, { useDidShow } from '@tarojs/taro';
import { observer } from 'mobx-react-lite';

import { ArcoCard } from '@/components/arco/card';
import { ArcoEmpty } from '@/components/arco/empty';
import { AuthRequiredState } from '@/components/auth/auth-required-state';
import { LoadingState } from '@/components/arco/loading-state';
import { PageShell } from '@/components/layout/page-shell';
import { useRootStore } from '@/stores/root-store';
import { formatDateTime, formatRemaining } from '@/utils/time';

const InboxPage = observer(() => {
  const { mailboxStore, userStore } = useRootStore();

  useDidShow(() => {
    if (userStore.isAuthorized) {
      void mailboxStore.refreshReplies();
    }
  });

  if (!userStore.isAuthorized) {
    return (
      <PageShell
        title='收件箱'
        subtitle='完成微信授权后，回响才会投递到你的专属信箱。'
      >
        <AuthRequiredState description='请先回到首页，通过底部微信授权弹层进入后再查看收件箱。' />
      </PageShell>
    );
  }

  return (
    <PageShell
      title='收件箱'
      subtitle='等待你愿意打开的那一刻。'
    >
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
            delay={Math.min(index + 1, 8)}
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
            </View>

            {/* 时间戳 */}
            <Text className='text-overline text-fog'>
              写于 {formatDateTime(reply.createdAt)}
            </Text>

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
