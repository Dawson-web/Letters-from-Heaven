import type { ReactNode } from 'react';

import { Text, View } from '@tarojs/components';

import { cn } from '@/utils/cn';

interface FormFieldProps {
  label: string;
  hint?: string;
  error?: string;
  className?: string;
  children: ReactNode;
}

export function FormField({
  label,
  hint,
  error,
  className,
  children,
}: FormFieldProps) {
  return (
    <View className={cn('field-shell', className)}>
      <View className='field-header'>
        <Text className='field-label'>{label}</Text>
        {hint ? <Text className='field-hint'>{hint}</Text> : null}
        {error ? <Text className='field-error'>{error}</Text> : null}
      </View>
      {children}
    </View>
  );
}
