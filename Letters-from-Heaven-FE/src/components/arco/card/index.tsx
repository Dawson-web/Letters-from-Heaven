import type { ReactNode } from 'react';

import { View } from '@tarojs/components';

import { cn } from '@/utils/cn';

interface ArcoCardProps {
  className?: string;
  children: ReactNode;
  /** 入场动画延迟级别（1-10） */
  delay?: number;
  tone?: 'default' | 'emphasis' | 'muted' | 'danger';
  padding?: 'md' | 'lg';
  onClick?: () => void;
}

export function ArcoCard({
  className,
  children,
  delay,
  tone = 'default',
  padding = 'md',
  onClick,
}: ArcoCardProps) {
  const classes = cn(
    'card-enter',
    onClick ? 'arco-card arco-card-button btn-press' : 'arco-card',
    tone === 'default' && 'arco-card--default',
    tone === 'emphasis' && 'arco-card--emphasis',
    tone === 'muted' && 'arco-card--muted',
    tone === 'danger' && 'arco-card--danger',
    padding === 'md' ? 'arco-card--md' : 'arco-card--lg',
    delay ? `anim-delay-${delay}` : undefined,
    className,
  );

  if (onClick) {
    return (
      <View
        className={classes}
        onClick={onClick}
      >
        <View>{children}</View>
      </View>
    );
  }

  return (
    <View className={classes}>
      {children}
    </View>
  );
}
