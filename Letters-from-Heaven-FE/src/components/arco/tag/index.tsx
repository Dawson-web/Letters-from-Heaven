import type { ReactNode } from 'react';

import { Text, View } from '@tarojs/components';

import { cn } from '@/utils/cn';

interface ArcoTagProps {
  active?: boolean;
  children: ReactNode;
  onClick?: () => void;
}

/**
 * 标签胶囊
 * 36px 高，全圆角。未选中凹进去（linen 底），选中 stone 底 + 白色文字
 */
export function ArcoTag({ active, children, onClick }: ArcoTagProps) {
  return (
    <View
      className={cn(
        'flex items-center justify-center rounded-pill px-4',
        active
          ? 'bg-stone tag-select'
          : 'border border-linen-edge bg-linen',
      )}
      style={{ height: '36px' }}
      onClick={onClick}
    >
      <Text className={cn('text-caption', active ? 'text-white font-medium' : 'text-driftwood')}>
        {children}
      </Text>
    </View>
  );
}
