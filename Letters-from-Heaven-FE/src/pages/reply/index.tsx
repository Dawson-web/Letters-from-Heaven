import { Text, View } from '@tarojs/components';
import Taro, { useDidShow, useRouter } from '@tarojs/taro';
import { useState } from 'react';
import { observer } from 'mobx-react-lite';

import { EnvelopeOpen } from '@/components/animation/envelope-open';
import { ArcoButton } from '@/components/arco/button';
import { ArcoCard } from '@/components/arco/card';
import { ArcoEmpty } from '@/components/arco/empty';
import { LetterPaper } from '@/components/arco/letter-paper';
import { LoadingState } from '@/components/arco/loading-state';
import { ArcoNotice } from '@/components/arco/notice';
import { SectionHeading } from '@/components/arco/section-heading';
import { PageShell } from '@/components/layout/page-shell';
import { useRootStore } from '@/stores/root-store';
import { formatDateTime, formatRemaining } from '@/utils/time';

const ReplyPage = observer(() => {
  const { params } = useRouter();
  const { mailboxStore, memorialStore } = useRootStore();
  const reply = mailboxStore.getReply(params.id);
  const letter = mailboxStore.getLetter(reply?.sourceLetterId || reply?.letterId);
  const [showOpenAnim, setShowOpenAnim] = useState(true);
  const [contentRevealed, setContentRevealed] = useState(false);

  useDidShow(() => {
    void mailboxStore.refreshReplyDetail(params.id);
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

  if (mailboxStore.detailSyncing && !reply) {
    return (
      <PageShell
        eyebrow='回响详情'
        title='正在寻找这封回响'
        subtitle='系统正在同步最新状态。'
      >
        <LoadingState text='正在同步回响…' />
      </PageShell>
    );
  }

  if (!reply) {
    return (
      <PageShell
        eyebrow='回响详情'
        title='没有找到这封回响'
        subtitle='它可能还没有生成，或者你刚好在系统同步前打开了这里。'
      >
        <ArcoEmpty
          title='这封回响暂时还不在这里'
          description='可以回到收件箱刷新，或者重新写一封新的信。'
          actionText='返回收件箱'
          onAction={() => Taro.redirectTo({ url: '/pages/inbox/index' })}
        />
      </PageShell>
    );
  }

  if (reply.status === 'waiting') {
    return (
      <PageShell
        eyebrow='仍在路上'
        title='回响仍在酝酿'
        subtitle='延迟本身也是这份体验的一部分，它会在更合适的时刻抵达。'
        footer={(
          <View className='sticky-cta-stack'>
            <ArcoButton className='w-full' size='lg' onClick={() => void mailboxStore.refreshReplyDetail(reply.id)}>
              刷新状态
            </ArcoButton>
            <ArcoButton
              variant='text'
              onClick={() => Taro.redirectTo({ url: '/pages/inbox/index' })}
            >
              返回收件箱
            </ArcoButton>
          </View>
        )}
      >
        <ArcoCard tone='emphasis' padding='lg' delay={1}>
          <View className='flex items-start justify-between gap-4'>
            <View className='flex-1'>
              <View className='status-inline'>
                <View className='dot-waiting' />
                <Text className='text-overline text-driftwood'>酝酿中</Text>
              </View>
              <Text className='mt-3 block text-heading text-charcoal'>{reply.subject}</Text>
            </View>
            <View className='postmark'>{formatDateTime(reply.createdAt).slice(5, 10).replace('-', '.')}</View>
          </View>

          <Text className='mt-5 block text-body text-charcoal'>
            这封回响还在安静酝酿，预计 {formatRemaining(reply.availableAt)}。
          </Text>

          <View className='mt-5 flex flex-col gap-2'>
            <Text className='text-overline text-driftwood'>原信写于 {formatDateTime(reply.createdAt)}</Text>
            {reply.sourceType === 'memorial' ? (
              <Text className='text-overline text-fog'>{getMemorialLabel(reply.memorialEventId)}</Text>
            ) : null}
          </View>
        </ArcoCard>

        <ArcoNotice
          title='等待不是空白'
          description='系统会保留这段时间差，让“回响”更像一封真正经历了路途的信。'
        />
      </PageShell>
    );
  }

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

  return (
    <PageShell
      eyebrow='一封已经抵达的回响'
      title={reply.subject}
      subtitle='这封回响由系统生成，用来承接思念，不代表逝者真实意志。'
      meta={(
        <View className='flex flex-wrap gap-2'>
          <View className='meta-chip'>{formatDateTime(reply.createdAt)}</View>
          {reply.sourceType === 'memorial' ? (
            <View className='meta-chip'>{getMemorialLabel(reply.memorialEventId)}</View>
          ) : null}
        </View>
      )}
      footer={(
        <View className='sticky-cta-stack'>
          <ArcoButton
            className='w-full'
            size='lg'
            onClick={() => Taro.redirectTo({ url: '/pages/inbox/index' })}
          >
            返回收件箱
          </ArcoButton>
          <ArcoButton
            variant='text'
            onClick={() => Taro.redirectTo({ url: '/pages/write/index' })}
          >
            再写一封
          </ArcoButton>
        </View>
      )}
    >
      <ArcoCard tone='muted' padding='lg' delay={1}>
        <SectionHeading
          eyebrow='原信信息'
          title='这封回响从这里开始'
          description='先确认这封信写给谁、写于什么时候，再慢慢打开正文。'
        />

        <View className='mt-5 flex flex-col gap-2'>
          <Text className='text-body text-charcoal'>原信时间：{formatDateTime(reply.createdAt)}</Text>
          {letter?.title ? <Text className='text-body text-charcoal'>原信标题：{letter.title}</Text> : null}
          {letter?.relation ? <Text className='text-body text-charcoal'>写给：{letter.relation}</Text> : null}
        </View>
      </ArcoCard>

      <LetterPaper variant='hero' className='letter-paper--reply anim-letter-reveal'>
        <View className='reply-letter-flow'>
          {reply.body.split('\n\n').map((paragraph, index) => (
            <View
              key={`${paragraph.slice(0, 20)}-${index}`}
              className={`reply-paragraph-block anim-fade-in-up anim-read-delay-${Math.min(index + 1, 10)}`}
            >
              <Text className='reply-paragraph'>{paragraph}</Text>
            </View>
          ))}
        </View>
      </LetterPaper>

      <ArcoNotice
        tone='warning'
        title='边界提醒'
        description='这封回响用于承接你的思念，而不是还原真实的关系或逝者本人的态度。'
      />
    </PageShell>
  );
});

export default ReplyPage;
