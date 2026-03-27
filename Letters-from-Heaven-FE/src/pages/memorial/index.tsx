import { Text, View } from '@tarojs/components';
import Taro, { useDidShow } from '@tarojs/taro';
import { observer } from 'mobx-react-lite';

import { ArcoButton } from '@/components/arco/button';
import { ArcoCard } from '@/components/arco/card';
import { ArcoEmpty } from '@/components/arco/empty';
import { SectionHeading } from '@/components/arco/section-heading';
import { PageShell } from '@/components/layout/page-shell';
import { useRootStore } from '@/stores/root-store';

const MemorialPage = observer(() => {
  const { memorialStore } = useRootStore();

  useDidShow(() => {
    void memorialStore.refreshOverview();
  });

  return (
    <PageShell
      eyebrow='纪念档案'
      title='把重要的人，安放进清楚又温柔的记忆里'
      subtitle='档案不是为了把回忆整理得完整，而是让后来每一次回响，都更靠近你真正记得的样子。'
      footer={(
        <View className='sticky-cta-stack'>
          <ArcoButton
            className='w-full'
            size='lg'
            onClick={() => Taro.navigateTo({ url: '/pages/memorial-edit/index' })}
          >
            新建一份纪念档案
          </ArcoButton>
          <Text className='text-center text-caption text-driftwood'>
            先写下一个称呼、一点线索和一个值得记住的日子，就已经很好。
          </Text>
        </View>
      )}
    >
      <ArcoCard tone='emphasis' padding='lg' delay={1}>
        <SectionHeading
          eyebrow='为什么留档'
          title='让想念有一条可以慢慢回望的线索'
          description='把称呼、记忆和纪念日放在一起，后来的回响才会更像从熟悉之处长出来。'
        />
      </ArcoCard>

      {memorialStore.profiles.length === 0 ? (
        <ArcoEmpty
          title='这里还没有纪念档案'
          description='等你愿意写下第一个名字和纪念日，这里就会慢慢有温度。'
          actionText='新建档案'
          onAction={() => Taro.navigateTo({ url: '/pages/memorial-edit/index' })}
        />
      ) : (
        memorialStore.profiles.map((profile, index) => (
          <ArcoCard
            key={profile.id}
            delay={Math.min(index + 2, 8)}
            tone='default'
            padding='lg'
            onClick={() =>
              Taro.navigateTo({ url: `/pages/memorial-edit/index?id=${profile.id}` })
            }
          >
            <View className='flex items-start justify-between gap-4'>
              <View className='flex-1'>
                <Text className='text-heading text-charcoal'>
                  {profile.displayName || profile.relation}
                </Text>
                <Text className='mt-2 block text-caption text-driftwood'>
                  {profile.displayName ? `关系：${profile.relation}` : '还没写下更具体的称呼'}
                </Text>
              </View>
              <View className='meta-chip'>{profile.relation}</View>
            </View>

            <View className='mt-4 flex flex-col gap-2'>
              <Text className='text-body text-charcoal'>
                记忆线索：{profile.keywords || '还没写下'}
              </Text>
              {profile.note ? (
                <Text className='line-clamp-2 text-caption text-driftwood'>补充记忆：{profile.note}</Text>
              ) : null}
              <Text className='text-caption text-driftwood'>时区：{profile.timezone}</Text>
            </View>

            <View className='divider-fade my-4' />

            <Text className='text-caption font-medium text-stone'>
              已留下 {memorialStore.eventsByProfile[profile.id]?.length || 0} 个纪念日，点开可以继续慢慢补充
            </Text>
          </ArcoCard>
        ))
      )}
    </PageShell>
  );
});

export default MemorialPage;
