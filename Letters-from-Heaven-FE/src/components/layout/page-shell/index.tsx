import type { ReactNode } from 'react';

import { Text, View } from '@tarojs/components';

interface PageShellProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
}

/**
 * 页面外壳
 * 56px 顶部留白 + 左对齐标题 + 40px 标题到内容间距
 */
export function PageShell({ title, subtitle, children, className, contentClassName }: PageShellProps) {
  return (
    <View className={`min-h-screen px-6 pb-10 pt-14 ${className ?? ''}`}>
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
      <View className={`flex flex-col gap-6 ${contentClassName ?? ''}`}>
        {children}
      </View>
    </View>
  );
}
