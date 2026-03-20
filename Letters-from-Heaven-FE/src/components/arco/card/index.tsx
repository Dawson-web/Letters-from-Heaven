import type { ReactNode } from 'react';

import { View } from '@tarojs/components';

import { cn } from '@/utils/cn';

interface ArcoCardProps {
  className?: string;
  children: ReactNode;
  /** 入场动画延迟级别（1-10） */
  delay?: number;
  onClick?: () => void;
}

/**
 * 卡片容器
 * Parchment 底色，16px 圆角，暖色微弱阴影
 */
export function ArcoCard({ className, children, delay, onClick }: ArcoCardProps) {
  return (
    <View
      className={cn(
        'rounded-card border border-linen-edge bg-parchment p-6 shadow-card card-enter',
        delay ? `anim-delay-${delay}` : undefined,
        className,
      )}
      onClick={onClick}
    >
      {children}
    </View>
  );
}
