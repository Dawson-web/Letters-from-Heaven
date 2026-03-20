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
    <View className={cn('flex flex-col items-center justify-center py-12', className)}>
      <View className='w-full max-w-[520px]'>
        <View className='paper-skeleton'>
          <View className='paper-skeleton-bar long' />
          <View className='paper-skeleton-bar medium' />
          <View className='paper-skeleton-bar short' />
        </View>
      </View>
      <Text className='mt-5 text-caption text-driftwood'>{text}</Text>
    </View>
  );
}
