import { Text, View } from '@tarojs/components';
import Taro, { useDidShow } from '@tarojs/taro';
import { useState } from 'react';
import { observer } from 'mobx-react-lite';

import { ArcoButton } from '@/components/arco/button';
import { ArcoCard } from '@/components/arco/card';
import { LoadingState } from '@/components/arco/loading-state';
import { SectionHeading } from '@/components/arco/section-heading';
import { BoundaryConfirmSheet } from '@/components/auth/boundary-confirm-sheet';
import { PageShell } from '@/components/layout/page-shell';
import { fetchFeaturedLetter } from '@/services/discovery';
import { getErrorMessage } from '@/services/request';
import { useRootStore } from '@/stores/root-store';
import type { FeaturedLetterRecord } from '@/types/mail';
import { cn } from '@/utils/cn';

const HomePage = observer(() => {
  const { mailboxStore } = useRootStore();
  const hasEntryGate = !mailboxStore.boundaryAccepted;
  const [featuredLetter, setFeaturedLetter] = useState<FeaturedLetterRecord | null>(null);
  const [pickedOn, setPickedOn] = useState('');
  const [loadingFeatured, setLoadingFeatured] = useState(true);
  const [featuredError, setFeaturedError] = useState('');
  const featuredExcerpt = featuredLetter?.excerpt.replace(/\s+/g, ' ').trim() || '';

  const refreshFeaturedLetter = async () => {
    setLoadingFeatured(true);

    try {
      const result = await fetchFeaturedLetter();
      setFeaturedLetter(result.featuredLetter);
      setPickedOn(result.pickedOn);
      setFeaturedError('');
    } catch (error) {
      setFeaturedError(getErrorMessage(error));
      setFeaturedLetter(null);
      setPickedOn('');
    } finally {
      setLoadingFeatured(false);
    }
  };

  useDidShow(() => {
    void mailboxStore.refreshReplies();
    void refreshFeaturedLetter();
  });

  return (
    <PageShell
      className='home-page-shell'
      headerClassName='home-page-header'
      title='云端回信'
      subtitle='把没说完的话，先放在这里，慢慢来，也来得及。'
      hero={(
        <View className={cn('hero-poster anim-scale-in', hasEntryGate && 'opacity-50')}>
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

      <ArcoCard tone='emphasis' padding='lg' delay={2} className='daily-letter-card'>
        {loadingFeatured ? (
          <LoadingState
            text='正在挑选今天想读到的一封信…'
            className='daily-letter-loading'
          />
        ) : featuredLetter ? (
          <View className='daily-letter-shell'>
            <View className='daily-letter-copy'>
              <Text className='daily-letter-kicker'>今日共鸣</Text>
              <Text className='daily-letter-headline'>{featuredLetter.headline}</Text>
              <Text className='daily-letter-description'>
                一封经作者同意匿名收录的信，也许正好说中了你今天没说出口的话。
              </Text>
            </View>

            <View className='daily-letter-paper'>
              <View className='daily-letter-paper-head'>
                {pickedOn ? <Text className='daily-letter-date'>{pickedOn}</Text> : null}
              </View>
              <View className='daily-letter-paper-body'>
                <Text className='daily-letter-excerpt'>“{featuredExcerpt}”</Text>
              </View>
              <Text className='daily-letter-relation'>这是一封写给{featuredLetter.relation || '远方'}的信</Text>
            </View>

            <View className='daily-letter-actions'>
              <ArcoButton
                size='lg'
                onClick={() => void Taro.switchTab({ url: '/pages/write/index' })}
              >
                我也写一封
              </ArcoButton>
              <Text className='daily-letter-footnote'>
                每天会从愿意匿名收录的来信里，固定展示一段新的节选。
              </Text>
            </View>
          </View>
        ) : (
          <View className='daily-letter-empty'>
            <SectionHeading
              title='今日共鸣'
              description={
                featuredError
                  ? `推荐内容暂时没有加载出来：${featuredError}`
                  : '当有人愿意把一段想念匿名收录在这里，它就会出现在首页，陪陪下一个打开这只信箱的人。'
              }
            />
            <ArcoButton
              variant='outline'
              size='lg'
              onClick={() => void Taro.switchTab({ url: '/pages/write/index' })}
            >
              写下第一封匿名共鸣
            </ArcoButton>
          </View>
        )}
      </ArcoCard>
    </PageShell>
  );
});

export default HomePage;
