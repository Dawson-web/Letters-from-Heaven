import { Text, View } from '@tarojs/components';
import Taro, { useDidShow, useRouter } from '@tarojs/taro';
import { observer } from 'mobx-react-lite';

import { AnimatedView } from '@/components/animation/animated-view';
import { LottiePlayer } from '@/components/animation/lottie-player';
import { ArcoButton } from '@/components/arco/button';
import { ArcoCard } from '@/components/arco/card';
import { LoadingState } from '@/components/arco/loading-state';
import { PageShell } from '@/components/layout/page-shell';
import { useRootStore } from '@/stores/root-store';
import { formatRemaining } from '@/utils/time';

const SentPage = observer(() => {
  const { params } = useRouter();
  const { mailboxStore } = useRootStore();
  const reply = mailboxStore.getReply(params.id);

  useDidShow(() => {
    void mailboxStore.refreshReplyDetail(params.id);
  });

  if (mailboxStore.detailSyncing && !reply) {
    return (
      <PageShell
        title='信件已投递'
        subtitle='正在同步这封信的状态。'
      >
        <LoadingState text='正在获取投递状态…' />
      </PageShell>
    );
  }

  return (
    <PageShell
      title='信件已投递'
      subtitle='回响会在安静的延迟后抵达。'
    >
      {/* Lottie 信封漂浮 — 直接浮在底色上，无容器 */}
      <AnimatedView animation='scale-in' className='flex items-center justify-center py-4'>
        <View className='anim-float'>
          <LottiePlayer
            src='/assets/lottie/cloud-float.json'
            width={200}
            height={150}
            loop
            autoPlay
          />
        </View>
      </AnimatedView>

      {/* 三个分隔点 */}
      <View className='divider-dots'>
        <View className='divider-dot' />
        <View className='divider-dot' />
        <View className='divider-dot' />
      </View>

      {/* 预计抵达 */}
      <AnimatedView animation='fade-in-up' delay={2}>
        <ArcoCard>
          <Text className='text-overline text-driftwood'>预计抵达</Text>
          <Text className='mt-3 block text-heading text-charcoal'>
            {reply ? formatRemaining(reply.availableAt) : '请稍后去收件箱查看'}
          </Text>
          <Text className='mt-3 block text-caption text-driftwood'>
            体验版默认采用 90 秒延迟，方便你快速感受完整链路。正式版可以切换成清明、忌日、生日等更有仪式感的送达时间。
          </Text>
        </ArcoCard>
      </AnimatedView>

      <AnimatedView animation='fade-in-up' delay={3}>
        <ArcoButton onClick={() => Taro.redirectTo({ url: '/pages/inbox/index' })}>
          去收件箱等待
        </ArcoButton>
      </AnimatedView>

      <AnimatedView animation='fade-in' delay={4}>
        <ArcoButton
          variant='text'
          onClick={() => Taro.redirectTo({ url: '/pages/write/index' })}
        >
          再写一封
        </ArcoButton>
      </AnimatedView>
    </PageShell>
  );
});

export default SentPage;
