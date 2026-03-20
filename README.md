# Letters-from-Heaven

> 云端回信 - 一款情感书信小程序，为已故亲友传递温暖与思念

## 项目简介

云端回信是一款基于微信小程序开发的情感书信应用，允许用户向已故亲友写信，并通过预设规则在特定纪念日自动收到"来自天堂的回信"。项目采用前后端分离架构，提供温暖、私密的情感陪伴体验。

### 主要功能

- 📝 **写信功能**：书写给已故亲友的信件，记录思念与回忆
- 📬 **收信箱**：查看收到的"回信"，保存珍贵时刻
- 🕊️ **纪念档案**：创建和管理纪念人物档案
- 📅 **纪念日提醒**：设置生日、忌日等重要纪念日
- ⏰ **定时回信**：在纪念日时间窗口内自动触发回信
- ✉️ **智能回信生成**：基于纪念档案和信件内容生成个性化回信

## 技术架构

### 后端 (Letters-from-Heaven-BE)

- **框架**：Express.js
- **数据库**：MySQL + Sequelize ORM
- **部署**：微信云托管 / Docker
- **核心服务**：
  - Mailbox Service：信箱管理服务
  - Memorial Service：纪念档案与事件管理服务
  - Reply Builder：回信内容生成器

### 前端 (Letters-from-Heaven-FE)

- **框架**：Taro 4.1.11 (支持多端)
- **UI 框架**：React 18
- **状态管理**：MobX 6
- **样式方案**：TailwindCSS + Sass
- **TypeScript**：完整类型支持
- **目标平台**：微信小程序、H5

## 数据模型

### 核心实体

- **User**：用户信息
- **Letter**：用户信件
- **Reply**：回信记录
- **MemorialProfile**：纪念人物档案
- **MemorialEvent**：纪念日事件

## 项目结构

```
Letters-from-Heaven/
├── Letters-from-Heaven-BE/       # 后端服务
│   ├── index.js                 # 应用入口
│   ├── db.js                    # 数据库配置与模型
│   ├── mailbox-service.js       # 信箱服务
│   ├── memorial-service.js      # 纪念服务
│   ├── reply-builder.js         # 回信生成器
│   └── migrations.js            # 数据库迁移
│
└── Letters-from-Heaven-FE/      # 前端小程序
    ├── src/
    │   ├── pages/               # 页面
    │   │   ├── home/           # 首页
    │   │   ├── write/          # 写信页
    │   │   ├── sent/           # 已发送
    │   │   ├── inbox/          # 收信箱
    │   │   ├── reply/          # 回信详情
    │   │   ├── profile/        # 个人中心
    │   │   └── memorial/       # 纪念档案
    │   ├── components/         # 组件
    │   ├── services/           # API 服务
    │   ├── stores/             # MobX 状态
    │   └── types/              # TypeScript 类型
    └── config/                  # 配置文件
```

## 快速开始

### 环境要求

- Node.js >= 12.0.0
- MySQL 5.7+
- pnpm (前端推荐)

### 后端部署

1. 配置环境变量
```bash
export MYSQL_USERNAME=your_username
export MYSQL_PASSWORD=your_password
export MYSQL_ADDRESS=host:port
export PORT=80
```

2. 安装依赖
```bash
cd Letters-from-Heaven-BE
npm install
```

3. 启动服务
```bash
npm start
```

### 前端开发

1. 安装依赖
```bash
cd Letters-from-Heaven-FE
pnpm install
```

2. 配置环境变量
复制并编辑 `.env.development`：
```bash
cp .env.development.example .env.development
```

3. 启动开发服务器
```bash
# 微信小程序
pnpm run dev:weapp

# H5
pnpm run dev:h5
```

4. 构建生产版本
```bash
pnpm run build:weapp
```

## API 接口

### 用户相关
- `GET /api/me` - 获取当前用户信息
- `GET /api/wx_openid` - 获取微信 Open ID

### 信箱相关
- `GET /api/mailbox` - 获取信箱概览
- `DELETE /api/mailbox` - 清空信箱
- `GET /api/letters` - 获取信件列表
- `POST /api/letters` - 创建新信件
- `GET /api/replies` - 获取回信列表
- `GET /api/replies/:id` - 获取回信详情

### 纪念档案相关
- `GET /api/memorial-profiles` - 获取纪念档案列表
- `POST /api/memorial-profiles` - 创建纪念档案
- `PATCH /api/memorial-profiles/:id` - 更新纪念档案
- `DELETE /api/memorial-profiles/:id` - 删除纪念档案
- `GET /api/memorial-profiles/:id/events` - 获取纪念日事件
- `POST /api/memorial-profiles/:id/events` - 创建纪念日事件
- `PATCH /api/memorial-events/:id` - 更新纪念日事件
- `DELETE /api/memorial-events/:id` - 删除纪念日事件

### 定时任务
- `POST /api/jobs/memorial/trigger` - 触发纪念日回信任务

## 部署说明

### 云托管部署

后端支持微信云托管，配置 `container.config.json` 后可直接部署。

### Docker 部署

```bash
cd Letters-from-Heaven-BE
docker build -t letters-from-heaven .
docker run -p 80:80 letters-from-heaven
```

## 开发规范

- 前端使用 ESLint + Stylelint 进行代码检查
- 使用 Husky + lint-staged 进行提交前检查
- 遵循 Conventional Commits 规范提交信息

## 许可证

Apache-2.0

## 致谢

本项目使用微信云托管 Express 框架模板和 Taro 框架构建。
