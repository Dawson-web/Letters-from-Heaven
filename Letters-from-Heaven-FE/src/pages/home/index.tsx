import { Text, View } from '@tarojs/components';
import Taro, { useDidShow } from '@tarojs/taro';
import { observer } from 'mobx-react-lite';

import { AnimatedView } from '@/components/animation/animated-view';
import { ArcoButton } from '@/components/arco/button';
import { ArcoCard } from '@/components/arco/card';
import { BoundaryConfirmSheet } from '@/components/auth/boundary-confirm-sheet';
import { PageShell } from '@/components/layout/page-shell';
import { useRootStore } from '@/stores/root-store';
import { cn } from '@/utils/cn';

const HomePage = observer(() => {
  const { mailboxStore } = useRootStore();
  const hasEntryGate = !mailboxStore.boundaryAccepted;

  useDidShow(() => {
    void mailboxStore.refreshReplies();
  });

  return (
    <PageShell
      title='云端回信'
      subtitle='给想念的人留一封信，让回响隔着时间慢慢抵达。'
      className='sticky-cta-safe'
    >
      <View className={cn('home-entry-content', hasEntryGate && 'home-entry-content-muted')}>
        <ArcoCard delay={1} className='card-primary'>
          <AnimatedView animation='fade-in-up' delay={1}>
            <View className='hero-illustration'>
              <View className='hero-illustration-stamp'>POST</View>
              <View className='hero-illustration-envelope' />
              <View className='hero-illustration-lines' />
            </View>
          </AnimatedView>

          <AnimatedView animation='fade-in-up' delay={2}>
            <View className='mt-6 text-center'>
              <Text className='text-overline text-driftwood'>把想念交给时间</Text>
              <Text className='mt-3 block text-body text-driftwood leading-7'>
                这里不是即时聊天，也不是逝者拟真工具。
              </Text>
              <Text className='mt-2 block letter-intro-highlight text-body leading-7'>
                它只接住那些没说完的话，并在一段安静的延迟后送回温柔回响。
              </Text>
            </View>
          </AnimatedView>

          <AnimatedView animation='fade-in-up' delay={3}>
            <View className='mt-6 flex items-center justify-center'>
              <ArcoButton
                variant='outline'
                onClick={() => Taro.navigateTo({ url: '/pages/inbox/index' })}
              >
                去收件箱看看
              </ArcoButton>
            </View>
          </AnimatedView>
        </ArcoCard>

        <ArcoCard delay={3}>
          <AnimatedView animation='fade-in-up'>
            <Text className='text-heading text-charcoal'>当前信箱</Text>
          </AnimatedView>
          <View className='mt-5 flex'>
            <AnimatedView animation='fade-in-up' delay={4} className='flex-1 p-4'>
              <View className='mb-3 flex items-center gap-2'>
                <View className='dot-ready' />
                <Text className='text-overline text-driftwood'>已送达</Text>
              </View>
              <Text className='text-display text-charcoal stat-number'>
                {mailboxStore.readyCount}
              </Text>
            </AnimatedView>

            <View className='w-px bg-linen-edge' />

            <AnimatedView animation='fade-in-up' delay={5} className='flex-1 p-4'>
              <View className='mb-3 flex items-center gap-2'>
                <View className='dot-waiting' />
                <Text className='text-overline text-driftwood'>酝酿中</Text>
              </View>
              <Text className='text-display text-charcoal stat-number'>
                {mailboxStore.waitingCount}
              </Text>
            </AnimatedView>
          </View>
        </ArcoCard>
      </View>

      <View className={cn('sticky-cta', hasEntryGate && 'home-entry-content-muted')}>
        <ArcoButton
          className='w-full'
          onClick={() => Taro.navigateTo({ url: '/pages/write/index' })}
        >
          写一封信
        </ArcoButton>
      </View>

      {!mailboxStore.boundaryAccepted ? (
        <BoundaryConfirmSheet onConfirm={mailboxStore.acceptBoundary} />
      ) : null}
    </PageShell>
  );
});

export default HomePage;
