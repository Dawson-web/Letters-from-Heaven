import { Text, View } from '@tarojs/components';

import { ArcoButton } from '@/components/arco/button';

interface ArcoEmptyProps {
  title: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
}

/**
 * 空状态
 * 64px 线条信封图标（用 CSS border 模拟）+ 文字 + 文字链接
 */
export function ArcoEmpty({
  title,
  description,
  actionText,
  onAction,
}: ArcoEmptyProps) {
  return (
    <View className='px-6 py-16 text-center anim-fade-in-up'>
      {/* 线条信封图标 — 用 CSS 模拟 */}
      <View className='mb-6 flex items-center justify-center'>
        <View
          className='relative'
          style={{ width: '64px', height: '44px' }}
        >
          {/* 信封主体 */}
          <View
            style={{
              position: 'absolute',
              top: '8px',
              left: '0',
              right: '0',
              bottom: '0',
              borderRadius: '4px',
              border: '1.5px solid #C7C2BA',
            }}
          />
          {/* 信封封口三角 */}
          <View
            style={{
              position: 'absolute',
              top: '8px',
              left: '0',
              right: '0',
              height: '20px',
              borderLeft: '1.5px solid #C7C2BA',
              borderRight: '1.5px solid #C7C2BA',
              borderTop: '1.5px solid #C7C2BA',
              borderRadius: '4px 4px 0 0',
              clipPath: 'polygon(0 0, 50% 100%, 100% 0)',
            }}
          />
        </View>
      </View>
      <Text className='text-heading text-charcoal'>{title}</Text>
      <Text className='mt-3 block text-body text-driftwood'>
        {description}
      </Text>
      {actionText ? (
        <View className='mt-6'>
          <ArcoButton variant='text' onClick={onAction}>
            {actionText}
          </ArcoButton>
        </View>
      ) : null}
    </View>
  );
}
