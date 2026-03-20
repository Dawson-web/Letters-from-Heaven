import { Text, View } from '@tarojs/components';

interface ArcoNoticeProps {
  tone?: 'info' | 'warning';
  title: string;
  description: string;
}

/**
 * 通知提示
 * 左侧 3px 竖线 + 文案，不用 emoji
 */
export function ArcoNotice({
  tone = 'info',
  title,
  description,
}: ArcoNoticeProps) {
  const borderColor = tone === 'warning' ? 'border-l-terracotta' : 'border-l-stone';
  const bgColor = tone === 'warning' ? 'bg-[#FAF4EF]' : 'bg-parchment';

  return (
    <View
      className={`rounded-card border-l-[3px] ${borderColor} ${bgColor} p-5 anim-fade-in-up`}
    >
      <Text className='text-body font-semibold text-charcoal'>{title}</Text>
      <Text className='mt-2 block text-caption text-driftwood'>
        {description}
      </Text>
    </View>
  );
}
