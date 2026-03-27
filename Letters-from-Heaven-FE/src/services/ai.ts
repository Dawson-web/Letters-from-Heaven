import Taro from '@tarojs/taro';

const CLOUD_ENV = __CLOUD_ENV__.trim();
const DEFAULT_MODEL_GROUP = (__AI_MODEL_GROUP__ || 'hunyuan-exp').trim();
const DEFAULT_MODEL = (__AI_MODEL__ || 'hunyuan-turbos-latest').trim();
const DEFAULT_IMAGE_FUNCTION = (__AI_IMAGE_FUNCTION__ || 'ai-generate-image').trim();

type MessageRole = 'system' | 'user' | 'assistant';

interface StreamDelta {
  content?: string;
  reasoning_content?: string;
}

interface StreamChoice {
  delta?: StreamDelta;
}

interface StreamPayload {
  choices?: StreamChoice[];
}

interface StreamEvent {
  data?: string;
}

interface StreamResponse {
  eventStream: AsyncIterable<StreamEvent>;
}

interface StreamTextModel {
  streamText: (options: {
    data: {
      model: string;
      messages: ChatMessage[];
      temperature?: number;
      top_p?: number;
      max_tokens?: number;
    };
  }) => Promise<StreamResponse>;
}

interface CloudFunctionCallResult<T = unknown> {
  result?: T;
}

interface CloudRuntime {
  init?: (options: { env: string; traceUser?: boolean }) => void;
  extend?: {
    AI?: {
      createModel: (modelGroup: string) => StreamTextModel;
    };
  };
  callFunction?: <T = unknown>(options: {
    name: string;
    data?: unknown;
    config?: {
      env?: string;
    };
  }) => Promise<CloudFunctionCallResult<T>>;
}

let cloudInitialized = false;

export interface ChatMessage {
  role: MessageRole;
  content: string;
}

export interface StreamTextParams {
  messages: ChatMessage[];
  model?: string;
  modelGroup?: string;
  temperature?: number;
  topP?: number;
  maxTokens?: number;
  onTextChunk?: (chunk: string) => void;
  onReasoningChunk?: (chunk: string) => void;
  shouldStop?: () => boolean;
}

export interface StreamTextResult {
  text: string;
  reasoning: string;
  stopped: boolean;
}

interface GenerateImageFunctionSuccess {
  success: true;
  requestId?: string;
  provider?: string;
  images?: Array<{
    fileID?: string;
    tempFileURL?: string;
    originURL?: string;
  }>;
}

interface GenerateImageFunctionFailure {
  success: false;
  message?: string;
}

type GenerateImageFunctionResponse =
  | GenerateImageFunctionSuccess
  | GenerateImageFunctionFailure;

export interface GenerateImageParams {
  prompt: string;
  model?: string;
  size?: string;
  count?: number;
  style?: string;
}

export interface GeneratedImage {
  fileID?: string;
  tempFileURL?: string;
  originURL?: string;
}

export interface GenerateImageResult {
  requestId?: string;
  provider?: string;
  images: GeneratedImage[];
}

function getCloudRuntime() {
  if (Taro.getEnv() !== Taro.ENV_TYPE.WEAPP) {
    throw new Error('AI 能力仅支持微信小程序环境。');
  }

  const runtime = globalThis as typeof globalThis & {
    wx?: {
      cloud?: CloudRuntime;
    };
  };

  const cloud = runtime.wx?.cloud;
  if (!cloud) {
    throw new Error('未检测到 wx.cloud，请确认已在微信开发者工具中运行。');
  }

  if (!CLOUD_ENV) {
    throw new Error('缺少 TARO_APP_CLOUD_ENV，无法初始化云开发。');
  }

  if (!cloudInitialized && typeof cloud.init === 'function') {
    cloud.init({
      env: CLOUD_ENV,
      traceUser: true,
    });
    cloudInitialized = true;
  }

  return cloud;
}

function pickTextChunk(payload: StreamPayload) {
  const delta = payload.choices?.[0]?.delta;
  if (!delta || typeof delta !== 'object') {
    return '';
  }

  return typeof delta.content === 'string' ? delta.content : '';
}

