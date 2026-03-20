import type { ReactNode } from 'react';

import { View } from '@tarojs/components';

import { cn } from '@/utils/cn';

interface LetterPaperProps {
  children: ReactNode;
  className?: string;
}

/**
 * 信纸质感容器
 * Parchment 底色 + 横线纹理 + 左侧装订留白
 */
export function LetterPaper({ children, className }: LetterPaperProps) {
  return (
    <View className={cn('letter-paper', className)}>
      <View className='letter-paper-inner'>
        {children}
      </View>
    </View>
  );
}
