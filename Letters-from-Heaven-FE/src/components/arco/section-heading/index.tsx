import { Text, View } from '@tarojs/components';

import { cn } from '@/utils/cn';

interface SectionHeadingProps {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: 'left' | 'center';
  className?: string;
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = 'left',
  className,
}: SectionHeadingProps) {
  return (
    <View
      className={cn(
        'section-heading',
        align === 'center' && 'section-heading--center',
        className,
      )}
    >
      {eyebrow ? <Text className='section-heading-eyebrow'>{eyebrow}</Text> : null}
      <Text className='section-heading-title'>{title}</Text>
      {description ? <Text className='section-heading-description'>{description}</Text> : null}
    </View>
  );
}
