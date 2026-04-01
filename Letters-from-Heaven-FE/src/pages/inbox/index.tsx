import { Input, Text, View } from '@tarojs/components';
import Taro, { useDidShow } from '@tarojs/taro';
import { useState } from 'react';
import { observer } from 'mobx-react-lite';

import { ArcoButton } from '@/components/arco/button';
import { ArcoCard } from '@/components/arco/card';
import { ArcoEmpty } from '@/components/arco/empty';
import { LoadingState } from '@/components/arco/loading-state';
import { ArcoNotice } from '@/components/arco/notice';
import { ArcoTag } from '@/components/arco/tag';
import { PageShell } from '@/components/layout/page-shell';
import { getErrorMessage } from '@/services/request';
import { useRootStore } from '@/stores/root-store';
import type { ReplyRecord } from '@/types/mail';
import { cn } from '@/utils/cn';
import { formatDateTime, formatRemaining } from '@/utils/time';

type StatusFilter = 'all' | 'ready' | 'waiting'
type ScopeFilter = 'active' | 'favorite' | 'archived'

const STATUS_FILTER_OPTIONS: Array<{ value: StatusFilter; label: string }> = [
  { value: 'all', label: '全部状态' },
  { value: 'ready', label: '只看已抵达' },
  { value: 'waiting', label: '只看路上' },
]

const SCOPE_FILTER_OPTIONS: Array<{ value: ScopeFilter; label: string }> = [
  { value: 'active', label: '常看信件' },
  { value: 'favorite', label: '收藏信件' },
  { value: 'archived', label: '归档信件' },
]

