import Taro from '@tarojs/taro'

type RequestMethod = 'GET' | 'POST' | 'DELETE'

interface ApiEnvelope<T> {
  code: number
  message?: string
  data: T
  details?: unknown
}

interface RequestOptions<TData> {
  path: string
  method?: RequestMethod
  data?: TData
  header?: Record<string, string>
}

interface CloudContainerClient {
  init?: (options: { env: string; traceUser?: boolean }) => void
  callContainer: <T>(options: {
    config: {
      env: string
    }
    path: string
    method: RequestMethod
    header?: Record<string, string>
    data?: unknown
  }) => Promise<{ data: ApiEnvelope<T> }>
}

const API_BASE_URL = (process.env.TARO_APP_API_BASE_URL || '').trim()
const CLOUD_ENV = (process.env.TARO_APP_CLOUD_ENV || '').trim()
const CLOUD_SERVICE = (process.env.TARO_APP_CLOUD_SERVICE || '').trim()
const LOCAL_USER_ID = (process.env.TARO_APP_LOCAL_USER_ID || '').trim()

let cloudInitialized = false

export class ApiError extends Error {
  code?: number
  details?: unknown

  constructor(message: string, code?: number, details?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.details = details
  }
}

function buildHeaders(extraHeader?: Record<string, string>) {
  const headers: Record<string, string> = {
    'content-type': 'application/json',
    ...extraHeader,
  }

  if (LOCAL_USER_ID && !headers['x-user-id']) {
    headers['x-user-id'] = LOCAL_USER_ID
  }

  return headers
}

function getCloudClient() {
  if (Taro.getEnv() !== Taro.ENV_TYPE.WEAPP || !CLOUD_ENV || !CLOUD_SERVICE) {
    return null
  }

  const runtime = globalThis as typeof globalThis & {
    wx?: {
      cloud?: CloudContainerClient
    }
  }

  const cloud = runtime.wx?.cloud

  if (!cloud?.callContainer) {
    return null
  }

  if (!cloudInitialized && typeof cloud.init === 'function') {
    cloud.init({
      env: CLOUD_ENV,
      traceUser: true,
    })
    cloudInitialized = true
  }

  return cloud
}

function joinUrl(baseUrl: string, path: string) {
  return `${baseUrl.replace(/\/+$/, '')}${path}`
}

function toApiError(error: unknown) {
  if (error instanceof ApiError) {
    return error
  }

  if (
    typeof error === 'object' &&
    error !== null &&
    'errMsg' in error &&
    typeof error.errMsg === 'string'
  ) {
    return new ApiError(error.errMsg)
  }

  if (error instanceof Error) {
    return new ApiError(error.message)
  }

  return new ApiError('网络请求失败，请稍后再试')
}

async function requestByCloud<TResponse, TData>(options: RequestOptions<TData>) {
  const cloud = getCloudClient()

  if (!cloud) {
    return null
  }

  const result = await cloud.callContainer<TResponse>({
    config: {
      env: CLOUD_ENV,
    },
    path: options.path,
    method: options.method || 'GET',
    header: {
      ...buildHeaders(options.header),
      'X-WX-SERVICE': CLOUD_SERVICE,
    },
    data: options.data,
  })

  return result.data
}

async function requestByHttp<TResponse, TData>(options: RequestOptions<TData>) {
  if (!API_BASE_URL) {
    throw new ApiError(
      '缺少前端接口配置，请设置 TARO_APP_API_BASE_URL 或云托管环境变量'
    )
  }

  const response = await Taro.request<ApiEnvelope<TResponse>>({
    url: joinUrl(API_BASE_URL, options.path),
    method: options.method || 'GET',
    data: options.data,
    header: buildHeaders(options.header),
  })

  return response.data
}

export async function apiRequest<TResponse, TData = unknown>(
  options: RequestOptions<TData>
) {
  let envelope: ApiEnvelope<TResponse> | null = null

  try {
    envelope =
      (await requestByCloud<TResponse, TData>(options)) ||
      (await requestByHttp<TResponse, TData>(options))
  } catch (error) {
    throw toApiError(error)
  }

  if (!envelope || typeof envelope !== 'object') {
    throw new ApiError('接口返回格式无效')
  }

  if (envelope.code !== 0) {
    throw new ApiError(envelope.message || '请求失败', envelope.code, envelope.details)
  }

  return envelope.data
}

export function getErrorMessage(error: unknown) {
  return toApiError(error).message
}
