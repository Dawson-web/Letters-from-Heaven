import { Text, View } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import { observer } from 'mobx-react-lite'

import { AnimatedView } from '@/components/animation/animated-view'
import { ArcoButton } from '@/components/arco/button'
import { ArcoCard } from '@/components/arco/card'
import { ArcoEmpty } from '@/components/arco/empty'
import { PageShell } from '@/components/layout/page-shell'
import { useRootStore } from '@/stores/root-store'

const MemorialPage = observer(() => {
  const { memorialStore } = useRootStore()

  useDidShow(() => {
    void memorialStore.refreshOverview()
  })

  return (
    <PageShell
      title='纪念档案'
      subtitle='为重要的人留下清晰的记忆线索。'
    >
      {memorialStore.profiles.length === 0 ? (
        <ArcoEmpty
          title='还没有纪念档案'
          description='建立档案后，清明和纪念日会收到更多回响。'
          actionText='创建档案'
          onAction={() => Taro.navigateTo({ url: '/pages/memorial-edit/index' })}
        />
      ) : (
        memorialStore.profiles.map((profile, index) => (
          <ArcoCard key={profile.id} delay={Math.min(index + 1, 6)}>
            <AnimatedView animation='fade-in-up'>
              <View className='flex items-center justify-between gap-3'>
                <Text className='text-heading text-charcoal'>
                  {profile.displayName || profile.relation}
                </Text>
                <Text className='text-overline text-fog'>{profile.relation}</Text>
              </View>
              <Text className='mt-2 block text-caption text-driftwood'>
                关键词：{profile.keywords || '尚未填写'}
              </Text>
              <Text className='mt-1 block text-caption text-driftwood'>
                时区：{profile.timezone}
              </Text>
              <View className='mt-4 flex items-center gap-3'>
                <ArcoButton
                  variant='text'
                  onClick={() =>
                    Taro.navigateTo({ url: `/pages/memorial-edit/index?id=${profile.id}` })
                  }
                >
                  编辑档案
                </ArcoButton>
                <Text className='text-overline text-fog'>
                  纪念日 {memorialStore.eventsByProfile[profile.id]?.length || 0} 项
                </Text>
              </View>
            </AnimatedView>
          </ArcoCard>
        ))
      )}

      {memorialStore.profiles.length > 0 ? (
        <AnimatedView animation='fade-in-up' delay={6}>
          <ArcoButton
            onClick={() => Taro.navigateTo({ url: '/pages/memorial-edit/index' })}
          >
            新建纪念档案
          </ArcoButton>
        </AnimatedView>
      ) : null}
    </PageShell>
  )
})

export default MemorialPage
