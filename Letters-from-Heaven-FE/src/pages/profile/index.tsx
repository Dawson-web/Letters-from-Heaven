import { Image, Text, View } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useState } from 'react';
import { observer } from 'mobx-react-lite';

import { AnimatedView } from '@/components/animation/animated-view';
import { ArcoButton } from '@/components/arco/button';
import { ArcoCard } from '@/components/arco/card';
import { AuthRequiredState } from '@/components/auth/auth-required-state';
import { WechatAuthSheet } from '@/components/auth/wechat-auth-sheet';
import { ArcoNotice } from '@/components/arco/notice';
import { PageShell } from '@/components/layout/page-shell';
import { getErrorMessage } from '@/services/request';
import { useRootStore } from '@/stores/root-store';
import type { WechatAuthorizationDraft } from '@/types/user';

const ProfilePage = observer(() => {
  const { mailboxStore, userStore } = useRootStore();
  const [showAuthSheet, setShowAuthSheet] = useState(false);

  const handleClearDraft = () => {
    mailboxStore.clearDraft();
    Taro.showToast({ title: '草稿已清空', icon: 'none' });
  };

  const handleReset = () => {
    Taro.showModal({
      title: '清空信箱数据',
      content: '这会删除当前账号下的草稿、信件与回响记录，无法恢复。',
      success: (result) => {
        if (result.confirm) {
          void mailboxStore
            .resetAll()
            .then(() => {
              Taro.showToast({ title: '已清空', icon: 'none' });
            })
            .catch((error) => {
              Taro.showToast({
                title: getErrorMessage(error),
                icon: 'none',
              });
            });
        }
      },
    });
  };

  const handleAuthorize = async (payload: WechatAuthorizationDraft) => {
    try {
      await userStore.authorizeProfile(payload);
      setShowAuthSheet(false);
      Taro.showToast({ title: '资料已更新', icon: 'none' });
    } catch (error) {
      Taro.showToast({
        title: getErrorMessage(error),
        icon: 'none',
      });
    }
  };

  if (!userStore.isAuthorized) {
    return (
      <PageShell
        title='我的'
        subtitle='完成微信授权后，才能查看账号资料和信箱管理。'
      >
        <AuthRequiredState />
      </PageShell>
    );
  }

  return (
    <PageShell
      title='我的'
      subtitle='信箱统计与数据管理。'
    >
      <ArcoCard delay={1}>
        <AnimatedView animation='fade-in-up'>
          <Text className='text-heading text-charcoal'>微信资料</Text>
          {userStore.isAuthorized ? (
            <View className='mt-5 flex items-center gap-4'>
              <Image
                className='wechat-profile-avatar'
                mode='aspectFill'
                src={userStore.profile?.avatarUrl || ''}
              />
              <View className='flex-1'>
                <Text className='block text-body font-semibold text-charcoal'>
                  {userStore.profile?.displayName}
                </Text>
                <Text className='mt-1 block text-caption text-fog'>
                  已完成微信授权，可随时重新选择头像和昵称
                </Text>
              </View>
            </View>
          ) : (
            <Text className='mt-3 block text-body text-driftwood'>
              你还没有完成微信授权。
            </Text>
          )}
        </AnimatedView>
      </ArcoCard>

      <AnimatedView animation='fade-in-up' delay={2}>
        <ArcoButton loading={userStore.authorizing} onClick={() => setShowAuthSheet(true)}>
          重新填写头像昵称
        </ArcoButton>
      </AnimatedView>

      {/* 信箱统计 */}
      <ArcoCard delay={2}>
        <AnimatedView animation='fade-in-up'>
          <Text className='text-heading text-charcoal'>当前信箱</Text>
        </AnimatedView>
        <View className='mt-5 flex'>
          <AnimatedView animation='fade-in-up' delay={3} className='flex-1 p-4 text-center'>
            <Text className='text-overline text-fog'>信件数</Text>
            <Text className='mt-2 block text-display text-charcoal stat-number'>
              {mailboxStore.letters.length}
            </Text>
          </AnimatedView>

          <View className='w-px bg-linen-edge' />

          <AnimatedView animation='fade-in-up' delay={4} className='flex-1 p-4 text-center'>
            <Text className='text-overline text-fog'>草稿</Text>
            <Text className='mt-2 block text-display text-charcoal stat-number'>
              {mailboxStore.draft.body ? '1' : '0'}
            </Text>
          </AnimatedView>
        </View>
      </ArcoCard>

      {/* 体验边界 */}
      <ArcoCard delay={3}>
        <ArcoNotice
          title='体验边界'
          description='回信由 AI 生成，只用于情绪承接与纪念表达。它不代表逝者真实态度，也不建议在强烈哀伤或危机场景中作为唯一支持渠道。'
        />
      </ArcoCard>

      {/* 分割线 */}
      <View className='divider-fade' />

      {/* 操作链接 */}
      <AnimatedView animation='fade-in-up' delay={4}>
        <ArcoButton variant='text' onClick={handleClearDraft}>
          清空当前草稿
        </ArcoButton>
      </AnimatedView>
      <AnimatedView animation='fade-in-up' delay={5}>
        <ArcoButton
          variant='text'
          className='text-terracotta'
          onClick={handleReset}
        >
          清空云端信箱
        </ArcoButton>
      </AnimatedView>

      {showAuthSheet ? (
        <WechatAuthSheet
          loading={userStore.authorizing}
          initialAvatarUrl={userStore.profile?.avatarUrl}
          initialNickName={userStore.profile?.displayName}
          onAuthorize={handleAuthorize}
          onReject={() => setShowAuthSheet(false)}
        />
      ) : null}
    </PageShell>
  );
});

export default ProfilePage;
