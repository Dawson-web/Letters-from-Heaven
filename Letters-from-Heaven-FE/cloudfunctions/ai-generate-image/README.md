# ai-generate-image

微信云函数生图中转骨架，供小程序端通过 `wx.cloud.callFunction` 调用。

## 入参

```json
{
  "prompt": "一封放在木桌上的旧信，暖色调，电影感",
  "model": "hunyuan-image-latest",
  "size": "1024x1024",
  "count": 1,
  "style": "cinematic"
}
```

## 返回

```json
{
  "success": true,
  "requestId": "uuid",
  "provider": "custom-http-provider",
  "images": [
    {
      "fileID": "cloud://xxx/generated-images/uuid-0.png",
      "tempFileURL": "https://tmp-url...",
      "originURL": "https://provider-url..."
    }
  ]
}
```

## 需要配置的云函数环境变量

- `IMAGE_PROVIDER_ENDPOINT`: 你的生图服务 HTTP 地址
- `IMAGE_PROVIDER_API_KEY`: 生图服务密钥
- `IMAGE_PROVIDER_MODEL`: 默认模型名（可选）

## 说明

- 当前是“骨架实现”，通过 HTTP 调用外部生图服务，再把图片上传到云存储并返回 `tempFileURL`。
- 不同供应商的请求体和响应结构会不同，重点修改 `generateImageByProvider` 和 `normalizeProviderImageUrls` 两个函数即可。
