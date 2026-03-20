import { Input, Text, Textarea, View } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useEffect, useMemo, useState } from 'react';
import { observer } from 'mobx-react-lite';

import { AnimatedView } from '@/components/animation/animated-view';
import { EnvelopeSend } from '@/components/animation/envelope-send';
import { ArcoButton } from '@/components/arco/button';
import { ArcoCard } from '@/components/arco/card';
import { ArcoEmpty } from '@/components/arco/empty';
import { ArcoTag } from '@/components/arco/tag';
import { AuthRequiredState } from '@/components/auth/auth-required-state';
import { LetterPaper } from '@/components/arco/letter-paper';
import { RELATION_OPTIONS } from '@/constants/relations';
import { PageShell } from '@/components/layout/page-shell';
import { getErrorMessage } from '@/services/request';
import { useRootStore } from '@/stores/root-store';

const WritePage = observer(() => {
  const { mailboxStore, userStore } = useRootStore();
  const [title, setTitle] = useState(mailboxStore.draft.title);
  const [body, setBody] = useState(mailboxStore.draft.body);
  const [relation, setRelation] = useState(mailboxStore.draft.relation);
  const [signature, setSignature] = useState(mailboxStore.draft.signature);
  const [sending, setSending] = useState(false);
  const [showSendAnim, setShowSendAnim] = useState(false);
  const [pendingReplyId, setPendingReplyId] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      mailboxStore.saveDraft({ title, body, relation, signature });
    }, 600);

    return () => clearTimeout(timer);
  }, [body, mailboxStore, relation, signature, title]);

  const canSend = useMemo(() => {
    return mailboxStore.boundaryAccepted && body.trim().length >= 8 && Boolean(relation);
  }, [body, mailboxStore.boundaryAccepted, relation]);

  if (!userStore.isAuthorized) {
    return (
      <PageShell
        title='写信'
        subtitle='开始写信前需要先完成微信授权。'
      >
        <AuthRequiredState description='请先回到首页，通过底部微信授权弹层进入后再开始写第一封信。' />
      </PageShell>
    );
  }

  if (!mailboxStore.boundaryAccepted) {
    return (
      <PageShell
        title='写信'
        subtitle='写信前需要先确认边界说明。'
      >
        <ArcoEmpty
          title='还没完成边界确认'
          description='请先回到首页确认使用说明，再开始写第一封信。'
          actionText='回到首页'
          onAction={() => Taro.reLaunch({ url: '/pages/home/index' })}
        />
      </PageShell>
    );
  }

  const handleSend = async () => {
    if (!canSend || sending) {
      return;
    }

    setSending(true);

    try {
      await new Promise((resolve) => setTimeout(resolve, 300));

      const reply = await mailboxStore.sendLetter({
        title: title.trim(),
        body: body.trim(),
        relation,
        signature: signature.trim(),
      });

      setPendingReplyId(reply.id);
      setShowSendAnim(true);
    } catch (error) {
      setSending(false);
      Taro.showToast({
        title: getErrorMessage(error),
        icon: 'none',
      });
    }
  };

  const handleSendAnimComplete = () => {
    setShowSendAnim(false);
    Taro.navigateTo({
      url: `/pages/sent/index?id=${pendingReplyId}`,
    });
  };

  const wordCount = body.trim().length;
  const wordMin = 8;

  return (
    <PageShell
      title='写一封信'
      subtitle='不必完整，写下此刻想说的就好。'
    >
      {/* 发送动画遮罩 */}
      {showSendAnim ? (
        <EnvelopeSend
          relation={relation || undefined}
          onComplete={handleSendAnimComplete}
        />
      ) : null}

      {/* 收信人关系选择 */}
      <ArcoCard delay={1}>
        <AnimatedView animation='fade-in-up'>
          <Text className='text-body font-semibold text-charcoal'>这封信写给</Text>
          <View className='mt-4 flex flex-wrap gap-2'>
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
        </AnimatedView>
      </ArcoCard>

      {/* 信纸区域 */}
      <AnimatedView animation='fade-in-up' delay={2}>
        <LetterPaper>
          <Input
            className='bg-transparent text-body text-charcoal'
            placeholder='比如：还记得那年夏天'
            placeholderStyle='color: #C7C2BA'
            value={title}
            maxlength={32}
            onInput={(event) => setTitle(event.detail.value)}
          />

          <View className='divider-fade my-4' />

          <Textarea
            className='h-64 w-full bg-transparent text-body leading-7 text-charcoal'
            placeholder='把今天最想说的话写下来，不必着急组织得很完整。'
            placeholderStyle='color: #C7C2BA'
            value={body}
            maxlength={800}
            autoHeight
            onInput={(event) => setBody(event.detail.value)}
          />

          <View className='divider-fade my-4' />

          <Input
            className='bg-transparent text-body text-charcoal'
            placeholder='你的署名（可选）'
            placeholderStyle='color: #C7C2BA'
            value={signature}
            maxlength={16}
            onInput={(event) => setSignature(event.detail.value)}
          />

          {/* 字数统计 */}
          <Text className='mt-4 block text-right text-overline text-fog'>
            {wordCount}/800
          </Text>
        </LetterPaper>
      </AnimatedView>

      {/* 发送按钮 */}
      <AnimatedView animation='fade-in-up' delay={3}>
        <ArcoButton disabled={!canSend} loading={sending} onClick={handleSend}>
          {sending ? '正在投递' : '投递到云端信箱'}
        </ArcoButton>
      </AnimatedView>

      {/* 字数提示 */}
      <AnimatedView animation='fade-in' delay={4}>
        <Text className='text-center text-caption text-fog'>
          {wordCount < wordMin
            ? `还需要写 ${wordMin - wordCount} 个字才能投递`
            : `已写 ${wordCount} 字，随时可以投递`}
        </Text>
      </AnimatedView>
    </PageShell>
  );
});

export default WritePage;
