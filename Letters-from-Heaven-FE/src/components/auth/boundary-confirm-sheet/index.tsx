import { Text, View } from '@tarojs/components'

import { AnimatedView } from '@/components/animation/animated-view'
import { ArcoButton } from '@/components/arco/button'

interface BoundaryConfirmSheetProps {
  onConfirm: () => void
}

export function BoundaryConfirmSheet({ onConfirm }: BoundaryConfirmSheetProps) {
  return (
    <View className='boundary-confirm-gate'>
      <View className='boundary-confirm-mask' />

      <AnimatedView animation='fade-in-up' className='boundary-confirm-sheet'>
        <View className='boundary-confirm-handle' />

        <Text className='boundary-confirm-eyebrow'>开始之前</Text>
        <Text className='boundary-confirm-title'>这里会接住想念，但不会替代真实的人</Text>
        <Text className='boundary-confirm-copy'>
          这里的回响由 AI 生成，用来陪你把思念安放下来，不代表逝者真实态度，也不能还原真实关系。
        </Text>
        <Text className='boundary-confirm-copy'>
          体验版的回响大约会在 90 秒后抵达。之后也可以按纪念日、生日这些更从容的节奏送达。
        </Text>
        <Text className='boundary-confirm-note'>
          如果你正处在强烈哀伤或危机场景里，也请把真实的人和支持渠道放在更前面。
        </Text>

        <View className='mt-6'>
          <ArcoButton className='boundary-confirm-button' onClick={onConfirm}>
            我知道了，轻轻开始
          </ArcoButton>
        </View>
      </AnimatedView>
    </View>
  )
}
