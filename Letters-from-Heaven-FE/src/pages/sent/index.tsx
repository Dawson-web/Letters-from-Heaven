import { Text, View } from '@tarojs/components';
import Taro, { useDidShow, useRouter } from '@tarojs/taro';
import { observer } from 'mobx-react-lite';

import { LottiePlayer } from '@/components/animation/lottie-player';
import { ArcoButton } from '@/components/arco/button';
import { ArcoCard } from '@/components/arco/card';
import { LoadingState } from '@/components/arco/loading-state';
import { ArcoNotice } from '@/components/arco/notice';
import { SectionHeading } from '@/components/arco/section-heading';
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
        eyebrow='信件已投递'
        title='正在同步投递状态'
        subtitle='系统正在确认这封信抵达云端后的节奏。'
      >
        <LoadingState text='正在获取投递状态…' />
      </PageShell>
    );
  }

  return (
    <PageShell
      eyebrow='信件已投递'
      title='现在，交给时间'
      subtitle='回响会在安静的延迟后抵达。你不需要立刻得到回应。'
      footer={(
        <View className='sticky-cta-stack'>
          <ArcoButton
            className='w-full'
            size='lg'
            onClick={() => Taro.redirectTo({ url: '/pages/inbox/index' })}
          >
            去收件箱等待
          </ArcoButton>
          <ArcoButton
            variant='text'
            onClick={() => Taro.redirectTo({ url: '/pages/write/index' })}
          >
            再写一封
          </ArcoButton>
        </View>
      )}
    >
      <View className='hero-poster anim-scale-in'>
        <View className='hero-poster-copy'>
          <Text className='hero-poster-kicker'>投递完成</Text>
          <Text className='hero-poster-title'>这封信已经离开你的手边。</Text>
          <Text className='hero-poster-description'>
            接下来只剩等待。让它像一封真实书信一样，经过一点路程再回来。
          </Text>
        </View>

        <View className='mt-4 flex items-center justify-center py-4'>
          <View className='anim-float'>
            <LottiePlayer
              src='/assets/lottie/cloud-float.json'
              width={200}
              height={150}
              loop
              autoPlay
            />
          </View>
        </View>
      </View>

      <ArcoCard tone='emphasis' padding='lg' delay={1}>
        <SectionHeading
          eyebrow='预计抵达'
          title={reply ? formatRemaining(reply.availableAt) : '请稍后去收件箱查看'}
          description='体验版默认采用 90 秒延迟，正式版可以切换成清明、生日、周年等更有仪式感的送达时间。'
        />
      </ArcoCard>

      <ArcoNotice
        title='你现在可以离开一会儿'
        description='最好的体验通常不是守着倒计时，而是让这段等待自然发生。'
      />
    </PageShell>
  );
});

export default SentPage;
