import { Text, View } from '@tarojs/components';
import Taro, { useDidShow, useRouter } from '@tarojs/taro';
import { useState } from 'react';
import { observer } from 'mobx-react-lite';

import { AnimatedView } from '@/components/animation/animated-view';
import { EnvelopeOpen } from '@/components/animation/envelope-open';
import { ArcoButton } from '@/components/arco/button';
import { ArcoCard } from '@/components/arco/card';
import { ArcoEmpty } from '@/components/arco/empty';
import { LoadingState } from '@/components/arco/loading-state';
import { LetterPaper } from '@/components/arco/letter-paper';
import { PageShell } from '@/components/layout/page-shell';
import { useRootStore } from '@/stores/root-store';
import { formatDateTime, formatRemaining } from '@/utils/time';

const ReplyPage = observer(() => {
  const { params } = useRouter();
  const { mailboxStore } = useRootStore();
  const reply = mailboxStore.getReply(params.id);
  const letter = mailboxStore.getLetter(reply?.letterId);
  const [showOpenAnim, setShowOpenAnim] = useState(true);
  const [contentRevealed, setContentRevealed] = useState(false);

  useDidShow(() => {
    void mailboxStore.refreshReplyDetail(params.id);
  });

  if (mailboxStore.detailSyncing && !reply) {
    return (
      <PageShell title='回响详情' subtitle='正在查找这封回响。'>
        <LoadingState text='正在同步回响…' />
      </PageShell>
    );
  }

  // 没找到回信
  if (!reply) {
    return (
      <PageShell title='回响详情' subtitle='这封信可能还没有生成。'>
        <ArcoEmpty
          title='没有找到这封回响'
          description='可以回到收件箱刷新，或重新写一封信。'
          actionText='返回收件箱'
          onAction={() => Taro.redirectTo({ url: '/pages/inbox/index' })}
        />
      </PageShell>
    );
  }

  // 回信仍在等待中
  if (reply.status === 'waiting') {
    return (
      <PageShell title='回响仍在路上' subtitle='延迟本身也是这份体验的一部分。'>
        <ArcoCard delay={1}>
          <AnimatedView animation='fade-in-up'>
            <Text className='text-heading text-charcoal'>{reply.subject}</Text>
            <Text className='mt-3 block text-body text-driftwood'>
              这封回响还在安静酝酿，预计 {formatRemaining(reply.availableAt)}。
            </Text>
            <Text className='mt-3 block text-overline text-fog'>
              你原信写于 {formatDateTime(reply.createdAt)}
            </Text>
          </AnimatedView>
        </ArcoCard>

        <AnimatedView animation='fade-in-up' delay={2}>
          <ArcoButton onClick={() => void mailboxStore.refreshReplyDetail(reply.id)}>
            刷新状态
          </ArcoButton>
        </AnimatedView>
      </PageShell>
    );
  }

  // 开信动画
  if (showOpenAnim && !contentRevealed) {
    return (
      <EnvelopeOpen
        subject={reply.subject}
        relation={letter?.relation || undefined}
        onComplete={() => {
          setShowOpenAnim(false);
          setContentRevealed(true);
        }}
      />
    );
  }

  // 回信正文
  return (
    <PageShell
      title={reply.subject}
      subtitle='由系统生成的回响，用来承接思念，不代表逝者真实意志。'
    >
      {/* 原信信息 — 不用卡片，用渐隐分割线隔开 */}
      <AnimatedView animation='fade-in-up' delay={1}>
        <Text className='text-overline text-fog'>
          原信时间：{formatDateTime(reply.createdAt)}
        </Text>
        {letter?.title ? (
          <Text className='mt-1 block text-caption text-driftwood'>
            原信标题：{letter.title}
          </Text>
        ) : null}
        <View className='divider-fade mt-5' />
      </AnimatedView>

      {/* 回信正文 — 信纸质感，段落逐段入场 */}
      <AnimatedView animation='letter-reveal' delay={2}>
        <LetterPaper>
          <View className='flex flex-col gap-5'>
            {reply.body.split('\n\n').map((paragraph, index) => (
              <View
                key={paragraph.slice(0, 20)}
                className={`anim-fade-in-up anim-read-delay-${Math.min(index + 1, 10)}`}
              >
                <Text className='text-body leading-8 text-charcoal'>
                  {paragraph}
                </Text>
              </View>
            ))}
          </View>
        </LetterPaper>
      </AnimatedView>

      {/* 温柔提示 */}
      <AnimatedView animation='fade-in' delay={6}>
        <Text className='block text-center text-caption text-fog'>
          这封回响由系统生成，用来承接思念，而非还原真实
        </Text>
      </AnimatedView>

      {/* 返回 — 文字链接 */}
      <AnimatedView animation='fade-in' delay={7}>
        <ArcoButton
          variant='text'
          onClick={() => Taro.redirectTo({ url: '/pages/inbox/index' })}
        >
          返回收件箱
        </ArcoButton>
      </AnimatedView>
    </PageShell>
  );
});

export default ReplyPage;