function pickReasoningChunk(payload: StreamPayload) {
  const delta = payload.choices?.[0]?.delta;
  if (!delta || typeof delta !== 'object') {
    return '';
  }

  return typeof delta.reasoning_content === 'string' ? delta.reasoning_content : '';
}

export async function streamAiText(params: StreamTextParams): Promise<StreamTextResult> {
  if (!Array.isArray(params.messages) || params.messages.length === 0) {
    throw new Error('messages 不能为空。');
  }

  const cloud = getCloudRuntime();
  const createModel = cloud.extend?.AI?.createModel;
  if (typeof createModel !== 'function') {
    throw new Error('当前基础库不支持 wx.cloud.extend.AI，请升级至 3.7.1 及以上。');
  }

  const modelGroup = (params.modelGroup || DEFAULT_MODEL_GROUP).trim();
  const model = (params.model || DEFAULT_MODEL).trim();

  if (!modelGroup) {
    throw new Error('缺少模型组，请设置 TARO_APP_AI_MODEL_GROUP 或传入 modelGroup。');
  }

  if (!model) {
    throw new Error('缺少模型名，请设置 TARO_APP_AI_MODEL 或传入 model。');
  }

  const stream = await createModel(modelGroup).streamText({
    data: {
      model,
      messages: params.messages,
      temperature: params.temperature,
      top_p: params.topP,
      max_tokens: params.maxTokens,
    },
  });

  let text = '';
  let reasoning = '';
  let stopped = false;

  for await (const event of stream.eventStream) {
    if (params.shouldStop?.()) {
      stopped = true;
      break;
    }

    if (event.data === '[DONE]') {
      break;
    }

    if (!event.data) {
      continue;
    }

    let payload: StreamPayload | null = null;
    try {
      payload = JSON.parse(event.data) as StreamPayload;
    } catch {
      // 忽略无法解析的心跳包/非 JSON 片段。
      continue;
    }

    if (!payload) {
      continue;
    }

    const reasoningChunk = pickReasoningChunk(payload);
    if (reasoningChunk) {
      reasoning += reasoningChunk;
      params.onReasoningChunk?.(reasoningChunk);
    }

    const textChunk = pickTextChunk(payload);
    if (textChunk) {
      text += textChunk;
      params.onTextChunk?.(textChunk);
    }
  }

  return {
    text,
    reasoning,
    stopped,
  };
}

export async function generateImageByCloudFunction(
  params: GenerateImageParams,
  functionName?: string
): Promise<GenerateImageResult> {
  const prompt = params.prompt.trim();
  if (!prompt) {
    throw new Error('prompt 不能为空。');
  }

  const cloud = getCloudRuntime();
  if (typeof cloud.callFunction !== 'function') {
    throw new Error('当前环境不支持 wx.cloud.callFunction。');
  }

  const resolvedFunctionName = (functionName || DEFAULT_IMAGE_FUNCTION).trim();
  if (!resolvedFunctionName) {
    throw new Error('缺少云函数名，请设置 TARO_APP_AI_IMAGE_FUNCTION。');
  }

  const response = await cloud.callFunction<GenerateImageFunctionResponse>({
    name: resolvedFunctionName,
    data: {
      ...params,
      prompt,
    },
    config: {
      env: CLOUD_ENV,
    },
  });

  const result = response.result;
  if (!result || typeof result !== 'object') {
    throw new Error('生图云函数返回格式无效。');
  }

  if ('success' in result && result.success === false) {
    throw new Error(result.message || '生图云函数调用失败。');
  }

  const images = Array.isArray(result.images)
    ? result.images.map((item) => ({
      fileID: typeof item.fileID === 'string' ? item.fileID : undefined,
      tempFileURL: typeof item.tempFileURL === 'string' ? item.tempFileURL : undefined,
      originURL: typeof item.originURL === 'string' ? item.originURL : undefined,
    }))
    : [];

  return {
    requestId: typeof result.requestId === 'string' ? result.requestId : undefined,
    provider: typeof result.provider === 'string' ? result.provider : undefined,
    images,
  };
}
