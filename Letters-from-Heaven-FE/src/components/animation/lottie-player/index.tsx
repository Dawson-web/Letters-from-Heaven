import { useEffect, useRef, useState } from 'react';

import { Canvas } from '@tarojs/components';
import Taro from '@tarojs/taro';

interface LottiePlayerProps {
  /** Lottie JSON 文件的路径（相对于小程序根目录） */
  src: string;
  /** 画布宽度 */
  width?: number;
  /** 画布高度 */
  height?: number;
  /** 是否循环播放 */
  loop?: boolean;
  /** 是否自动播放 */
  autoPlay?: boolean;
  /** 动画播放完毕回调 */
  onComplete?: () => void;
  /** 初始化失败回调 */
  onError?: () => void;
  /** 自定义类名 */
  className?: string;
}

let canvasCounter = 0;

export function LottiePlayer({
  src,
  width = 200,
  height = 200,
  loop = false,
  autoPlay = true,
  onComplete,
  onError,
  className = '',
}: LottiePlayerProps) {
  const [canvasId] = useState(() => `lottie-${++canvasCounter}-${Date.now()}`);
  const lottieRef = useRef<any>(null);
  const canvasRef = useRef<any>(null);

  useEffect(() => {
    let isMounted = true;

    const initLottie = () => {
      if (Taro.getEnv() !== Taro.ENV_TYPE.WEAPP) {
        onError?.();
        return;
      }

      try {
        // 动态引入 lottie-miniprogram
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const lottie = require('lottie-miniprogram');

        const query = Taro.createSelectorQuery();
        query
          .select(`#${canvasId}`)
          .node((res) => {
            if (!isMounted) {
              return;
            }

            if (!res || !res.node) {
              console.warn('[LottiePlayer] Canvas 节点未找到:', canvasId);
              onError?.();
              return;
            }

            try {
              const canvas = res.node;
              const context = canvas.getContext('2d');

              const dpr = Taro.getSystemInfoSync().pixelRatio || 2;
              canvas.width = width * dpr;
              canvas.height = height * dpr;
              context.scale(dpr, dpr);

              canvasRef.current = canvas;

              lottie.setup(canvas);

              const anim = lottie.loadAnimation({
                loop,
                autoplay: autoPlay,
                path: src,
                rendererSettings: {
                  context,
                },
              });

              lottieRef.current = anim;

              if (onComplete && anim) {
                anim.addEventListener('complete', () => {
                  if (isMounted) {
                    onComplete();
                  }
                });
              }
            } catch (innerError) {
              console.warn('[LottiePlayer] 动画加载失败:', innerError);
              if (isMounted) {
                onError?.();
              }
            }
          })
          .exec();
      } catch (error) {
        console.warn('[LottiePlayer] 初始化失败:', error);
        if (isMounted) {
          onError?.();
        }
      }
    };

    // 等一帧确保 canvas 节点已挂载
    const timer = setTimeout(initLottie, 200);

    return () => {
      isMounted = false;
      clearTimeout(timer);

      if (lottieRef.current) {
        try {
          lottieRef.current.destroy();
        } catch {
          // ignore
        }
        lottieRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src]);

  return (
    <Canvas
      type='2d'
      id={canvasId}
      className={className}
      style={{
        width: `${width}px`,
        height: `${height}px`,
      }}
    />
  );
}