const InboxPage = observer(() => {
  const { mailboxStore, memorialStore } = useRootStore();
  const [editingReplyId, setEditingReplyId] = useState('');
  const [subjectDraft, setSubjectDraft] = useState('');
  const [savingReplyId, setSavingReplyId] = useState('');
  const [deletingReplyId, setDeletingReplyId] = useState('');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [scopeFilter, setScopeFilter] = useState<ScopeFilter>('active');

  useDidShow(() => {
    void mailboxStore.refreshReplies(true);
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
      case 'death_anniversary':
        return '忌日回响';
      default:
        return event.label || '纪念回响';
    }
  };

  const handleOpenReply = (replyId: string) => {
    const reply = mailboxStore.getReply(replyId);
    if (reply?.status === 'ready' && !reply.readAt) {
      void mailboxStore.markReplyRead(replyId, true);
    }

    Taro.navigateTo({
      url: `/pages/reply/index?id=${replyId}`,
    });
  };

  const handleToggleFavorite = async (reply: ReplyRecord) => {
    try {
      await mailboxStore.toggleReplyFavorite(reply.id, !Boolean(reply.favorite));
      Taro.showToast({ title: reply.favorite ? '已取消收藏' : '已加入收藏', icon: 'none' });
    } catch (error) {
      Taro.showToast({ title: getErrorMessage(error), icon: 'none' });
    }
  };

  const handleToggleArchived = async (reply: ReplyRecord) => {
    try {
      await mailboxStore.toggleReplyArchived(reply.id, !Boolean(reply.archived));
      Taro.showToast({ title: reply.archived ? '已移回常看' : '已放入归档', icon: 'none' });
    } catch (error) {
      Taro.showToast({ title: getErrorMessage(error), icon: 'none' });
    }
  };

  const handleToggleRead = async (reply: ReplyRecord) => {
    try {
      await mailboxStore.markReplyRead(reply.id, !Boolean(reply.readAt));
      Taro.showToast({ title: reply.readAt ? '已标记为未读' : '已标记为已读', icon: 'none' });
    } catch (error) {
      Taro.showToast({ title: getErrorMessage(error), icon: 'none' });
    }
  };

  const visibleReplies = mailboxStore.inboxItems.filter((reply) => {
    const keyword = searchKeyword.trim().toLowerCase();
    if (scopeFilter === 'favorite' && !reply.favorite) {
      return false;
    }

    if (scopeFilter === 'archived' && !reply.archived) {
      return false;
    }

    if (scopeFilter === 'active' && reply.archived) {
      return false;
    }

    if (statusFilter === 'ready' && reply.status !== 'ready') {
      return false;
    }

    if (statusFilter === 'waiting' && reply.status !== 'waiting') {
      return false;
    }

    if (!keyword) {
      return true;
    }

    const memorialLabel = reply.sourceType === 'memorial'
      ? getMemorialLabel(reply.memorialEventId)
      : '日常回响';
    return [reply.subject, reply.preview, reply.body, memorialLabel]
      .join(' ')
      .toLowerCase()
      .includes(keyword);
  });

  const handleStartRename = (reply: ReplyRecord) => {
    setEditingReplyId(reply.id);
    setSubjectDraft(reply.subject);
  };

  const handleCancelRename = () => {
    setEditingReplyId('');
    setSubjectDraft('');
    setSavingReplyId('');
  };

  const handleSaveRename = async (replyId: string) => {
    const nextSubject = subjectDraft.trim();
    if (!nextSubject) {
      Taro.showToast({ title: '标题不能为空', icon: 'none' });
      return;
    }

    setSavingReplyId(replyId);

    try {
      await mailboxStore.updateReplySubject(replyId, nextSubject);
      Taro.showToast({ title: '标题已经改好了', icon: 'none' });
      handleCancelRename();
    } catch (error) {
      Taro.showToast({ title: getErrorMessage(error), icon: 'none' });
    } finally {
      setSavingReplyId('');
    }
  };

  const handleDeleteReply = async (reply: ReplyRecord) => {
    const result = await Taro.showModal({
      title: '要删除这封回响吗',
      content: '删除后不能恢复，但原来的写信记录会继续保留。',
    });

    if (!result.confirm) {
      return;
    }

    setDeletingReplyId(reply.id);

    try {
      await mailboxStore.deleteReply(reply.id);
      if (editingReplyId === reply.id) {
        handleCancelRename();
      }
      Taro.showToast({ title: '这封回响已经移出收件箱', icon: 'none' });
    } catch (error) {
      Taro.showToast({ title: getErrorMessage(error), icon: 'none' });
    } finally {
      setDeletingReplyId('');
    }
  };

  const handleClearInbox = async () => {
    const result = await Taro.showModal({
      title: '要清空收件箱吗',
      content: '这会删除当前账号下的所有回响和信件记录，而且不能恢复。',
    });

    if (!result.confirm) {
      return;
    }

    try {
      await mailboxStore.clearInboxItems();
      handleCancelRename();
      Taro.showToast({ title: '收件箱已经清空', icon: 'none' });
    } catch (error) {
      Taro.showToast({ title: getErrorMessage(error), icon: 'none' });
    }
  };

  return (
    <PageShell
      eyebrow='等待打开的那一刻'
      title='收件箱'
      subtitle='这里收着已经到来的，也收着还在路上的回应。'
      meta={(
        <View className='page-shell-actions page-shell-actions--wrap'>
          <ArcoButton
            size='md'
            onClick={() => Taro.navigateTo({ url: '/pages/write/index' })}
          >
            新建一封信
          </ArcoButton>
          {mailboxStore.inboxItems.length > 0 ? (
            <ArcoButton
              variant='text'
              size='md'
              loading={mailboxStore.resetting}
              onClick={handleClearInbox}
            >
              清空收件箱
            </ArcoButton>
          ) : null}
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
          <ArcoButton variant='text' onClick={() => void mailboxStore.refreshReplies(true)}>
            再试着同步一次
          </ArcoButton>
        </View>
      ) : null}

      <ArcoCard tone='default' padding='md' delay={2}>
        <View className='flex flex-col gap-4'>
          <Input
            className='field-control'
            placeholder='搜索标题、正文或纪念类型'
            placeholderStyle='color: #B5AB9C'
            value={searchKeyword}
            onInput={(event) => setSearchKeyword(event.detail.value)}
          />
          <View className='flex flex-wrap gap-2'>
            {STATUS_FILTER_OPTIONS.map((item) => (
              <ArcoTag
                key={item.value}
                active={statusFilter === item.value}
                onClick={() => setStatusFilter(item.value)}
              >
                {item.label}
              </ArcoTag>
            ))}
          </View>
          <View className='flex flex-wrap gap-2'>
            {SCOPE_FILTER_OPTIONS.map((item) => (
              <ArcoTag
                key={item.value}
                active={scopeFilter === item.value}
                onClick={() => setScopeFilter(item.value)}
              >
                {item.label}
              </ArcoTag>
            ))}
          </View>
          <Text className='text-caption text-driftwood'>
            当前筛出 {visibleReplies.length} 封信
          </Text>
        </View>
      </ArcoCard>

      {mailboxStore.syncing && visibleReplies.length === 0 ? (
        <LoadingState text='正在替你看看有没有新的回响…' />
      ) : visibleReplies.length === 0 ? (
        <ArcoEmpty
          title='没有符合当前筛选的回响'
          description='你可以放宽筛选条件，或者去写一封新的信。'
          actionText='去写第一封信'
          onAction={() => Taro.navigateTo({ url: '/pages/write/index' })}
        />
      ) : (
        visibleReplies.map((reply, index) => {
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
          const isEditing = editingReplyId === reply.id;

          return (
            <ArcoCard
              key={reply.id}
              className={cn('inbox-mail-item', isReady ? 'inbox-mail-item--ready' : 'inbox-mail-item--waiting')}
              delay={Math.min(index + 2, 9)}
              tone={isReady ? 'default' : 'muted'}
              padding='md'
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
                    {reply.favorite ? (
                      <Text className='inbox-mail-chip'>已收藏</Text>
                    ) : null}
                    {reply.archived ? (
                      <Text className='inbox-mail-chip'>已归档</Text>
                    ) : null}
                    {reply.readAt ? (
                      <Text className='inbox-mail-chip'>已读</Text>
                    ) : (
                      <Text className='inbox-mail-chip'>未读</Text>
                    )}
                  </View>
                </View>

                <Text className='inbox-mail-preview line-clamp-3'>
                  {previewText}
                </Text>

                <View className='inbox-mail-footer'>
                  <View className='inbox-mail-footer-copy'>
                    <Text className='inbox-mail-action'>
                      {isReady ? '慢慢打开' : aiGenerated ? '再等等它' : '先让它写完'}
                    </Text>
                    <Text className='inbox-mail-hint'>
                      {isReady
                        ? '它已经到了，想看的时候就打开。'
                        : aiGenerated
                          ? `已经写好，可能会在${formatRemaining(reply.availableAt)}来到这里`
                          : `可能会在${formatRemaining(reply.availableAt)}来到这里`}
                    </Text>
                  </View>

                  <View className='inbox-mail-actions'>
                    <ArcoButton size='sm' onClick={() => handleOpenReply(reply.id)}>
                      {isReady ? '打开信件' : '查看进度'}
                    </ArcoButton>
                    <ArcoButton variant='text' size='sm' onClick={() => handleStartRename(reply)}>
                      改标题
                    </ArcoButton>
                    <ArcoButton variant='text' size='sm' onClick={() => void handleToggleRead(reply)}>
                      {reply.readAt ? '标为未读' : '标为已读'}
                    </ArcoButton>
                    <ArcoButton variant='text' size='sm' onClick={() => void handleToggleFavorite(reply)}>
                      {reply.favorite ? '取消收藏' : '收藏'}
                    </ArcoButton>
                    <ArcoButton variant='text' size='sm' onClick={() => void handleToggleArchived(reply)}>
                      {reply.archived ? '移出归档' : '归档'}
                    </ArcoButton>
                    <ArcoButton
                      variant='text'
                      size='sm'
                      className='text-terracotta'
                      loading={deletingReplyId === reply.id}
                      onClick={() => void handleDeleteReply(reply)}
                    >
                      删除
                    </ArcoButton>
                  </View>
                </View>

                {isEditing ? (
                  <View className='inbox-mail-editor'>
                    <Text className='inbox-mail-editor-label'>给这封回响换一个更好辨认的标题</Text>
                    <Input
                      className='field-control'
                      maxlength={64}
                      placeholder='例如：妈妈在生日这天的回响'
                      placeholderStyle='color: #B5AB9C'
                      value={subjectDraft}
                      onInput={(event) => setSubjectDraft(event.detail.value)}
                    />
                    <View className='inbox-mail-actions inbox-mail-actions--editor'>
                      <ArcoButton
                        size='sm'
                        loading={savingReplyId === reply.id}
                        onClick={() => void handleSaveRename(reply.id)}
                      >
                        存好标题
                      </ArcoButton>
                      <ArcoButton variant='text' size='sm' onClick={handleCancelRename}>
                        取消
                      </ArcoButton>
                    </View>
                  </View>
                ) : null}
              </View>
            </ArcoCard>
          );
        })
      )}
    </PageShell>
  );
});

export default InboxPage;
