import { Input, Picker, Text, Textarea, View } from '@tarojs/components';
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
import { AuthRequiredState } from '@/components/auth/auth-required-state';
import { PublicConsentSheet } from '@/components/mail/public-consent-sheet';
import { RELATION_OPTIONS } from '@/constants/relations';
import { PageShell } from '@/components/layout/page-shell';
import { getErrorMessage } from '@/services/request';
import { useRootStore } from '@/stores/root-store';

const CUSTOM_RELATION_STORAGE_KEY = 'yunduan-huixin-custom-relations';
const CUSTOM_RELATION_PICKER_ACTION = '+ 添加自定义称呼';
const SHOW_TEST_SEND_BUTTON = process.env.NODE_ENV !== 'production';

function normalizeRelationInput(value: string) {
  return value.replace(/\s+/g, ' ').trim();
}

function sanitizeCustomRelations(raw: unknown) {
  if (!Array.isArray(raw)) {
    return [];
  }

  const normalized = raw
    .filter((item): item is string => typeof item === 'string')
    .map((item) => normalizeRelationInput(item))
    .filter((item) => item.length > 0 && item.length <= 10);

  return Array.from(new Set(normalized)).slice(0, 20);
}

const WritePage = observer(() => {
  const { mailboxStore } = useRootStore();
  const [title, setTitle] = useState(mailboxStore.draft.title);
  const [body, setBody] = useState(mailboxStore.draft.body);
  const [relation, setRelation] = useState(mailboxStore.draft.relation);
  const [customRelations, setCustomRelations] = useState<string[]>([]);
  const [customRelationInput, setCustomRelationInput] = useState('');
  const [showCustomRelationInput, setShowCustomRelationInput] = useState(false);
  const [signature, setSignature] = useState(mailboxStore.draft.signature);
  const [sending, setSending] = useState(false);
  const [sendingMode, setSendingMode] = useState<'normal' | 'test' | null>(null);
  const [sendError, setSendError] = useState('');
  const [showSendAnim, setShowSendAnim] = useState(false);
  const [sendAnimationUnlocked, setSendAnimationUnlocked] = useState(false);
  const [pendingReplyId, setPendingReplyId] = useState('');
  const [showPublicConsentSheet, setShowPublicConsentSheet] = useState(false);
  const [pendingSendMode, setPendingSendMode] = useState<'normal' | 'test' | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      mailboxStore.saveDraft({ title, body, relation, signature });
    }, 600);

    return () => clearTimeout(timer);
  }, [body, mailboxStore, relation, signature, title]);

  useEffect(() => {
    const stored = sanitizeCustomRelations(Taro.getStorageSync(CUSTOM_RELATION_STORAGE_KEY));
    setCustomRelations(stored);
  }, []);

  const canSend = useMemo(() => {
    return mailboxStore.boundaryAccepted && body.trim().length >= 8 && Boolean(relation);
  }, [body, mailboxStore.boundaryAccepted, relation]);

  const relationOptions = useMemo(() => {
    const baseOptions = RELATION_OPTIONS.filter((item) => item !== '其他');
    const merged = [...baseOptions, ...customRelations];

    if (relation && !merged.includes(relation)) {
      merged.push(relation);
    }

    return Array.from(new Set(merged));
  }, [customRelations, relation]);

  const relationPickerOptions = useMemo(() => {
    return [...relationOptions, CUSTOM_RELATION_PICKER_ACTION];
  }, [relationOptions]);

  const selectedRelationIndex = useMemo(() => {
    const index = relationOptions.findIndex((item) => item === relation);
    return index >= 0 ? index : 0;
  }, [relation, relationOptions]);

  if (!mailboxStore.boundaryAccepted) {
    return (
      <PageShell
        stabilizeTransitions
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

  const handleSend = async (mode: 'normal' | 'test' = 'normal', publicConsent = false) => {
    if (!canSend || sending) {
      return;
    }

    setSendError('');
    setSending(true);
    setSendingMode(mode);
    setPendingReplyId('');
    setSendAnimationUnlocked(false);
    setShowSendAnim(true);

    try {
      const reply = await mailboxStore.sendLetter({
        title: title.trim(),
        body: body.trim(),
        relation,
        signature: signature.trim(),
        publicConsent,
      }, {
        testMode: mode === 'test',
      });

      setSending(false);
      setSendingMode(null);
      setPendingReplyId(reply.id);
      setSendAnimationUnlocked(true);
    } catch (error) {
      setSending(false);
      setSendingMode(null);
      setPendingReplyId('');
      setSendAnimationUnlocked(false);
      setShowSendAnim(false);
      setSendError(getErrorMessage(error));
      Taro.showToast({
        title: getErrorMessage(error),
        icon: 'none',
      });
    }
  };

  const handleRequestSend = (mode: 'normal' | 'test' = 'normal') => {
    if (!canSend || sending) {
      return;
    }

    setPendingSendMode(mode);
    setShowPublicConsentSheet(true);
  };

  const handleConfirmPublicConsent = (publicConsent: boolean) => {
    const nextMode = pendingSendMode || 'normal';
    setPendingSendMode(null);
    setShowPublicConsentSheet(false);
    void handleSend(nextMode, publicConsent);
  };

  const handleClosePublicConsentSheet = () => {
    setPendingSendMode(null);
    setShowPublicConsentSheet(false);
  };

  const handleSendAnimComplete = () => {
    const replyId = pendingReplyId;
    if (!replyId) {
      return;
    }

    setShowSendAnim(false);
    setSendAnimationUnlocked(false);
    setSending(false);
    setSendingMode(null);
    setPendingReplyId('');
    Taro.navigateTo({
      url: `/pages/sent/index?id=${replyId}`,
    });
  };

  const persistCustomRelations = (nextRelations: string[]) => {
    Taro.setStorageSync(CUSTOM_RELATION_STORAGE_KEY, nextRelations);
  };

  const handlePickRelation = (event: { detail: { value: string | number } }) => {
    const pickIndex = Number(event.detail.value);
    const picked = relationPickerOptions[pickIndex];

    if (!picked) {
      return;
    }

    if (picked === CUSTOM_RELATION_PICKER_ACTION) {
      setShowCustomRelationInput(true);
      return;
    }

    setRelation(picked);
    setShowCustomRelationInput(false);
    setCustomRelationInput('');
  };

  const handleAddCustomRelation = () => {
    const nextRelation = normalizeRelationInput(customRelationInput);

    if (!nextRelation) {
      Taro.showToast({
        title: '先输入一个称呼',
        icon: 'none',
      });
      return;
    }

    if (nextRelation.length > 10) {
      Taro.showToast({
        title: '称呼最多 10 个字',
        icon: 'none',
      });
      return;
    }

    if (!relationOptions.includes(nextRelation)) {
      const nextCustomRelations = [...customRelations, nextRelation];
      const deduped = Array.from(new Set(nextCustomRelations)).slice(0, 20);
      setCustomRelations(deduped);
      persistCustomRelations(deduped);
    }

    setRelation(nextRelation);
    setCustomRelationInput('');
    setShowCustomRelationInput(false);
  };

  const wordCount = body.trim().length;
  const wordMin = 8;
  const remaining = Math.max(wordMin - wordCount, 0);
  const bodyError = wordCount > 0 && wordCount < wordMin ? `还差 ${remaining} 个字，这封信就能慢慢寄出了。` : undefined;

  return (
    <PageShell
      stabilizeTransitions
      eyebrow='写给想念的人'
      title='写一封信'
      subtitle='不需要完整，也不用着急，把最先浮上来的那句话放在这里就好。'
      footer={(
        <View className='sticky-cta-stack'>
          <ArcoButton
            disabled={!canSend}
            loading={sending && sendingMode === 'normal'}
            onClick={() => handleRequestSend('normal')}
            className='w-full'
            size='lg'
          >
            {sending && sendingMode === 'normal' ? '正在把这封信送出去' : '把这封信轻轻寄出'}
          </ArcoButton>
          {SHOW_TEST_SEND_BUTTON ? (
            <ArcoButton
              variant='outline'
              disabled={!canSend}
              loading={sending && sendingMode === 'test'}
              onClick={() => handleRequestSend('test')}
              className='w-full'
              size='lg'
            >
              {sending && sendingMode === 'test' ? '测试投递中（90秒回信）' : '测试发送（90秒回信）'}
            </ArcoButton>
          ) : null}
          <Text className='text-center text-caption text-driftwood'>
            {wordCount < wordMin
              ? `再写 ${remaining} 个字，这封信就可以慢慢寄出了`
              : `已经写下 ${wordCount} 个字，想寄出的时候就寄出`}
          </Text>
          {SHOW_TEST_SEND_BUTTON ? (
            <Text className='text-center text-caption text-fog'>
              测试发送仅用于联调：回响会在 90 秒后送达。
            </Text>
          ) : null}
        </View>
      )}
    >
      {showSendAnim ? (
      <EnvelopeSend
        relation={relation || undefined}
        canExit={sendAnimationUnlocked}
        onComplete={handleSendAnimComplete}
      />
    ) : null}
      {showPublicConsentSheet ? (
        <PublicConsentSheet
          onConfirm={handleConfirmPublicConsent}
          onClose={handleClosePublicConsentSheet}
        />
      ) : null}

      <ArcoCard tone='emphasis' padding='lg' delay={1}>
        <SectionHeading
          eyebrow='写给谁'
          title='先想一想，你最想把这份想念放到谁的名字前'
          description='可以在下拉中选择，也可以添加一个你自己的称呼。'
        />
        <View className='relation-select-block mt-5'>
          <Picker mode='selector' range={relationPickerOptions} value={selectedRelationIndex} onChange={handlePickRelation}>
            <View className='relation-select-trigger btn-press'>
              <Text className={`relation-select-value ${relation ? '' : 'text-fog'}`}>
                {relation || '请选择一个称呼'}
              </Text>
              <Text className='relation-select-caret'>选择</Text>
            </View>
          </Picker>

          <View className='relation-select-helper'>
            <Text className='text-caption text-driftwood'>没有合适的称呼？可以自己添加一个。</Text>
            <ArcoButton variant='text' size='sm' onClick={() => setShowCustomRelationInput((prev) => !prev)}>
              {showCustomRelationInput ? '收起添加' : '添加称呼'}
            </ArcoButton>
          </View>

          {showCustomRelationInput ? (
            <View className='relation-custom-row anim-fade-in-up'>
              <Input
                className='field-control relation-custom-input'
                placeholder='比如：舅舅、师父、姐姐'
                placeholderStyle='color: #B5AB9C'
                value={customRelationInput}
                maxlength={10}
                onInput={(event) => setCustomRelationInput(event.detail.value)}
              />
              <ArcoButton variant='outline' size='sm' onClick={handleAddCustomRelation}>
                保存称呼
              </ArcoButton>
            </View>
          ) : null}
        </View>
      </ArcoCard>

      <LetterPaper variant='hero' className='letter-paper--form'>
        <FormField
          label='开头'
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
          label='正文'
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
          label='署名'
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
