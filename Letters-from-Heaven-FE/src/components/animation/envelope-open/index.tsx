import { useEffect, useRef, useState } from 'react';

import { Text, View } from '@tarojs/components';

import { ArcoButton } from '@/components/arco/button';

interface EnvelopeOpenProps {
  subject?: string;
  relation?: string;
  onComplete?: () => void;
}

const OPEN_SCENE_DURATION_MS = 2500;

export function EnvelopeOpen({ subject, relation, onComplete }: EnvelopeOpenProps) {
  const [phase, setPhase] = useState<'cover' | 'opening' | 'done'>('cover');
  const completedRef = useRef(false);

  const doComplete = () => {
    if (completedRef.current) {
      return;
    }

    completedRef.current = true;
    setPhase('done');
    setTimeout(() => {
      onComplete?.();
    }, 320);
  };

  const handleTap = () => {
    if (phase === 'cover') {
      setPhase('opening');
    }
  };

  useEffect(() => {
    if (phase !== 'opening') {
      return;
    }

    const timer = setTimeout(() => {
      doComplete();
    }, OPEN_SCENE_DURATION_MS);

    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  if (phase === 'done') {
    return null;
  }

  return (
    <View className='envelope-open-overlay'>
      {phase === 'cover' ? (
        <View className='envelope-open-cover anim-scale-in'>
          <View className='mail-open-scene mail-open-scene--cover'>
            <View className='mail-open-route' />

            <View className='mail-open-note' />

            <View className='mail-open-envelope-cover'>
              <View className='mail-open-paper-preview'>
                <View className='mail-open-paper-line mail-open-paper-line--long' />
                <View className='mail-open-paper-line mail-open-paper-line--medium' />
                <View className='mail-open-paper-line mail-open-paper-line--short' />
              </View>
              <View className='mail-open-envelope-body' />
              <View className='mail-open-envelope-flap' />
              <View className='mail-open-envelope-seal' />
            </View>

            <View className='hero-postmark hero-postmark--red mail-open-stamp'>
              <View className='hero-postmark-ring hero-postmark-ring--outer' />
              <View className='hero-postmark-ring hero-postmark-ring--inner' />
              <Text className='hero-postmark-top'>AIR MAIL</Text>
              <Text className='hero-postmark-center'>云端回信</Text>
              <Text className='hero-postmark-bottom'>OPEN LETTER</Text>
              <View className='hero-postmark-stars'>
                <View className='hero-postmark-star' />
                <View className='hero-postmark-star' />
                <View className='hero-postmark-star' />
                <View className='hero-postmark-star' />
              </View>
            </View>
          </View>

          <Text className='mail-scene-title'>{subject || '一封来自远方的回响'}</Text>
          {relation ? (
            <Text className='mail-scene-copy'>来自{relation}的方向，正等你亲手拆封。</Text>
          ) : (
            <Text className='mail-scene-copy'>像真正的来信一样，轻触拆封，再慢慢展开。</Text>
          )}

          <View className='divider-dots mt-6'>
            <View className='divider-dot' />
            <View className='divider-dot' />
            <View className='divider-dot' />
          </View>

          <View className='mt-2'>
            <ArcoButton variant='outline' size='sm' onClick={handleTap}>
              轻触拆封
            </ArcoButton>
          </View>
        </View>
      ) : (
        <View className='envelope-open-playing'>
          <View className='mail-open-scene mail-open-scene--opening'>
            <View className='mail-unseal-shadow' />
            <View className='mail-unseal-envelope'>
              <View className='mail-unseal-envelope-back' />

              <View className='mail-unseal-letter-wrap'>
                <View className='mail-unseal-letter'>
                  <Text className='mail-unseal-letter-title'>{subject || '这封回响正在展开'}</Text>
                  <View className='mail-unseal-letter-divider' />
                  <View className='mail-unseal-letter-line mail-unseal-letter-line--long' />
                  <View className='mail-unseal-letter-line mail-unseal-letter-line--long' />
                  <View className='mail-unseal-letter-line mail-unseal-letter-line--medium' />
                  <View className='mail-unseal-letter-line mail-unseal-letter-line--long' />
                </View>
              </View>

              <View className='mail-unseal-envelope-front' />
              <View className='mail-unseal-flap' />
              <View className='mail-unseal-seal' />
            </View>
          </View>

          <Text className='mail-scene-title'>正在拆封并展开这封回响</Text>
          <Text className='mail-scene-copy'>信纸会先被抽出，再慢慢铺开到你面前。</Text>
        </View>
      )}
    </View>
  );
}
