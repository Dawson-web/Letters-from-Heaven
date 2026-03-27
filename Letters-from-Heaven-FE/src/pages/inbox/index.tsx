import { Text, View } from '@tarojs/components';
import Taro, { useDidShow } from '@tarojs/taro';
import { observer } from 'mobx-react-lite';

import { ArcoButton } from '@/components/arco/button';
import { ArcoCard } from '@/components/arco/card';
import { ArcoEmpty } from '@/components/arco/empty';
import { LoadingState } from '@/components/arco/loading-state';
import { ArcoNotice } from '@/components/arco/notice';
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
      subtitle='这里收着已经到来的，也收着还在路上的回应。'
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
      <ArcoCard tone='emphasis' padding='lg' delay={1} className='inbox-status-hero-card'>
        <View className='inbox-status-hero'>
          <View className='inbox-status-copy'>
            <Text className='inbox-status-eyebrow'>此刻的信箱</Text>
            <Text className='inbox-status-title'>有些回响已经到了，有些还在慢慢靠近</Text>
            <Text className='inbox-status-description'>
              你不需要急着把它们全部打开。先看看哪一封，正好适合今天的你。
            </Text>
          </View>

          <View className='inbox-status-visual anim-gentle-sway'>
            <View className='inbox-status-route' />

            <View className='inbox-status-sheet inbox-status-sheet--back'>
              <View className='inbox-status-sheet-lines'>
                <View className='inbox-status-sheet-line inbox-status-sheet-line--long' />
                <View className='inbox-status-sheet-line inbox-status-sheet-line--medium' />
                <View className='inbox-status-sheet-line inbox-status-sheet-line--long' />
                <View className='inbox-status-sheet-line inbox-status-sheet-line--short' />
              </View>
            </View>

            <View className='inbox-status-sheet inbox-status-sheet--front'>
              <View className='inbox-status-sheet-header' />
              <View className='inbox-status-sheet-body'>
                <View className='inbox-status-sheet-line inbox-status-sheet-line--long' />
                <View className='inbox-status-sheet-line inbox-status-sheet-line--long' />
                <View className='inbox-status-sheet-line inbox-status-sheet-line--medium' />
              </View>
              <Text className='inbox-status-sheet-signature'>想念会被接住</Text>
            </View>

            <View className='hero-postmark hero-postmark--red inbox-status-stamp'>
              <View className='hero-postmark-ring hero-postmark-ring--outer' />
              <View className='hero-postmark-ring hero-postmark-ring--inner' />
              <Text className='hero-postmark-top'>AIR MAIL</Text>
              <Text className='hero-postmark-center'>云端回信</Text>
              <Text className='hero-postmark-bottom'>POST OFFICE</Text>
              <View className='hero-postmark-stars'>
                <View className='hero-postmark-star' />
                <View className='hero-postmark-star' />
                <View className='hero-postmark-star' />
                <View className='hero-postmark-star' />
              </View>
            </View>
          </View>

          <View className='inbox-status-meters'>
            <View className='inbox-status-meter inbox-status-meter--ready'>
              <View className='metric-label'>
                <View className='dot-ready' />
                已抵达
              </View>
              <Text className='inbox-status-meter-value stat-number'>{mailboxStore.readyCount}</Text>
              <Text className='inbox-status-meter-copy'>已经静静等你打开。</Text>
            </View>

            <View className='inbox-status-meter inbox-status-meter--waiting'>
              <View className='metric-label'>
                <View className='dot-waiting' />
                还在路上
              </View>
              <Text className='inbox-status-meter-value stat-number'>{mailboxStore.waitingCount}</Text>
              <Text className='inbox-status-meter-copy'>慢一点，也没有关系。</Text>
            </View>
          </View>
        </View>
      </ArcoCard>

      {mailboxStore.lastError ? (
        <ArcoNotice
          tone='warning'
          title='信箱刚刚有点走神'
          description={mailboxStore.lastError}
        />
      ) : null}

      {mailboxStore.lastError ? (
        <View>
          <ArcoButton variant='text' onClick={() => void mailboxStore.refreshReplies()}>
            再试着同步一次
          </ArcoButton>
        </View>
      ) : null}

      {mailboxStore.syncing && mailboxStore.inboxItems.length === 0 ? (
        <LoadingState text='正在替你看看有没有新的回响…' />
      ) : mailboxStore.inboxItems.length === 0 ? (
        <ArcoEmpty
          title='这里暂时还是安静的'
          description='等你写下第一封信之后，回响和等待都会慢慢在这里出现。'
          actionText='去写第一封信'
          onAction={() => Taro.navigateTo({ url: '/pages/write/index' })}
        />
      ) : (
        mailboxStore.inboxItems.map((reply, index) => {
          const isReady = reply.status === 'ready';
          const hasGeneratedBody = reply.body.trim().length > 0;
          const aiGenerated = typeof reply.aiGenerated === 'boolean'
            ? reply.aiGenerated
            : (isReady ? reply.preview === '你的来信已收到，回响已生成。' : hasGeneratedBody);
          const aiGenerating = !isReady && !aiGenerated;
          const stamp = formatDateTime(reply.createdAt).slice(5, 10).replace('-', '.');
          const memorialLabel = reply.sourceType === 'memorial'
            ? getMemorialLabel(reply.memorialEventId)
            : '日常回响';
          const previewText = isReady
            ? reply.preview
            : aiGenerated
              ? '回响已经写好，只等合适的时候来到你面前。'
              : '系统正顺着你的来信慢慢写回这封回应。';

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
                        {isReady ? (aiGenerated ? 'AI 回响已抵达' : '系统回响已抵达') : aiGenerated ? 'AI 已写好，等它到来' : 'AI 正在写回'}
                      </Text>
                    </View>
                    <Text className='inbox-mail-subject'>{reply.subject}</Text>
                  </View>
                  <View className='postmark inbox-mail-postmark'>{stamp}</View>
                </View>

                <View className='inbox-mail-meta'>
                  <Text className='inbox-mail-time'>
                    写下于 {formatDateTime(reply.createdAt)}
                  </Text>
                  <View className='flex items-center gap-2'>
                    <Text className='inbox-mail-chip'>{memorialLabel}</Text>
                    <Text className='inbox-mail-chip'>
                      {aiGenerated ? 'AI 生成' : aiGenerating ? 'AI 生成中' : '系统模板'}
                    </Text>
                  </View>
                </View>

                <Text className='inbox-mail-preview line-clamp-3'>
                  {previewText}
                </Text>

                <View className='inbox-mail-footer'>
                  <Text className='inbox-mail-action'>
                    {isReady ? '慢慢打开' : aiGenerated ? '再等等它' : '先让它写完'}
                  </Text>
                  <Text className='inbox-mail-hint'>
                    {isReady
                      ? '它已经到了，想看的时候就打开。'
                      : aiGenerated
                        ? `已经写好，大约 ${formatRemaining(reply.availableAt)} 后会来到这里`
                        : `大约 ${formatRemaining(reply.availableAt)} 后会来到这里`}
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
