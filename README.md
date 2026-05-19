# P4 Schedule Web App

这是一个可部署的多人日程网站版本。每个用户注册自己的账号后，会看到并维护自己独立的日程数据，彼此互不干扰。

## 本地运行

1. 安装依赖

```bash
npm install
```

2. 创建环境变量文件

把 `.env.example` 复制为 `.env`，至少设置：

```env
PORT=3000
SESSION_SECRET=你的长随机字符串
NODE_ENV=development
```

3. 启动

```bash
npm start
```

打开 `http://localhost:3000`

## 部署成公网网站

这个项目现在已经是标准 Node.js 网站，可以直接部署到以下平台：

- Render
- Railway
- Fly.io
- 你自己的 Linux / Windows 云服务器

### Render 最快部署方式

1. 把整个 `p4` 文件夹上传到 GitHub 仓库
2. 在 Render 新建一个 `Web Service`
3. 连接你的 GitHub 仓库
4. 填写：

- Build Command: `npm install`
- Start Command: `npm start`

5. 在 Render 的环境变量里设置：

- `NODE_ENV=production`
- `SESSION_SECRET=一串足够长的随机字符串`
- `DATA_DIR=/var/data`

6. 给这个服务挂载 Persistent Disk：

- Mount Path: `/var/data`
- Size: `1 GB`

7. 部署完成后，Render 会给你一个公网链接，直接发给别人即可使用

## 重要说明

- 现在使用的是 SQLite，适合小型项目和课程展示
- Render 的免费 Web Service 不能挂 Persistent Disk，所以如果你想保留用户数据，不能用免费 Web Service
- 当前仓库里的 `render.yaml` 已按持久化磁盘方案配置，适合直接部署到付费 Web Service
- 如果你后面要长期公开使用，建议把数据库换成 PostgreSQL

## 当前功能

- 用户注册
- 用户登录 / 退出
- 每个账号独立保存日程
- 添加任务
- 标记完成
- 删除任务
- Persona 4 风格动态背景页面
