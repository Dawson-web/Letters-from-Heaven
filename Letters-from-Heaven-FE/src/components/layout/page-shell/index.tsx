import type { ReactNode } from 'react';

import { Text, View } from '@tarojs/components';

import { cn } from '@/utils/cn';

interface PageShellProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  children: ReactNode;
  hero?: ReactNode;
  meta?: ReactNode;
  footer?: ReactNode;
  className?: string;
  headerClassName?: string;
  contentClassName?: string;
}

export function PageShell({
  eyebrow,
  title,
  subtitle,
  children,
  hero,
  meta,
  footer,
  className,
  headerClassName,
  contentClassName,
}: PageShellProps) {
  return (
    <View className={cn('page-shell', Boolean(footer) && 'page-shell--with-footer', className)}>
      <View className={cn('page-shell-header anim-fade-in-up', headerClassName)}>
        {eyebrow ? <Text className='page-shell-eyebrow'>{eyebrow}</Text> : null}
        <Text className='page-shell-title'>{title}</Text>
        {subtitle ? (
          <Text className='page-shell-subtitle anim-fade-in anim-delay-2'>
            {subtitle}
          </Text>
        ) : null}
        {meta ? <View className='page-shell-meta'>{meta}</View> : null}
        {hero ? <View className='page-shell-hero'>{hero}</View> : null}
      </View>

      <View className={cn('page-shell-content', contentClassName)}>
        {children}
      </View>

      {footer ? <View className='sticky-cta'>{footer}</View> : null}
    </View>
  );
}
