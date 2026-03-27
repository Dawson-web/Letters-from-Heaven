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
        subtitle='写信前需要先确认边界说明。'
      >
        <AuthRequiredState
          title='还没完成边界确认'
          description='请先回到首页完成使用前说明确认，再开始写第一封信。'
          actionText='回到首页确认'
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
  const bodyError = wordCount > 0 && wordCount < wordMin ? `还需要 ${remaining} 个字才能投递。` : undefined;

  return (
    <PageShell
      eyebrow='写给想念的人'
      title='写一封信'
      subtitle='不必完整，写下此刻想说的就好。'
      footer={(
        <View className='sticky-cta-stack'>
          <ArcoButton disabled={!canSend} loading={sending} onClick={handleSend} className='w-full' size='lg'>
            {sending ? '正在投递' : '投递到云端信箱'}
          </ArcoButton>
          <Text className='text-center text-caption text-driftwood'>
            {wordCount < wordMin
              ? `还需要写 ${remaining} 个字才能投递`
              : `已写 ${wordCount} 字，随时可以投递`}
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
          eyebrow='收信方向'
          title='先决定，这封思念想朝谁的方向寄去'
          description='关系会影响回响的语气，也会帮助系统判断该如何承接你的文字。'
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

      <LetterPaper variant='hero' className='letter-paper--form'>
        <FormField
          label='信的标题'
          hint='可选。如果你愿意，可以用一句最轻的开场把这封信命名。'
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
          label='信的正文'
          hint='不需要工整，不需要完整。先写出最先冒出来的那一句。'
          error={bodyError}
        >
          <Textarea
            className='field-control field-control--textarea'
            placeholder='把今天最想说的话写下来，不必着急组织得很完整。'
            placeholderStyle='color: #B5AB9C'
            value={body}
            maxlength={800}
            autoHeight
            onInput={(event) => setBody(event.detail.value)}
          />
        </FormField>

        <FormField
          label='你的署名'
          hint='可选。也可以只留下此刻的心情，不必写名字。'
        >
          <Input
            className='field-control'
            placeholder='你的署名（可选）'
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
          eyebrow='写信提示'
          title='让它像一封家书，而不是一段追问'
          description='越具体的场景、称呼和记忆线索，越能让回响保持温柔且不空泛。'
        />
        <View className='mt-5 flex flex-col gap-3'>
          <Text className='text-body text-charcoal'>可以写一个地点、一句习惯的话，或者一个一直没说出口的问题。</Text>
          <Text className='text-body text-charcoal'>如果你只想写短短一段，也没关系，系统会尊重这份停顿感。</Text>
        </View>
      </ArcoCard>

      {sendError ? (
        <ArcoNotice
          tone='warning'
          title='投递失败'
          description={sendError}
        />
      ) : null}
    </PageShell>
  );
});

export default WritePage;
