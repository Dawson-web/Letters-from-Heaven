import type { ReactNode } from 'react';

import { View } from '@tarojs/components';

import { cn } from '@/utils/cn';

interface ArcoButtonProps {
  className?: string;
  children: ReactNode;
  variant?: 'primary' | 'outline' | 'text';
  disabled?: boolean;
  loading?: boolean;
  onClick?: () => void;
}

const variantClasses: Record<NonNullable<ArcoButtonProps['variant']>, string> = {
  primary: 'bg-stone text-white',
  outline: 'border border-linen-edge bg-transparent text-stone',
  text: 'bg-transparent text-driftwood underline',
};

/**
 * 按钮
 * primary: Warm Stone 底色 + 白色文字
 * outline: 透明底 + linen-edge 描边
 * text: 纯文字链接风格
 */
export function ArcoButton({
  className,
  children,
  variant = 'primary',
  disabled,
  loading,
  onClick,
}: ArcoButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <View
      className={cn(
        'flex items-center justify-center rounded-2xl px-7 text-body font-medium btn-press',
        variant === 'text' ? 'h-auto py-2' : 'h-[52px]',
        variantClasses[variant],
        isDisabled && 'opacity-35',
        className,
      )}
      onClick={isDisabled ? undefined : onClick}
    >
      {loading ? (
        <View className='flex items-center gap-2'>
          <View className='h-3 w-3 rounded-full border-2 border-white/30 border-t-white anim-breathe' />
          {children}
        </View>
      ) : (
        children
      )}
    </View>
  );
}
