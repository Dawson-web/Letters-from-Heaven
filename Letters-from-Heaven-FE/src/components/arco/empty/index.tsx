import { Text, View } from '@tarojs/components';

import { ArcoButton } from '@/components/arco/button';

interface ArcoEmptyProps {
  title: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
}

export function ArcoEmpty({
  title,
  description,
  actionText,
  onAction,
}: ArcoEmptyProps) {
  return (
    <View className='empty-state anim-fade-in-up'>
      <View className='empty-state-illustration anim-gentle-sway'>
        <View className='empty-state-envelope' />
        <View className='empty-state-stamp'>POST</View>
      </View>

      <Text className='text-heading text-charcoal'>{title}</Text>
      <Text className='empty-state-copy text-body text-driftwood'>{description}</Text>

      {actionText ? (
        <View className='mt-2'>
          <ArcoButton variant='text' onClick={onAction}>
            {actionText}
          </ArcoButton>
        </View>
      ) : null}
    </View>
  );
}
