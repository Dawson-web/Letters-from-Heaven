import type { ReactNode } from 'react';

import { Button, Text, View } from '@tarojs/components';
import Taro from '@tarojs/taro';

import { cn } from '@/utils/cn';

interface ArcoTagProps {
  active?: boolean;
  children: ReactNode;
  onClick?: () => void;
}

export function ArcoTag({ active, children, onClick }: ArcoTagProps) {
  const classes = cn(
    'arco-tag btn-press',
    active && 'arco-tag--active tag-select',
  );
  const content = (
    <Text className={cn('arco-tag-text', active ? 'text-white' : 'text-driftwood')}>
      {children}
    </Text>
  );

  if (Taro.getEnv() === Taro.ENV_TYPE.WEAPP) {
    return (
      <View className={classes} onClick={onClick}>
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
      onClick={onClick}
    >
      {content}
    </Button>
  );
}
