import { Text, View } from '@tarojs/components'

import { AnimatedView } from '@/components/animation/animated-view'
import { ArcoButton } from '@/components/arco/button'

interface PublicConsentSheetProps {
  onConfirm: (publicConsent: boolean) => void
  onClose: () => void
}

export function PublicConsentSheet({ onConfirm, onClose }: PublicConsentSheetProps) {
  return (
    <View className='boundary-confirm-gate'>
      <View className='boundary-confirm-mask public-consent-sheet-mask' onClick={onClose} />

      <AnimatedView animation='fade-in-up' className='boundary-confirm-sheet public-consent-sheet'>
        <View className='boundary-confirm-handle' />
        <View className='public-consent-sheet-close btn-press' onClick={onClose}>
          <Text className='public-consent-sheet-close-icon'>×</Text>
        </View>

        <Text className='boundary-confirm-eyebrow'>寄出之前</Text>
        <Text className='boundary-confirm-title'>愿意让这封信，匿名陪陪别人吗</Text>
        <Text className='boundary-confirm-copy'>
          如果你愿意，我们可能会节选其中一段，以匿名方式收录到首页的“今日共鸣”，给同样正在想念的人一点陪伴。
        </Text>
        <Text className='boundary-confirm-note'>
          展示时不会显示你的署名。你也可以选择暂不收录，这封信仍会照常寄出。
        </Text>

        <View className='public-consent-sheet-actions'>
          <ArcoButton
            variant='outline'
            className='public-consent-sheet-button'
            onClick={() => onConfirm(false)}
          >
            暂不收录，直接寄出
          </ArcoButton>
          <ArcoButton
            className='public-consent-sheet-button'
            onClick={() => onConfirm(true)}
          >
            同意收录并寄出
          </ArcoButton>
        </View>
      </AnimatedView>
    </View>
  )
}
