import type { ReactNode } from 'react';

import { View } from '@tarojs/components';

import { cn } from '@/utils/cn';

type AnimationType =
  | 'fade-in'
  | 'fade-in-up'
  | 'fade-in-down'
  | 'slide-in-right'
  | 'scale-in'
  | 'scale-bounce'
  | 'float'
  | 'pulse-soft'
  | 'breathe'
  | 'gentle-sway'
  | 'letter-reveal';

interface AnimatedViewProps {
  /** 动画类型 */
  animation?: AnimationType;
  /** 延迟级别（1-10），用于 stagger 效果 */
  delay?: number;
  /** 自定义类名 */
  className?: string;
  /** 子元素 */
  children: ReactNode;
  /** 点击事件 */
  onClick?: () => void;
}

const animationMap: Record<AnimationType, string> = {
  'fade-in': 'anim-fade-in',
  'fade-in-up': 'anim-fade-in-up',
  'fade-in-down': 'anim-fade-in-down',
  'slide-in-right': 'anim-slide-in-right',
  'scale-in': 'anim-scale-in',
  'scale-bounce': 'anim-scale-bounce',
  'float': 'anim-float',
  'pulse-soft': 'anim-pulse-soft',
  'breathe': 'anim-breathe',
  'gentle-sway': 'anim-gentle-sway',
  'letter-reveal': 'anim-letter-reveal',
};

export function AnimatedView({
  animation = 'fade-in-up',
  delay,
  className,
  children,
  onClick,
}: AnimatedViewProps) {
  return (
    <View
      className={cn(
        animationMap[animation],
        delay ? `anim-delay-${delay}` : undefined,
        className,
      )}
      onClick={onClick}
    >
      {children}
    </View>
  );
}
