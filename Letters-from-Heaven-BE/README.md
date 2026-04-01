# wxcloudrun-express

[![GitHub license](https://img.shields.io/github/license/WeixinCloud/wxcloudrun-express)](https://github.com/WeixinCloud/wxcloudrun-express)
![GitHub package.json dependency version (prod)](https://img.shields.io/github/package-json/dependency-version/WeixinCloud/wxcloudrun-express/express)
![GitHub package.json dependency version (prod)](https://img.shields.io/github/package-json/dependency-version/WeixinCloud/wxcloudrun-express/sequelize)

微信云托管 Node.js Express 框架模版，实现简单的计数器读写接口，使用云托管 MySQL 读写、记录计数值。

![](https://qcloudimg.tencent-cloud.cn/raw/be22992d297d1b9a1a5365e606276781.png)

## 快速开始

前往 [微信云托管快速开始页面](https://cloud.weixin.qq.com/cloudrun/onekey)，选择相应语言的模板，根据引导完成部署。

## 本地调试
下载代码在本地调试，请参考[微信云托管本地调试指南](https://developers.weixin.qq.com/miniprogram/dev/wxcloudrun/src/guide/debug/)

## 实时开发
代码变动时，不需要重新构建和启动容器，即可查看变动后的效果。请参考[微信云托管实时开发指南](https://developers.weixin.qq.com/miniprogram/dev/wxcloudrun/src/guide/debug/dev.html)

## Dockerfile最佳实践
请参考[如何提高项目构建效率](https://developers.weixin.qq.com/miniprogram/dev/wxcloudrun/src/scene/build/speed.html)

## 项目结构说明

```
.
├── Dockerfile
├── README.md
├── container.config.json
├── db.js
├── index.js
├── index.html
├── package.json
```

- `index.js`：项目入口，实现主要的读写 API
- `db.js`：数据库相关实现，使用 `sequelize` 作为 ORM
- `index.html`：首页代码
- `package.json`：Node.js 项目定义文件
- `container.config.json`：模板部署「服务设置」初始化配置（二开请忽略）
- `Dockerfile`：容器配置文件

## 服务 API 文档

### `GET /api/count`

获取当前计数

#### 请求参数

无

#### 响应结果

- `code`：错误码
- `data`：当前计数值

##### 响应结果示例

```json
{
  "code": 0,
  "data": 42
}
```

#### 调用示例

```
curl https://<云托管服务域名>/api/count
```

### `POST /api/count`

更新计数，自增或者清零

#### 请求参数

- `action`：`string` 类型，枚举值
  - 等于 `"inc"` 时，表示计数加一
  - 等于 `"clear"` 时，表示计数重置（清零）

##### 请求参数示例

```
{
  "action": "inc"
}
```

#### 响应结果

- `code`：错误码
- `data`：当前计数值

##### 响应结果示例

```json
{
  "code": 0,
  "data": 42
}
```

#### 调用示例

```
curl -X POST -H 'content-type: application/json' -d '{"action": "inc"}' https://<云托管服务域名>/api/count
```

## 使用注意
如果不是通过微信云托管控制台部署模板代码，而是自行复制/下载模板代码后，手动新建一个服务并部署，需要在「服务设置」中补全以下环境变量，才可正常使用，否则会引发无法连接数据库，进而导致部署失败。
- MYSQL_ADDRESS
- MYSQL_PASSWORD
- MYSQL_USERNAME
以上三个变量的值请按实际情况填写。如果使用云托管内MySQL，可以在控制台MySQL页面获取相关信息。

## AI 回信（新增）

后端在回信从 `waiting` 结算到 `ready` 时，会优先调用 CloudBase AI 生成正文；调用失败会自动回退到原模板文案，不影响主流程。

### 需要的环境变量

- `CLOUDBASE_ENV_ID`
- `CLOUDBASE_SECRETID`
- `CLOUDBASE_SECRETKEY`
- `CLOUDBASE_AI_MODEL_GROUP`（可选，默认 `hunyuan-exp`）
- `CLOUDBASE_AI_MODEL`（可选，默认 `hunyuan-turbos-latest`）
- `CLOUDBASE_AI_TIMEOUT_MS`（可选，默认 `12000`）
- `CLOUDBASE_AI_ENABLED`（可选，设为 `false` 可关闭 AI，强制走模板）

### 本地开发示例

```bash
CLOUDBASE_ENV_ID=xxx
CLOUDBASE_SECRETID=xxx
CLOUDBASE_SECRETKEY=xxx
CLOUDBASE_AI_MODEL_GROUP=hunyuan-exp
CLOUDBASE_AI_MODEL=hunyuan-turbos-latest
```

## 回响提醒（新增）

回响从 `waiting` 结算为 `ready` 后，可按用户偏好触发提醒通道：

- `mini_program_subscribe`（小程序订阅消息）
- `official_account`（公众号模板消息）

> 注意：公众号提醒需要用户在公众号侧完成关注与身份绑定，服务端拿到 `officialAccountOpenId` 后才能发送。

### 小程序订阅消息环境变量

- `WECHAT_MINI_APP_ID`
- `WECHAT_MINI_APP_SECRET`
- `REMINDER_MINI_TEMPLATE_ID`（可选，用户未单独配置模板时使用）
- `REMINDER_MINI_PAGE`（可选，默认 `/pages/reply/index?id=xxx`）

### 公众号模板消息环境变量

- `WECHAT_OA_APP_ID`
- `WECHAT_OA_APP_SECRET`
- `REMINDER_OA_TEMPLATE_ID`（可选，用户未单独配置模板时使用）
- `REMINDER_OFFICIAL_FALLBACK_MINI`（可选，设为 `true` 时公众号发送失败后回退小程序提醒）

### 定时任务建议

建议额外配置一个定时任务调用：

- `POST /api/jobs/replies/settle`

该任务会把已到期的 `waiting` 回响结算为 `ready`，并尝试发送提醒。


## License

[MIT](./LICENSE)
