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
      title='把重要的人留在清晰的记忆里'
      subtitle='档案不是资料堆砌，而是为了让后续的回响能更贴近你真实记得的那个人。'
      footer={(
        <View className='sticky-cta-stack'>
          <ArcoButton
            className='w-full'
            size='lg'
            onClick={() => Taro.navigateTo({ url: '/pages/memorial-edit/index' })}
          >
            新建纪念档案
          </ArcoButton>
          <Text className='text-center text-caption text-driftwood'>
            先从一个称呼、一组关键词和一个纪念日开始就够了。
          </Text>
        </View>
      )}
    >
      <ArcoCard tone='emphasis' padding='lg' delay={1}>
        <SectionHeading
          eyebrow='为什么要建档'
          title='让后续的纪念回响有更清晰的来处'
          description='档案会把关系、记忆线索和纪念日收拢成一条时间线，而不是散落在每封信里。'
        />
      </ArcoCard>

      {memorialStore.profiles.length === 0 ? (
        <ArcoEmpty
          title='还没有纪念档案'
          description='建立档案后，清明和纪念日的回响会更像是从熟悉的记忆里长出来。'
          actionText='创建档案'
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
                  {profile.displayName ? `关系：${profile.relation}` : '还没有填写具体称呼'}
                </Text>
              </View>
              <View className='meta-chip'>{profile.relation}</View>
            </View>

            <View className='mt-4 flex flex-col gap-2'>
              <Text className='text-body text-charcoal'>
                关键词：{profile.keywords || '尚未填写'}
              </Text>
              {profile.note ? (
                <Text className='line-clamp-2 text-caption text-driftwood'>备注：{profile.note}</Text>
              ) : null}
              <Text className='text-caption text-driftwood'>时区：{profile.timezone}</Text>
            </View>

            <View className='divider-fade my-4' />

            <Text className='text-caption font-medium text-stone'>
              纪念日 {memorialStore.eventsByProfile[profile.id]?.length || 0} 项，点击继续编辑
            </Text>
          </ArcoCard>
        ))
      )}
    </PageShell>
  );
});

export default MemorialPage;
