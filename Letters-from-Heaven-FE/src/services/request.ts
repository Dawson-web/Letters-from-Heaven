import Taro from '@tarojs/taro'

type RequestMethod = 'GET' | 'POST' | 'DELETE' | 'PATCH'

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

const API_BASE_URL = __API_BASE_URL__.trim()
const CLOUD_ENV = __CLOUD_ENV__.trim()
const CLOUD_SERVICE = __CLOUD_SERVICE__.trim()
const LOCAL_USER_ID = __LOCAL_USER_ID__.trim()

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

function getErrorText(error: unknown) {
  return toApiError(error).message
}

async function requestByCloud<TResponse, TData>(options: RequestOptions<TData>) {
  const cloud = getCloudClient()

  if (!cloud) {
    return null
  }

  const method = options.method || 'GET'
  const cloudMethod: RequestMethod = method === 'PATCH' ? 'POST' : method
  const cloudHeader = buildHeaders(options.header)

  if (method === 'PATCH') {
    cloudHeader['x-http-method-override'] = 'PATCH'
  }

  const result = await cloud.callContainer<TResponse>({
    config: {
      env: CLOUD_ENV,
    },
    path: options.path,
    method: cloudMethod,
    header: {
      ...cloudHeader,
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

  const method = options.method || 'GET'
  const httpMethod: RequestMethod = method === 'PATCH' ? 'POST' : method
  const httpHeader = buildHeaders(options.header)

  if (method === 'PATCH') {
    httpHeader['x-http-method-override'] = 'PATCH'
  }

  const response = await Taro.request<ApiEnvelope<TResponse>>({
    url: joinUrl(API_BASE_URL, options.path),
    method: httpMethod,
    data: options.data,
    header: httpHeader,
  })

  return response.data
}

export async function apiRequest<TResponse, TData = unknown>(
  options: RequestOptions<TData>
) {
  let envelope: ApiEnvelope<TResponse> | null = null
  let cloudError: unknown = null

  try {
    envelope = await requestByCloud<TResponse, TData>(options)
  } catch (error) {
    cloudError = error
    console.warn('[apiRequest] wx.cloud.callContainer failed, falling back to HTTP', {
      path: options.path,
      method: options.method || 'GET',
      cloudEnv: CLOUD_ENV,
      cloudService: CLOUD_SERVICE,
      error: getErrorText(error),
    })
  }

  if (!envelope) {
    try {
      envelope = await requestByHttp<TResponse, TData>(options)
    } catch (httpError) {
      if (cloudError) {
        console.error('[apiRequest] HTTP fallback failed after cloud request failure', {
          path: options.path,
          method: options.method || 'GET',
          cloudError: getErrorText(cloudError),
          httpError: getErrorText(httpError),
        })
      }

      throw toApiError(httpError)
    }
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
