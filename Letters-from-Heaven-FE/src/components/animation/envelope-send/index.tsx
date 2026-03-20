import { useEffect, useRef, useState } from 'react';

import { Text, View } from '@tarojs/components';

import { LottiePlayer } from '@/components/animation/lottie-player';

interface EnvelopeSendProps {
  relation?: string;
  onComplete?: () => void;
}

/** 安全超时：如果 Lottie 在此时间内未完成，自动降级并完成 */
const SAFETY_TIMEOUT_MS = 3500;
/** CSS 回退动画播放时长 */
const CSS_FALLBACK_DURATION_MS = 2500;

/**
 * 信封发送动画
 * Linen 底色遮罩，优先 Lottie，失败时降级为 CSS 动画
 */
export function EnvelopeSend({ relation, onComplete }: EnvelopeSendProps) {
  const [phase, setPhase] = useState<'playing' | 'done'>('playing');
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
    }, 500);
  };

  // 安全超时：无论 Lottie 是否成功，超时后自动完成
  useEffect(() => {
    const timer = setTimeout(() => {
      doComplete();
    }, SAFETY_TIMEOUT_MS);

    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Lottie 动画完成
  const handleAnimComplete = () => {
    doComplete();
  };

  // Lottie 加载失败 → 降级为 CSS 动画
  const handleAnimError = () => {
    setUseFallback(true);
    // CSS 回退动画播放完后自动完成
    setTimeout(() => {
      doComplete();
    }, CSS_FALLBACK_DURATION_MS);
  };

  return (
    <View
      className={`envelope-send-overlay ${phase === 'done' ? 'envelope-send-overlay--out' : ''}`}
    >
      <View className='envelope-send-content'>
        {/* Lottie 动画（未降级时显示） */}
        {!useFallback ? (
          <View className='envelope-send-lottie'>
            <LottiePlayer
              src='/assets/lottie/envelope-send.json'
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
          <View className='envelope-send-fallback-visible'>
            <View className='envelope-css-icon anim-fade-in'>
              <View className='envelope-icon-lg' />
            </View>
            <View className='envelope-css-fly'>
              <Text className='text-xl text-fog'>↑</Text>
            </View>
          </View>
        ) : null}

        <Text className='mt-8 block text-center text-body text-driftwood anim-fade-in anim-delay-2'>
          {relation ? `寄往${relation}的回响正在路上` : '信件正在飞往云端'}
        </Text>
      </View>
    </View>
  );
}
