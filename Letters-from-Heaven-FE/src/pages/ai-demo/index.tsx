import { Image, Text, Textarea, View } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useMemo, useRef, useState } from 'react';

import { ArcoButton } from '@/components/arco/button';
import { ArcoCard } from '@/components/arco/card';
import { FormField } from '@/components/arco/form-field';
import { ArcoNotice } from '@/components/arco/notice';
import { PageShell } from '@/components/layout/page-shell';
import {
  generateImageByCloudFunction,
  streamAiText,
  type GeneratedImage,
} from '@/services/ai';
import { getErrorMessage } from '@/services/request';

function getDisplayImageUrl(item: GeneratedImage) {
  return item.tempFileURL || item.originURL || '';
}

const AIDemoPage = () => {
  const [prompt, setPrompt] = useState('请写一段温柔、克制、带有书信感的回信。');
  const [streaming, setStreaming] = useState(false);
  const [textOutput, setTextOutput] = useState('');
  const [reasoningOutput, setReasoningOutput] = useState('');
  const [textError, setTextError] = useState('');
  const stopRef = useRef(false);

  const [imagePrompt, setImagePrompt] = useState('一封放在木桌上的旧信，暖色调，电影感');
  const [imageLoading, setImageLoading] = useState(false);
  const [images, setImages] = useState<GeneratedImage[]>([]);
  const [imageError, setImageError] = useState('');

  const canStream = useMemo(() => {
    return !streaming && prompt.trim().length > 0;
  }, [prompt, streaming]);

  const canGenerateImage = useMemo(() => {
    return !imageLoading && imagePrompt.trim().length > 0;
  }, [imageLoading, imagePrompt]);

  const handleStartStream = async () => {
    if (!canStream) {
      return;
    }

    stopRef.current = false;
    setTextError('');
    setTextOutput('');
    setReasoningOutput('');
    setStreaming(true);

    try {
      const result = await streamAiText({
        messages: [
          {
            role: 'user',
            content: prompt.trim(),
          },
        ],
        onTextChunk: (chunk) => {
          setTextOutput((prev) => prev + chunk);
        },
        onReasoningChunk: (chunk) => {
          setReasoningOutput((prev) => prev + chunk);
        },
        shouldStop: () => stopRef.current,
      });

      if (result.stopped) {
        Taro.showToast({
          title: '已停止生成',
          icon: 'none',
        });
      }
    } catch (error) {
      setTextError(getErrorMessage(error));
    } finally {
      setStreaming(false);
    }
  };

  const handleStopStream = () => {
    if (!streaming) {
      return;
    }

    stopRef.current = true;
  };

  const handleGenerateImage = async () => {
    if (!canGenerateImage) {
      return;
    }

    setImageError('');
    setImages([]);
    setImageLoading(true);

    try {
      const result = await generateImageByCloudFunction({
        prompt: imagePrompt.trim(),
        count: 1,
        size: '1024x1024',
      });

      if (!result.images.length) {
        setImageError('云函数执行成功，但未返回图片。请检查模型提供方返回结构。');
        return;
      }

      setImages(result.images);
    } catch (error) {
      setImageError(getErrorMessage(error));
    } finally {
      setImageLoading(false);
    }
  };

  return (
    <PageShell
      eyebrow='云开发 AI'
      title='AI 接入示例页'
      subtitle='上半部分演示流式生文，下半部分演示云函数中转生图。'
    >
      <ArcoCard tone='emphasis' padding='lg' delay={1}>
        <FormField
          label='生文 Prompt'
          hint='点击“开始流式生成”后，输出会一段段追加到下方内容区。'
        >
          <Textarea
            className='field-control field-control--textarea'
            value={prompt}
            maxlength={500}
            autoHeight
            placeholder='输入你要让模型生成的内容'
            placeholderStyle='color: #B5AB9C'
            onInput={(event) => setPrompt(event.detail.value)}
          />
        </FormField>

        <View className='mt-5 flex gap-3'>
          <ArcoButton
            className='flex-1'
            size='md'
            disabled={!canStream}
            loading={streaming}
            onClick={handleStartStream}
          >
            {streaming ? '流式生成中' : '开始流式生成'}
          </ArcoButton>
          <ArcoButton
            className='flex-1'
            size='md'
            variant='outline'
            disabled={!streaming}
            onClick={handleStopStream}
          >
            停止生成
          </ArcoButton>
        </View>
      </ArcoCard>

      <ArcoCard delay={2}>
        <Text className='text-overline text-driftwood'>流式文本输出</Text>
        <View className='ai-stream-output'>
          <Text className='text-body text-charcoal'>
            {textOutput || (streaming ? '模型正在输出中...' : '尚未开始生成')}
          </Text>
        </View>
      </ArcoCard>

      {reasoningOutput ? (
        <ArcoCard tone='muted' delay={3}>
          <Text className='text-overline text-driftwood'>思维链输出（仅特定模型返回）</Text>
          <View className='ai-stream-output ai-stream-output--muted'>
            <Text className='text-body text-driftwood'>{reasoningOutput}</Text>
          </View>
        </ArcoCard>
      ) : null}

      {textError ? (
        <ArcoNotice
          tone='warning'
          title='生文调用失败'
          description={textError}
        />
      ) : null}

      <ArcoCard tone='emphasis' padding='lg' delay={4}>
        <FormField
          label='生图 Prompt'
          hint='这部分通过 wx.cloud.callFunction 调用云函数，由云函数中转到图像模型服务。'
        >
          <Textarea
            className='field-control'
            value={imagePrompt}
            maxlength={200}
            autoHeight
            placeholder='输入图片描述'
            placeholderStyle='color: #B5AB9C'
            onInput={(event) => setImagePrompt(event.detail.value)}
          />
        </FormField>

        <View className='mt-5'>
          <ArcoButton
            className='w-full'
            size='md'
            disabled={!canGenerateImage}
            loading={imageLoading}
            onClick={handleGenerateImage}
          >
            {imageLoading ? '生图中' : '调用生图云函数'}
          </ArcoButton>
        </View>
      </ArcoCard>

      {imageError ? (
        <ArcoNotice
          tone='warning'
          title='生图调用失败'
          description={imageError}
        />
      ) : null}

      {images.length ? (
        <ArcoCard delay={5}>
          <Text className='text-overline text-driftwood'>生图结果</Text>
          <View className='ai-image-grid'>
            {images.map((item, index) => {
              const src = getDisplayImageUrl(item);
              if (!src) {
                return null;
              }

              return (
                <Image
                  key={`${src}-${index}`}
                  className='ai-image-item'
                  src={src}
                  mode='aspectFill'
                  showMenuByLongpress
                />
              );
            })}
          </View>
        </ArcoCard>
      ) : null}
    </PageShell>
  );
};

export default AIDemoPage;
