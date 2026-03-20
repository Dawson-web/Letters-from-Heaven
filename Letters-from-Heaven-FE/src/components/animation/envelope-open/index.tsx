import { useEffect, useRef, useState } from 'react';

import { Text, View } from '@tarojs/components';

import { LottiePlayer } from '@/components/animation/lottie-player';

interface EnvelopeOpenProps {
  subject?: string;
  relation?: string;
  onComplete?: () => void;
}

/** opening 阶段安全超时 */
const SAFETY_TIMEOUT_MS = 3000;
/** CSS 回退动画播放时长 */
const CSS_FALLBACK_DURATION_MS = 2000;

/**
 * 开信动画
 * Linen 底色，居中信封图标 + 点击打开
 * 优先 Lottie，失败时降级 CSS 动画
 */
export function EnvelopeOpen({ subject, relation, onComplete }: EnvelopeOpenProps) {
  const [phase, setPhase] = useState<'cover' | 'opening' | 'done'>('cover');
  const [useFallback, setUseFallback] = useState(false);
  const completedRef = useRef(false);

  const doComplete = () => {
    if (completedRef.current) {
      return;
    }
    completedRef.current = true;
    setPhase('done');
    setTimeout(() => {
      onComplete?.();
    }, 300);
  };

  const handleTap = () => {
    if (phase === 'cover') {
      setPhase('opening');
    }
  };

  // opening 阶段安全超时
  useEffect(() => {
    if (phase !== 'opening') {
      return;
    }

    const timer = setTimeout(() => {
      doComplete();
    }, SAFETY_TIMEOUT_MS);

    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const handleAnimComplete = () => {
    doComplete();
  };

  const handleAnimError = () => {
    setUseFallback(true);
    setTimeout(() => {
      doComplete();
    }, CSS_FALLBACK_DURATION_MS);
  };

  if (phase === 'done') {
    return null;
  }

  return (
    <View className='envelope-open-overlay' onClick={handleTap}>
      {phase === 'cover' ? (
        <View className='envelope-open-cover anim-scale-in'>
          {/* 线条信封图标 — CSS 模拟 */}
          <View className='envelope-cover-icon mb-8'>
            <View
              className='relative'
              style={{ width: '64px', height: '44px' }}
            >
              <View
                style={{
                  position: 'absolute',
                  top: '8px',
                  left: '0',
                  right: '0',
                  bottom: '0',
                  borderRadius: '4px',
                  border: '1.5px solid #9B958D',
                }}
              />
              <View
                style={{
                  position: 'absolute',
                  top: '8px',
                  left: '0',
                  right: '0',
                  height: '20px',
                  borderLeft: '1.5px solid #9B958D',
                  borderRight: '1.5px solid #9B958D',
                  borderTop: '1.5px solid #9B958D',
                  borderRadius: '4px 4px 0 0',
                  clipPath: 'polygon(0 0, 50% 100%, 100% 0)',
                }}
              />
            </View>
          </View>

          <Text className='block text-center text-heading text-charcoal'>
            {subject || '一封来自远方的回响'}
          </Text>
          {relation ? (
            <Text className='mt-3 block text-center text-body text-driftwood'>
              来自{relation}的方向
            </Text>
          ) : null}

          {/* 分隔点 */}
          <View className='divider-dots mt-6'>
            <View className='divider-dot' />
            <View className='divider-dot' />
            <View className='divider-dot' />
          </View>

          <Text className='block text-center text-caption text-fog anim-pulse-soft'>
            轻触打开
          </Text>
        </View>
      ) : (
        <View className='envelope-open-playing'>
          {/* Lottie 动画（未降级时显示） */}
          {!useFallback ? (
            <View className='envelope-open-lottie'>
              <LottiePlayer
                src='/assets/lottie/envelope-open.json'
                width={200}
                height={200}
                loop={false}
                autoPlay
                onComplete={handleAnimComplete}
                onError={handleAnimError}
              />
            </View>
          ) : null}

          {/* CSS 回退动画（降级时显示） */}
          {useFallback ? (
            <View className='envelope-open-css-fallback-visible'>
              <View className='envelope-css-open-anim'>
                <View className='envelope-icon-lg' />
              </View>
            </View>
          ) : null}

          <Text className='mt-6 block text-center text-body text-driftwood anim-fade-in anim-delay-3'>
            正在展开这封回响
          </Text>
        </View>
      )}
    </View>
  );
}
