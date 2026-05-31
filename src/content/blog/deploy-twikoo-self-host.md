---
title: 如何部署 Twikoo 评论系统到自己的服务器
description: 从零部署 Twikoo 评论系统到自有服务器，涵盖 MongoDB、Docker、Nginx 反代、前端接入全流程。
pubDate: 2026-05-31T03:07
image: /images/deploy-twikoo-self-host/a19fb13d5c9c9206.png
draft: false
tags:
  - tool/comment
  - deployment/docker
  - server/self-host
categories: []
badge: 最新
---
# 如何部署 Twikoo 评论到自己的服务器

## 简介

 [Twikoo](https://twikoo.js.org) 是一个自托管的静态博客评论系统，后端用 Node.js，数据库用 MongoDB。前端通过一个 JS 脚本嵌入页面。

## 需要什么

- 一台能装 Docker 的服务器（1c1g 够用）
- MongoDB（可以同一台服务器上跑，也可以用 MongoDB Atlas 免费版）
- 一个域名（前端 HTTPS 站点才能正常请求）

## 部署步骤

### 1. MongoDB

如果已有 MongoDB 可跳过。没有的话，在服务器上起一个：

```bash
# 拉镜像
docker pull mongo:7

# 运行，挂载数据目录
docker run -d --name mongo \
  -v /opt/mongo/data:/data/db \
  -p 127.0.0.1:27017:27017 \
  mongo:7
```

或者用 MongoDB Atlas 免费云（512MB 够用了），注册后获取连接字符串。

### 2. 运行 Twikoo

```bash
# 拉镜像
docker pull imaegoo/twikoo

# 运行
docker run -d --name twikoo \
  --restart=unless-stopped \
  -e TWIKOO_THROTTLE=1000 \
  -e MONGODB_URI=mongodb://mongo:27017/twikoo \
  --link mongo \
  -p 127.0.0.1:8080:8080 \
  imaegoo/twikoo
```

如果 MongoDB 在一台机器上且没用 `--link`，直接用宿主机 IP 或者把 `--link` 换成 `--network host`：

```bash
# 用宿主机网络（Mongo 也同一台机器）
docker run -d --name twikoo \
  --restart=unless-stopped \
  --network host \
  -e TWIKOO_THROTTLE=1000 \
  -e MONGODB_URI=mongodb://127.0.0.1:27017/twikoo \
  imaegoo/twikoo
```

用 MongoDB Atlas 的话，`MONGODB_URI` 换成 Atlas 连接字符串。

### 3. Nginx 反代

假设你的域名是 `comment.example.com`：

```nginx
server {
    listen 443 ssl http2;
    server_name comment.example.com;

    ssl_certificate     /path/to/fullchain.pem;
    ssl_certificate_key /path/to/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
# 验证并重载
sudo nginx -t && sudo systemctl reload nginx
```

### 4. 前端接入

在博客页面引入 Twikoo JS，挂载到指定 DOM 元素：

```html
<div id="twikoo-comments"></div>

<script src="https://cdn.jsdelivr.net/npm/twikoo@1.6.41/dist/twikoo.all.min.js"></script>
<script>
twikoo.init({
  envId: 'https://comment.example.com',
  el: '#twikoo-comments',
  // 可选：语言、表情CDN、管理员鉴权等
  lang: 'zh-CN',
});
</script>
```

### 5. 管理面板

浏览器打开 `https://comment.example.com/#/login`，第一次会设置管理员密码。之后可以在这里管理评论（审核、删除、回复等）。

## 常用环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `TWIKOO_THROTTLE` | 同一 IP 评论间隔（毫秒） | 60000 |
| `TWIKOO_IP_HEADERS` | 获取真实 IP 的请求头，逗号分隔 | `x-forwarded-for` |
| `MONGODB_URI` | MongoDB 连接字符串 | — |

## 常见问题

**评论发送失败 / 一直转圈** → 检查浏览器控制台，大概率是 HTTPS 证书问题或反代没配 WebSocket 升级头。

**管理面板进不去** → 确保 URL 以 `/#/login` 结尾，域名都能正常访问。

**WordPress 能不能用** → 只适合静态博客，WordPress 不需要这个。

## 备份

```bash
# 评论存在 MongoDB 里，备份数据库即可
docker exec mongo mongodump --archive=/tmp/twikoo-$(date +%F).archive
docker cp mongo:/tmp/twikoo-$(date +%F).archive .
```
