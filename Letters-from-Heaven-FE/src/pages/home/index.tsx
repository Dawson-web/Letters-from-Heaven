import { Text, View } from '@tarojs/components';
import Taro, { useDidShow } from '@tarojs/taro';
import { observer } from 'mobx-react-lite';

import { ArcoButton } from '@/components/arco/button';
import { ArcoCard } from '@/components/arco/card';
import { SectionHeading } from '@/components/arco/section-heading';
import { BoundaryConfirmSheet } from '@/components/auth/boundary-confirm-sheet';
import { PageShell } from '@/components/layout/page-shell';
import { useRootStore } from '@/stores/root-store';
import { cn } from '@/utils/cn';

const HOME_ENTRIES = [
  {
    title: '个人页面',
    badge: '我的',
    description: '查看信箱状态、边界提醒和整理操作。',
    url: '/pages/profile/index',
  },
  {
    title: '纪念档案',
    badge: '档案',
    description: '补充重要的人和纪念日，让回响更贴近记忆。',
    url: '/pages/memorial/index',
  },
  {
    title: '收件箱',
    badge: '回响',
    description: '查看已经到来的回应，或等等还在路上的信。',
    url: '/pages/inbox/index',
  },
  {
    title: '开始写信',
    badge: '写信',
    description: '把今天想说的话写下来，交给时间慢慢送达。',
    url: '/pages/write/index',
  },
] as const;

const HomePage = observer(() => {
  const { mailboxStore } = useRootStore();
  const hasEntryGate = !mailboxStore.boundaryAccepted;

  useDidShow(() => {
    void mailboxStore.refreshReplies();
  });

  return (
    <PageShell
      className='home-page-shell'
      headerClassName='home-page-header'
      title='云端回信'
      subtitle='把没说完的话，先放在这里，慢慢来，也来得及。'
      hero={(
        <View className={cn('hero-poster anim-scale-in', hasEntryGate && 'opacity-50')}>
          <View className='hero-poster-copy'>
            <View className='hero-poster-actions'>
              <ArcoButton
                size='lg'
                onClick={() => Taro.navigateTo({ url: '/pages/write/index' })}
              >
                开始写信
              </ArcoButton>
              <ArcoButton
                variant='outline'
                size='lg'
                onClick={() => Taro.navigateTo({ url: '/pages/inbox/index' })}
              >
                查看回响
              </ArcoButton>
            </View>
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

      <ArcoCard tone='muted' padding='lg' delay={2}>
        <SectionHeading
          eyebrow=''
          title=''
          description='把常用页面放在首页，省去来回翻找。'
        />
        <View className='home-entry-grid'>
          {HOME_ENTRIES.map((entry, index) => (
            <View
              key={entry.url}
              className={cn('home-entry-card btn-press', `anim-delay-${Math.min(index + 2, 9)}`)}
              onClick={() => Taro.navigateTo({ url: entry.url })}
            >
              <Text className='home-entry-badge'>{entry.badge}</Text>
              <Text className='home-entry-title'>{entry.title}</Text>
              <Text className='home-entry-description'>{entry.description}</Text>
            </View>
          ))}
        </View>
      </ArcoCard>
    </PageShell>
  );
});

export default HomePage;
