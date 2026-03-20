import { Text, View } from '@tarojs/components';
import Taro, { useDidShow } from '@tarojs/taro';
import { observer } from 'mobx-react-lite';

import { AnimatedView } from '@/components/animation/animated-view';
import { ArcoButton } from '@/components/arco/button';
import { ArcoCard } from '@/components/arco/card';
import { ArcoNotice } from '@/components/arco/notice';
import { PageShell } from '@/components/layout/page-shell';
import { useRootStore } from '@/stores/root-store';

const HomePage = observer(() => {
  const { mailboxStore } = useRootStore();

  useDidShow(() => {
    void mailboxStore.refreshReplies();
  });

  return (
    <PageShell
      title='云端回信'
      subtitle='给想念的人留一封信，让回响隔着时间慢慢抵达。'
    >
      {/* 主入口卡片 */}
      <ArcoCard delay={1}>
        <AnimatedView animation='fade-in-up' delay={2}>
          <View className='flex items-start justify-between'>
            <View className='flex-1'>
              <Text className='text-body text-driftwood leading-7'>
                这里不是即时聊天，也不是逝者拟真工具。
              </Text>
              <Text className='letter-intro-highlight text-body leading-7'>
                只是一座安静的信箱，帮你把没说完的话写下来，再在一段延迟后收到一封温柔的回响。
              </Text>
            </View>
            {/* 信封线条图标 — 48px */}
            <View
              className='ml-4 flex-shrink-0'
              style={{ width: '48px', height: '34px', marginTop: '4px' }}
            >
              <View
                style={{
                  position: 'relative',
                  width: '48px',
                  height: '34px',
                }}
              >
                <View
                  style={{
                    position: 'absolute',
                    top: '6px',
                    left: '0',
                    right: '0',
                    bottom: '0',
                    borderRadius: '3px',
                    border: '1.5px solid #C7C2BA',
                  }}
                />
                <View
                  style={{
                    position: 'absolute',
                    top: '6px',
                    left: '0',
                    right: '0',
                    height: '15px',
                    borderLeft: '1.5px solid #C7C2BA',
                    borderRight: '1.5px solid #C7C2BA',
                    borderTop: '1.5px solid #C7C2BA',
                    borderRadius: '3px 3px 0 0',
                    clipPath: 'polygon(0 0, 50% 100%, 100% 0)',
                  }}
                />
              </View>
            </View>
          </View>
        </AnimatedView>

        <AnimatedView animation='fade-in-up' delay={4}>
          <View className='mt-6 flex gap-3'>
            <ArcoButton
              className='flex-1'
              onClick={() => Taro.navigateTo({ url: '/pages/write/index' })}
            >
              写第一封信
            </ArcoButton>
            <ArcoButton
              className='flex-1'
              variant='outline'
              onClick={() => Taro.navigateTo({ url: '/pages/inbox/index' })}
            >
              收件箱
            </ArcoButton>
          </View>
        </AnimatedView>
      </ArcoCard>

      {/* 边界确认 */}
      {!mailboxStore.boundaryAccepted ? (
        <ArcoCard delay={2}>
          <ArcoNotice
            tone='warning'
            title='使用前请先确认边界'
            description='回信由 AI 生成，用来承接情绪与记忆，不代表逝者真实意志。体验版回响会在约 90 秒后送达，正式版可切换到纪念日节奏。'
          />
          <View className='mt-5'>
            <ArcoButton onClick={mailboxStore.acceptBoundary}>
              我已知晓，开始体验
            </ArcoButton>
          </View>
        </ArcoCard>
      ) : null}

      {/* 信箱状态 */}
      <ArcoCard delay={3}>
        <AnimatedView animation='fade-in-up'>
          <Text className='text-heading text-charcoal'>当前信箱</Text>
        </AnimatedView>
        <View className='mt-5 flex'>
          {/* 已送达 */}
          <AnimatedView animation='fade-in-up' delay={4} className='flex-1 p-4'>
            <View className='flex items-center gap-2 mb-3'>
              <View className='dot-ready' />
              <Text className='text-overline text-fog'>已送达</Text>
            </View>
            <Text className='text-display text-charcoal stat-number'>
              {mailboxStore.readyCount}
            </Text>
          </AnimatedView>

          {/* 分隔竖线 */}
          <View className='w-px bg-linen-edge' />

          {/* 酝酿中 */}
          <AnimatedView animation='fade-in-up' delay={5} className='flex-1 p-4'>
            <View className='flex items-center gap-2 mb-3'>
              <View className='dot-waiting' />
              <Text className='text-overline text-fog'>酝酿中</Text>
            </View>
            <Text className='text-display text-charcoal stat-number'>
              {mailboxStore.waitingCount}
            </Text>
          </AnimatedView>
        </View>
      </ArcoCard>
    </PageShell>
  );
});

export default HomePage;
