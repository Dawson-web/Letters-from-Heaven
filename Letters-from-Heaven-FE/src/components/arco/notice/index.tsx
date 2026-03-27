import { Text, View } from '@tarojs/components';

interface ArcoNoticeProps {
  tone?: 'info' | 'warning';
  title: string;
  description: string;
}

export function ArcoNotice({
  tone = 'info',
  title,
  description,
}: ArcoNoticeProps) {
  return (
    <View className={`arco-notice ${tone === 'warning' ? 'arco-notice--warning' : 'arco-notice--info'} anim-fade-in-up`}>
      <Text className='text-body font-semibold text-charcoal'>{title}</Text>
      <Text className='mt-2 block text-caption text-driftwood'>
        {description}
      </Text>
    </View>
  );
}
