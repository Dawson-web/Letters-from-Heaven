import type { ReactNode } from 'react';

import { Button, Text, View } from '@tarojs/components';
import Taro from '@tarojs/taro';

import { cn } from '@/utils/cn';

interface ArcoButtonProps {
  className?: string;
  children: ReactNode;
  variant?: 'primary' | 'outline' | 'text';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  onClick?: () => void;
}

const variantClasses: Record<NonNullable<ArcoButtonProps['variant']>, string> = {
  primary: 'arco-button--primary',
  outline: 'arco-button--outline',
  text: 'arco-button--text',
};

const sizeClasses: Record<NonNullable<ArcoButtonProps['size']>, string> = {
  sm: 'arco-button--sm',
  md: 'arco-button--md',
  lg: 'arco-button--lg',
};

export function ArcoButton({
  className,
  children,
  variant = 'primary',
  size = 'md',
  disabled,
  loading,
  onClick,
}: ArcoButtonProps) {
  const isDisabled = disabled || loading;
  const content = loading ? (
    <View className='flex items-center gap-2'>
      <View className='h-3 w-3 rounded-full border-2 border-white/30 border-t-white anim-breathe' />
      <Text className='arco-button-label'>{children}</Text>
    </View>
  ) : (
    <Text className='arco-button-label'>{children}</Text>
  );
  const classes = cn(
    'arco-button btn-press',
    variantClasses[variant],
    sizeClasses[size],
    isDisabled && 'arco-button--disabled',
    className,
  );

  if (Taro.getEnv() === Taro.ENV_TYPE.WEAPP) {
    return (
      <View className={classes} onClick={isDisabled ? undefined : onClick}>
        {content}
      </View>
    );
  }

  return (
    <Button
      className={classes}
      hoverClass='none'
      hoverStartTime={0}
      hoverStayTime={0}
      onClick={isDisabled ? undefined : onClick}
    >
      {content}
    </Button>
  );
}
