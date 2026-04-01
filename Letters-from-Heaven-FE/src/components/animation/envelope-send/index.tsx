import { useEffect, useRef, useState } from 'react';

import { Text, View } from '@tarojs/components';

interface EnvelopeSendProps {
  relation?: string;
  canExit?: boolean;
  onComplete?: () => void;
}

const SCENE_DURATION_MS = 3400;

export function EnvelopeSend({ relation, canExit = true, onComplete }: EnvelopeSendProps) {
  const [phase, setPhase] = useState<'playing' | 'holding' | 'done'>('playing');
  const completedRef = useRef(false);
  const sceneEndedRef = useRef(false);

  const doComplete = () => {
    if (completedRef.current) {
      return;
    }

    completedRef.current = true;
    setPhase('done');
    setTimeout(() => {
      onComplete?.();
    }, 420);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      sceneEndedRef.current = true;
      if (canExit) {
        doComplete();
        return;
      }

      setPhase('holding');
    }, SCENE_DURATION_MS);

    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (sceneEndedRef.current && canExit) {
      doComplete();
    }
  }, [canExit]);

  return (
    <View className={`envelope-send-overlay ${phase === 'done' ? 'envelope-send-overlay--out' : ''}`}>
      <View className='envelope-send-content'>
        <View className='mail-flight-scene'>
          <View className='mail-flight-route' />
          <View className='mail-flight-trail mail-flight-trail--one' />
          <View className='mail-flight-trail mail-flight-trail--two' />

          <View className='mail-origin-envelope'>
            <View className='mail-origin-envelope-paper' />
          </View>

          <View className='mail-dove-group'>
            <View className='mail-dove-shadow' />
            <View className='mail-dove'>
              <View className='mail-dove-wing mail-dove-wing--left' />
              <View className='mail-dove-wing mail-dove-wing--right' />
              <View className='mail-dove-tail' />
              <View className='mail-dove-body' />
              <View className='mail-dove-head' />
              <View className='mail-dove-beak' />
            </View>

            <View className='mail-dove-letter'>
              <View className='mail-dove-letter-flap' />
              <View className='mail-dove-letter-line mail-dove-letter-line--long' />
              <View className='mail-dove-letter-line mail-dove-letter-line--medium' />
            </View>
          </View>
        </View>

        <Text className='mail-scene-title'>
          {relation ? `写给${relation}的这封信，已经启程了` : '这封信，已经启程了'}
        </Text>
        <Text className='mail-scene-copy'>
          它会沿着这条安静的邮路慢慢远去，等回响准备好，再轻轻回到你面前。
        </Text>
      </View>
    </View>
  );
}
