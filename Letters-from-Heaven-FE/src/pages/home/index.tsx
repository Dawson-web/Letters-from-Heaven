import { Text, View } from '@tarojs/components';
import Taro, { useDidShow } from '@tarojs/taro';
import { observer } from 'mobx-react-lite';

import { ArcoButton } from '@/components/arco/button';
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
      eyebrow='云端信箱'
      title='云端回信'
      subtitle='给想念的人留一封信，让那些没来得及说完的话，也有地方轻轻落下。'
      hero={(
        <View className={cn('hero-poster anim-scale-in', hasEntryGate && 'opacity-50')}>
          <View className='hero-poster-copy'>
            <Text className='hero-poster-kicker'>把想念轻轻放下</Text>
            <Text className='hero-poster-title'>这里不是催你回答的地方，而是一座愿意慢慢等你的邮局。</Text>
            <Text className='hero-poster-description'>
              那些没说完的话、反复想起的片段，都会先被安静接住，再在合适的时候送回你眼前。
            </Text>
            <View className='hero-poster-actions'>
              <ArcoButton
                size='lg'
                onClick={() => Taro.navigateTo({ url: '/pages/write/index' })}
              >
                写一封信
              </ArcoButton>
              <ArcoButton
                variant='outline'
                size='lg'
                onClick={() => Taro.navigateTo({ url: '/pages/inbox/index' })}
              >
                去看看有没有回响
              </ArcoButton>
            </View>
            <Text className='hero-poster-note'>
              如果你愿意，就先写一句最想说的话，剩下的，慢慢来。
            </Text>
          </View>

          <View className='hero-poster-visual anim-gentle-sway'>
            <View className='hero-route-line' />

            <View className='hero-postcard hero-postcard--slip'>
              <View className='hero-postcard-airline' />
              <View className='hero-postcard-dot hero-postcard-dot--left' />
              <View className='hero-postcard-dot hero-postcard-dot--right' />
            </View>

            <View className='hero-postcard hero-postcard--wide'>
              <View className='hero-postcard-title-line' />
              <View className='hero-postcard-copy'>
                <View className='hero-postcard-copy-line hero-postcard-copy-line--long' />
                <View className='hero-postcard-copy-line hero-postcard-copy-line--medium' />
                <View className='hero-postcard-copy-line hero-postcard-copy-line--short' />
              </View>
              <Text className='hero-postcard-signature'>想念会被接住</Text>
            </View>

            <View className='hero-postcard hero-postcard--note'>
              <View className='hero-postcard-note-line' />
              <View className='hero-postcard-note-line' />
              <View className='hero-postcard-note-line' />
              <View className='hero-postcard-note-line' />
              <View className='hero-postcard-note-line' />
              <View className='hero-postcard-note-line hero-postcard-note-line--short' />
            </View>

            <View className='hero-postmark hero-postmark--red'>
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
        </View>
      )}
    >
      {!mailboxStore.boundaryAccepted ? (
        <BoundaryConfirmSheet onConfirm={mailboxStore.acceptBoundary} />
      ) : null}
    </PageShell>
  );
});

export default HomePage;
