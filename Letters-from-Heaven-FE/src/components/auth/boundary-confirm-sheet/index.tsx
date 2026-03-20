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

        <Text className='boundary-confirm-title'>使用前请先确认边界</Text>
        <Text className='boundary-confirm-copy'>
          回信由 AI 生成，只用于情绪承接与纪念表达，不代表逝者真实态度。
        </Text>
        <Text className='boundary-confirm-copy'>
          体验版回响会在约 90 秒后送达，正式版可切换到纪念日节奏。
        </Text>
        <Text className='boundary-confirm-note'>
          在强烈哀伤或危机场景中，它不应作为唯一支持渠道。
        </Text>

        <View className='mt-6'>
          <ArcoButton className='boundary-confirm-button' onClick={onConfirm}>
            我已知晓，开始体验
          </ArcoButton>
        </View>
      </AnimatedView>
    </View>
  )
}
