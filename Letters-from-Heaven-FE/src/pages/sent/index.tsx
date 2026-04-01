import { View } from '@tarojs/components';
import Taro, { useDidShow, useRouter } from '@tarojs/taro';
import { observer } from 'mobx-react-lite';

import { LottiePlayer } from '@/components/animation/lottie-player';
import { ArcoButton } from '@/components/arco/button';
import { LoadingState } from '@/components/arco/loading-state';
import { PageShell } from '@/components/layout/page-shell';
import { useRootStore } from '@/stores/root-store';

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

    </PageShell>
  );
});

export default SentPage;
