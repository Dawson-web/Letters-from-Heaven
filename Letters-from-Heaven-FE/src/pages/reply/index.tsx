import { Image, Input, Text, View } from '@tarojs/components';
import Taro, { useDidShow, useRouter } from '@tarojs/taro';
import { useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';

import { EnvelopeOpen } from '@/components/animation/envelope-open';
import { ArcoButton } from '@/components/arco/button';
import { ArcoCard } from '@/components/arco/card';
import { ArcoEmpty } from '@/components/arco/empty';
import { LetterPaper } from '@/components/arco/letter-paper';
import { LoadingState } from '@/components/arco/loading-state';
import { SectionHeading } from '@/components/arco/section-heading';
import { ArcoTag } from '@/components/arco/tag';
import { PageShell } from '@/components/layout/page-shell';
import { generateImageByCloudFunction } from '@/services/ai';
import { getErrorMessage } from '@/services/request';
import { useRootStore } from '@/stores/root-store';
import type { ReplyFeedbackScore } from '@/types/mail';
import { formatDateTime, formatRemaining } from '@/utils/time';

const FEEDBACK_OPTIONS: Array<{ value: ReplyFeedbackScore; label: string }> = [
  { value: 'match', label: '很贴近' },
  { value: 'neutral', label: '还可以' },
  { value: 'mismatch', label: '不太贴近' },
];

const ReplyPage = observer(() => {
  const { params } = useRouter();
  const { mailboxStore, memorialStore } = useRootStore();
  const reply = mailboxStore.getReply(params.id);
  const letter = mailboxStore.getLetter(reply?.sourceLetterId || reply?.letterId);
  const [showOpenAnim, setShowOpenAnim] = useState(true);
  const [contentRevealed, setContentRevealed] = useState(false);
  const [feedbackReason, setFeedbackReason] = useState('');
  const [savingFeedback, setSavingFeedback] = useState(false);
  const [generatingPostcard, setGeneratingPostcard] = useState(false);
  const [postcardUrls, setPostcardUrls] = useState<string[]>([]);
  const [postcardError, setPostcardError] = useState('');

  useDidShow(() => {
    void mailboxStore.refreshReplyDetail(params.id).then((currentReply) => {
      if (currentReply?.status === 'ready' && !currentReply.readAt) {
        void mailboxStore.markReplyRead(currentReply.id, true);
      }
    });
  });

  useEffect(() => {
    if (!reply) {
      return;
    }

    setFeedbackReason(reply.feedbackReason || '');
  }, [reply]);

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
      case 'death_anniversary':
        return '忌日回响';
      default:
        return event.label || '纪念回响';
    }
  };

  const handleSaveFeedback = async (score: ReplyFeedbackScore) => {
    if (!reply || savingFeedback) {
      return;
    }

    setSavingFeedback(true);
    try {
      await mailboxStore.updateReplyFeedback(reply.id, score, feedbackReason.trim());
      Taro.showToast({ title: '谢谢反馈，后续回响会继续调整', icon: 'none' });
    } catch (error) {
      Taro.showToast({ title: getErrorMessage(error), icon: 'none' });
    } finally {
      setSavingFeedback(false);
    }
  };

  const handleGeneratePostcard = async () => {
    if (!reply || generatingPostcard) {
      return;
    }

    setGeneratingPostcard(true);
    setPostcardError('');

    try {
      const prompt = [
        '把以下书信内容设计为温柔克制的纪念明信片插画。',
        '风格要求：暖色、纸张质感、留白、无人物正脸、中文书信氛围。',
        `标题：${reply.subject}`,
        `正文摘录：${reply.body.slice(0, 240)}`,
      ].join('\n');

      const result = await generateImageByCloudFunction({
        prompt,
        count: 1,
        size: '1024x1024',
      });
      const urls = result.images
        .map((item) => item.tempFileURL || item.originURL || '')
        .filter(Boolean);

      if (!urls.length) {
        setPostcardError('暂时没有生成可预览的图片，请稍后再试。');
        return;
      }

      setPostcardUrls(urls);
      Taro.showToast({ title: '纪念画片已生成', icon: 'none' });
    } catch (error) {
      const message = getErrorMessage(error);
      setPostcardError(message);
      Taro.showToast({ title: message, icon: 'none' });
    } finally {
      setGeneratingPostcard(false);
    }
  };

  const handleSaveFeedbackReason = async () => {
    if (!reply || savingFeedback) {
      return;
    }

    setSavingFeedback(true);
    try {
      await mailboxStore.updateReplyFeedback(
        reply.id,
        reply.feedbackScore || 'neutral',
        feedbackReason.trim()
      );
      Taro.showToast({ title: '补充说明已保存', icon: 'none' });
    } catch (error) {
      Taro.showToast({ title: getErrorMessage(error), icon: 'none' });
    } finally {
      setSavingFeedback(false);
    }
  };

  if (mailboxStore.detailSyncing && !reply) {
    return (
      <PageShell
        eyebrow='回响详情'
        title='正在把这封回响找给你'
        subtitle='它可能刚刚抵达，再等一会儿。'
      >
        <LoadingState text='正在把这封回响轻轻展开…' />
      </PageShell>
    );
  }

  if (!reply) {
    return (
      <PageShell
        eyebrow='回响详情'
        title='这封回响暂时还没到这里'
        subtitle='也许它还在路上，或者刚好比你慢了一小步。'
      >
        <ArcoEmpty
          title='先别着急，它可能还在路上'
          description='你可以回到收件箱再看看，或者先去写下另一封想说的话。'
          actionText='返回收件箱'
          onAction={() => Taro.redirectTo({ url: '/pages/inbox/index' })}
        />
      </PageShell>
    );
  }

  const hasGeneratedBody = reply.body.trim().length > 0;
  const aiGenerated = typeof reply.aiGenerated === 'boolean'
    ? reply.aiGenerated
    : (reply.status === 'ready'
      ? reply.preview === '你的来信已收到，回响已生成。'
      : hasGeneratedBody);
  const replyBody = reply.body.trim() || '这封回响还在整理最后一点字句，稍后再来看看。';

  if (reply.status === 'waiting') {
    return (
      <PageShell
        eyebrow='它还在路上'
        title={aiGenerated ? '回响已经写好，正在等它来到你面前' : '这封回响还在慢慢酝酿'}
        subtitle={aiGenerated
          ? '回响已经写好，只是还在等那个适合你打开它的时刻。'
          : '系统正顺着你的来信慢慢写回这封回应，时间差也会替它留住一点书信感。'}
        footer={(
          <View className='sticky-cta-stack'>
            <ArcoButton className='w-full' size='lg' onClick={() => void mailboxStore.refreshReplyDetail(reply.id)}>
              再看看现在到了没有
            </ArcoButton>
            <ArcoButton
              variant='text'
              onClick={() => Taro.redirectTo({ url: '/pages/inbox/index' })}
            >
              先回收件箱
            </ArcoButton>
          </View>
        )}
      >
        <ArcoCard tone='emphasis' padding='lg' delay={1}>
          <View className='flex items-start justify-between gap-4'>
            <View className='flex-1'>
              <View className='status-inline'>
                <View className='dot-waiting' />
                <Text className='text-overline text-driftwood'>{aiGenerated ? '已写好，等它到来' : '正在写回'}</Text>
              </View>
              <Text className='mt-3 block text-heading text-charcoal'>{reply.subject}</Text>
            </View>
            <View className='postmark'>{formatDateTime(reply.createdAt).slice(5, 10).replace('-', '.')}</View>
          </View>

          <Text className='mt-5 block text-body text-charcoal'>
            {aiGenerated
              ? `这封回响已经写好，可能会在${formatRemaining(reply.availableAt)}来到你面前。`
              : `这封回响还在慢慢写成，可能会在${formatRemaining(reply.availableAt)}来到你面前。`}
          </Text>

          <View className='mt-5 flex flex-col gap-2'>
            <Text className='text-overline text-driftwood'>原信写于 {formatDateTime(reply.createdAt)}</Text>
            {reply.sourceType === 'memorial' ? (
              <Text className='text-overline text-fog'>{getMemorialLabel(reply.memorialEventId)}</Text>
            ) : null}
          </View>
        </ArcoCard>

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
      eyebrow='一封已经来到你面前的回响'
      title={reply.subject}
      subtitle={aiGenerated
        ? '这封回响由 AI 顺着你的来信写回，用来陪你安放思念，不代表逝者真实意志。'
        : '这封回响由系统模板承接你的来信，用来陪你安放思念，不代表逝者真实意志。'}
      meta={(
        <View className='flex flex-wrap gap-2'>
          <View className='meta-chip'>{formatDateTime(reply.createdAt)}</View>
          <View className='meta-chip'>{aiGenerated ? 'AI 写回' : '系统模板'}</View>
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
            再写一封信
          </ArcoButton>
        </View>
      )}
    >
      <ArcoCard tone='muted' padding='lg' delay={1}>
        <SectionHeading
          eyebrow='原信落款'
          title='它是从你写下的那一刻开始回来的'
          description='先看看时间、称呼和来处，再慢慢读完这封信。'
        />

        <View className='mt-5 flex flex-col gap-2'>
          <Text className='text-body text-charcoal'>写下时间：{formatDateTime(reply.createdAt)}</Text>
          {letter?.title ? <Text className='text-body text-charcoal'>原信标题：{letter.title}</Text> : null}
          {letter?.relation ? <Text className='text-body text-charcoal'>写给：{letter.relation}</Text> : null}
        </View>
      </ArcoCard>

      <LetterPaper variant='hero' className='letter-paper--reply anim-letter-reveal'>
        <View className='reply-letter-flow'>
          {replyBody.split('\n\n').map((paragraph, index) => (
            <View
              key={`${paragraph.slice(0, 20)}-${index}`}
              className={`reply-paragraph-block anim-fade-in-up anim-read-delay-${Math.min(index + 1, 10)}`}
            >
              <Text className='reply-paragraph'>{paragraph}</Text>
            </View>
          ))}
        </View>
      </LetterPaper>

      <ArcoCard tone='default' padding='lg' delay={2}>
        <SectionHeading
          eyebrow='回响反馈'
          title='告诉我们这封回响和你的感受是否贴近'
          description='你的反馈会影响后续写回风格，让它更接近你真正的记忆线索。'
        />
        <View className='mt-5 flex flex-wrap gap-2'>
          {FEEDBACK_OPTIONS.map((item) => (
            <ArcoTag
              key={item.value}
              active={reply.feedbackScore === item.value}
              onClick={() => void handleSaveFeedback(item.value)}
            >
              {item.label}
            </ArcoTag>
          ))}
        </View>
        <View className='mt-4 flex flex-col gap-3'>
          <Input
            className='field-control'
            maxlength={255}
            placeholder='可选：补充一句你希望它更贴近的点'
            placeholderStyle='color: #B5AB9C'
            value={feedbackReason}
            onInput={(event) => setFeedbackReason(event.detail.value)}
          />
          <ArcoButton
            variant='outline'
            loading={savingFeedback}
            disabled={!reply.feedbackScore && !feedbackReason.trim()}
            onClick={() => void handleSaveFeedbackReason()}
          >
            保存补充说明
          </ArcoButton>
        </View>
      </ArcoCard>

      <ArcoCard tone='muted' padding='lg' delay={3}>
        <SectionHeading
          eyebrow='纪念画片'
          title='把这封回响生成一张可保存的纪念明信片'
          description='这张图只用于纪念表达，不代表逝者真实影像。'
        />
        <View className='mt-5 flex flex-col gap-4'>
          <ArcoButton
            loading={generatingPostcard}
            onClick={() => void handleGeneratePostcard()}
          >
            {generatingPostcard ? '正在生成纪念画片…' : '生成纪念画片'}
          </ArcoButton>
          {postcardError ? (
            <Text className='text-caption text-terracotta'>{postcardError}</Text>
          ) : null}
          {postcardUrls.length > 0 ? (
            <View className='flex flex-col gap-3'>
              {postcardUrls.map((url) => (
                <Image
                  key={url}
                  mode='widthFix'
                  src={url}
                  style='width: 100%; border-radius: 16px; overflow: hidden;'
                  onClick={() =>
                    Taro.previewImage({
                      current: url,
                      urls: postcardUrls,
                    })
                  }
                />
              ))}
              <Text className='text-caption text-driftwood'>
                点击图片可预览或长按保存。
              </Text>
            </View>
          ) : null}
        </View>
      </ArcoCard>

    </PageShell>
  );
});

export default ReplyPage;
