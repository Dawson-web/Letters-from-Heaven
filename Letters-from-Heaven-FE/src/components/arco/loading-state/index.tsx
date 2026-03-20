import { Text, View } from '@tarojs/components';

import { cn } from '@/utils/cn';

interface LoadingStateProps {
  text?: string;
  className?: string;
}

/**
 * 加载状态 — 三个脉冲小点
 */
export function LoadingState({
  text = '正在加载…',
  className,
}: LoadingStateProps) {
  return (
    <View className={cn('flex flex-col items-center justify-center py-16', className)}>
      <View className='flex gap-2'>
        <View className='h-1.5 w-1.5 rounded-full bg-fog anim-pulse-soft' />
        <View
          className='h-1.5 w-1.5 rounded-full bg-fog anim-pulse-soft'
          style={{ animationDelay: '0.2s' }}
        />
        <View
          className='h-1.5 w-1.5 rounded-full bg-fog anim-pulse-soft'
          style={{ animationDelay: '0.4s' }}
        />
      </View>
      <Text className='mt-4 text-caption text-fog'>{text}</Text>
    </View>
  );
}
