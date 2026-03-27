import type { ReactNode } from 'react';

import { View } from '@tarojs/components';

import { cn } from '@/utils/cn';

interface LetterPaperProps {
  children: ReactNode;
  className?: string;
  variant?: 'default' | 'hero';
}

export function LetterPaper({
  children,
  className,
  variant = 'default',
}: LetterPaperProps) {
  return (
    <View className={cn('letter-paper', variant === 'hero' && 'letter-paper--hero', className)}>
      <View className={cn('letter-paper-inner', variant === 'hero' && 'letter-paper-inner--hero')}>
        {children}
      </View>
    </View>
  );
}
