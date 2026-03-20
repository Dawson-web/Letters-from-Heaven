import { Text, View } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { observer } from 'mobx-react-lite';

import { AnimatedView } from '@/components/animation/animated-view';
import { ArcoButton } from '@/components/arco/button';
import { ArcoCard } from '@/components/arco/card';
import { ArcoNotice } from '@/components/arco/notice';
import { PageShell } from '@/components/layout/page-shell';
import { useRootStore } from '@/stores/root-store';

const ProfilePage = observer(() => {
  const { mailboxStore } = useRootStore();

  const handleClearDraft = () => {
    mailboxStore.clearDraft();
    Taro.showToast({ title: '草稿已清空', icon: 'none' });
  };

  const handleReset = () => {
    Taro.showModal({
      title: '清空本机数据',
      content: '这会删除当前设备上的草稿和回信记录，无法恢复。',
      success(result) {
        if (result.confirm) {
          mailboxStore.resetAll();
          Taro.showToast({ title: '已清空', icon: 'none' });
        }
      },
    });
  };

  return (
    <PageShell
      title='我的'
      subtitle='信箱统计与数据管理。'
    >
      {/* 信箱统计 */}
      <ArcoCard delay={1}>
        <AnimatedView animation='fade-in-up'>
          <Text className='text-heading text-charcoal'>本机信箱</Text>
        </AnimatedView>
        <View className='mt-5 flex'>
          <AnimatedView animation='fade-in-up' delay={2} className='flex-1 p-4 text-center'>
            <Text className='text-overline text-fog'>信件数</Text>
            <Text className='mt-2 block text-display text-charcoal stat-number'>
              {mailboxStore.letters.length}
            </Text>
          </AnimatedView>

          <View className='w-px bg-linen-edge' />

          <AnimatedView animation='fade-in-up' delay={3} className='flex-1 p-4 text-center'>
            <Text className='text-overline text-fog'>草稿</Text>
            <Text className='mt-2 block text-display text-charcoal stat-number'>
              {mailboxStore.draft.body ? '1' : '0'}
            </Text>
          </AnimatedView>
        </View>
      </ArcoCard>

      {/* 体验边界 */}
      <ArcoCard delay={2}>
        <ArcoNotice
          title='体验边界'
          description='回信由 AI 生成，只用于情绪承接与纪念表达。它不代表逝者真实态度，也不建议在强烈哀伤或危机场景中作为唯一支持渠道。'
        />
      </ArcoCard>

      {/* 分割线 */}
      <View className='divider-fade' />

      {/* 操作链接 */}
      <AnimatedView animation='fade-in-up' delay={3}>
        <ArcoButton variant='text' onClick={handleClearDraft}>
          清空当前草稿
        </ArcoButton>
      </AnimatedView>
      <AnimatedView animation='fade-in-up' delay={4}>
        <ArcoButton
          variant='text'
          className='text-terracotta'
          onClick={handleReset}
        >
          清空本机信箱
        </ArcoButton>
      </AnimatedView>
    </PageShell>
  );
});

export default ProfilePage;
