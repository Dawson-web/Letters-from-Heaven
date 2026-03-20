import type { ReactNode } from 'react';

import { Text, View } from '@tarojs/components';

interface PageShellProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
}

/**
 * 页面外壳
 * 56px 顶部留白 + 左对齐标题 + 40px 标题到内容间距
 */
export function PageShell({ title, subtitle, children }: PageShellProps) {
  return (
    <View className='min-h-screen bg-linen px-6 pb-10 pt-14'>
      {/* 标题区 */}
      <View className='mb-10 anim-fade-in-up'>
        <Text className='text-display text-charcoal'>{title}</Text>
        {subtitle ? (
          <Text className='mt-3 block text-body text-driftwood anim-fade-in anim-delay-2'>
            {subtitle}
          </Text>
        ) : null}
      </View>

      {/* 内容区 */}
      <View className='flex flex-col gap-5'>{children}</View>
    </View>
  );
}
