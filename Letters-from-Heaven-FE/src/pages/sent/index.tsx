import { Text, View } from '@tarojs/components';
import Taro, { useDidShow, useRouter } from '@tarojs/taro';
import { observer } from 'mobx-react-lite';

import { LottiePlayer } from '@/components/animation/lottie-player';
import { ArcoButton } from '@/components/arco/button';
import { ArcoCard } from '@/components/arco/card';
import { LoadingState } from '@/components/arco/loading-state';
import { SectionHeading } from '@/components/arco/section-heading';
import { PageShell } from '@/components/layout/page-shell';
import { useRootStore } from '@/stores/root-store';
import { formatRemaining } from '@/utils/time';

const SentPage = observer(() => {
  const { params } = useRouter();
  const { mailboxStore } = useRootStore();
  const reply = mailboxStore.getReply(params.id);
  const hasGeneratedBody = Boolean(reply?.body?.trim());
  const aiGenerated = typeof reply?.aiGenerated === 'boolean'
    ? reply.aiGenerated
    : (reply ? (reply.status === 'ready' ? reply.preview === '你的来信已收到，回响已生成。' : hasGeneratedBody) : false);

  useDidShow(() => {
    void mailboxStore.refreshReplyDetail(params.id);
  });

  if (mailboxStore.detailSyncing && !reply) {
    return (
      <PageShell
        eyebrow='信件已投递'
        title='正在确认这封信的去向'
        subtitle='让系统把这封信安稳放上邮路。'
      >
        <LoadingState text='正在确认这封信已经启程…' />
      </PageShell>
    );
  }

  return (
    <PageShell
      eyebrow='信件已投递'
      title='接下来，交给时间慢慢带路'
      subtitle={aiGenerated
        ? '回响已经写好，只是在等那个适合你打开它的时刻。'
        : '这封信已经寄出，你不用守着它，回响会在合适的时候回来。'}
      footer={(
        <View className='sticky-cta-stack'>
          <ArcoButton
            className='w-full'
            size='lg'
            onClick={() => void Taro.switchTab({ url: '/pages/inbox/index' })}
          >
            去收件箱等等它
          </ArcoButton>
          <ArcoButton
            variant='text'
            onClick={() => void Taro.switchTab({ url: '/pages/write/index' })}
          >
            再写一封信
          </ArcoButton>
        </View>
      )}
    >
      <View className='hero-poster anim-scale-in'>
        <View className='hero-poster-copy'>
          <Text className='hero-poster-kicker'>已经寄出</Text>
          <Text className='hero-poster-title'>这封信已经轻轻离开你手边。</Text>
          <Text className='hero-poster-description'>
            {aiGenerated
              ? '回响已经写好，接下来只把“送达”这段路安静留给时间。'
              : '接下来的事，不必催促。让它像一封真正的来信一样，走一点路，再回来。'}
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
          eyebrow='大致会在'
          title={reply ? formatRemaining(reply.availableAt) : '请稍后去收件箱查看'}
          description={aiGenerated
            ? '回响已经写好，但它不会立刻出现，会按自己的节奏慢慢来到。'
            : '系统正在顺着你的来信慢慢写回这封回应，送达时间也会留一点自然的缓冲。'}
        />
      </ArcoCard>

    </PageShell>
  );
});

export default SentPage;
