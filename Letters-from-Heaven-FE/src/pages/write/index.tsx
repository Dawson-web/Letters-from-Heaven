import { Input, Text, Textarea, View } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useEffect, useMemo, useState } from 'react';
import { observer } from 'mobx-react-lite';

import { EnvelopeSend } from '@/components/animation/envelope-send';
import { ArcoButton } from '@/components/arco/button';
import { ArcoCard } from '@/components/arco/card';
import { FormField } from '@/components/arco/form-field';
import { LetterPaper } from '@/components/arco/letter-paper';
import { ArcoNotice } from '@/components/arco/notice';
import { SectionHeading } from '@/components/arco/section-heading';
import { ArcoTag } from '@/components/arco/tag';
import { AuthRequiredState } from '@/components/auth/auth-required-state';
import { RELATION_OPTIONS } from '@/constants/relations';
import { PageShell } from '@/components/layout/page-shell';
import { getErrorMessage } from '@/services/request';
import { useRootStore } from '@/stores/root-store';

const WritePage = observer(() => {
  const { mailboxStore } = useRootStore();
  const [title, setTitle] = useState(mailboxStore.draft.title);
  const [body, setBody] = useState(mailboxStore.draft.body);
  const [relation, setRelation] = useState(mailboxStore.draft.relation);
  const [signature, setSignature] = useState(mailboxStore.draft.signature);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');
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

  if (!mailboxStore.boundaryAccepted) {
    return (
      <PageShell
        eyebrow='写给想念的人'
        title='写信'
        subtitle='写下之前，先确认一下这座信箱能陪你做到什么。'
      >
        <AuthRequiredState
          title='还没完成边界确认'
          description='先回到首页看看使用前说明，确认好边界后，再慢慢写下第一封信。'
          actionText='回到首页看看'
        />
      </PageShell>
    );
  }

  const handleSend = async () => {
    if (!canSend || sending) {
      return;
    }

    setSendError('');
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
      setSendError(getErrorMessage(error));
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
  const remaining = Math.max(wordMin - wordCount, 0);
  const bodyError = wordCount > 0 && wordCount < wordMin ? `还差 ${remaining} 个字，这封信就能慢慢寄出了。` : undefined;

  return (
    <PageShell
      eyebrow='写给想念的人'
      title='写一封信'
      subtitle='不需要完整，也不用着急，把最先浮上来的那句话放在这里就好。'
      footer={(
        <View className='sticky-cta-stack'>
          <ArcoButton disabled={!canSend} loading={sending} onClick={handleSend} className='w-full' size='lg'>
            {sending ? '正在把这封信送出去' : '把这封信轻轻寄出'}
          </ArcoButton>
          <Text className='text-center text-caption text-driftwood'>
            {wordCount < wordMin
              ? `再写 ${remaining} 个字，这封信就可以慢慢寄出了`
              : `已经写下 ${wordCount} 个字，想寄出的时候就寄出`}
          </Text>
        </View>
      )}
    >
      {showSendAnim ? (
        <EnvelopeSend
          relation={relation || undefined}
          onComplete={handleSendAnimComplete}
        />
      ) : null}

      <ArcoCard tone='emphasis' padding='lg' delay={1}>
        <SectionHeading
          eyebrow='写给谁'
          title='先想一想，你最想把这份想念放到谁的名字前'
          description='这会帮助回响更贴近你心里真正想说话的方向。'
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

      <ArcoNotice
        title='寄出之后，回响会自己慢慢写好'
        description='你不用再做什么。系统会顺着这封来信写回回应，并在约定的时刻把它送到你面前。'
      />

      <LetterPaper variant='hero' className='letter-paper--form'>
        <FormField
          label='这封信想叫什么'
          hint='可选。如果你愿意，可以给这份想念一个轻一点的开头。'
        >
          <Input
            className='field-control'
            placeholder='比如：还记得那年夏天'
            placeholderStyle='color: #B5AB9C'
            value={title}
            maxlength={32}
            onInput={(event) => setTitle(event.detail.value)}
          />
        </FormField>

        <FormField
          label='你此刻最想说的话'
          hint='不用工整，也不用完整。先把最先冒出来的那一句留在这里。'
          error={bodyError}
        >
          <Textarea
            className='field-control field-control--textarea'
            placeholder='想到哪一句，就先写哪一句，不用急着把它写得很周全。'
            placeholderStyle='color: #B5AB9C'
            value={body}
            maxlength={800}
            autoHeight
            onInput={(event) => setBody(event.detail.value)}
          />
        </FormField>

        <FormField
          label='你想留下的署名'
          hint='可选。可以写名字，也可以只留下一个你熟悉的称呼。'
        >
          <Input
            className='field-control'
            placeholder='你的署名，或一个你想留下的称呼'
            placeholderStyle='color: #B5AB9C'
            value={signature}
            maxlength={16}
            onInput={(event) => setSignature(event.detail.value)}
          />
        </FormField>

        <Text className='text-right text-overline text-driftwood'>{wordCount}/800</Text>
      </LetterPaper>

      <ArcoCard tone='muted' delay={2}>
        <SectionHeading
          eyebrow='写信的时候'
          title='像把话慢慢放下，而不是急着把它说清'
          description='越具体的记忆、场景和称呼，越容易让这封回响贴近你真正想念的人。'
        />
        <View className='mt-5 flex flex-col gap-3'>
          <Text className='text-body text-charcoal'>可以先写一个地点、一句常说的话，或者某个你总会想起的小细节。</Text>
          <Text className='text-body text-charcoal'>如果你现在只写得出短短几句，也没关系，先让这份想念有地方落下。</Text>
        </View>
      </ArcoCard>

      {sendError ? (
        <ArcoNotice
          tone='warning'
          title='这封信暂时没能寄出'
          description={sendError}
        />
      ) : null}
    </PageShell>
  );
});

export default WritePage;
