---
title: Umami 网站统计部署指南 — 15 分钟自建隐私友好分析
description: 不想把访客数据送给 Google？用 Umami 在自有服务器上部署网站分析，Docker 一把梭，Nginx 反代加 SSL，配合 RyuChan 模板展示全站 PV/UV 和单篇阅读量。
pubDate: 2026-06-12T12:30
image: https://photo.nywerya.xyz/Obsidian/发布/注释/Umami-cover.png
draft: false
tags:
  - umami
  - analytics
  - docker
  - nginx
  - self-host
  - tutorial
categories:
  - 教程
slug: self-host-umami-analytics
cover: 发布/注释/Umami-cover.png
summary: Docker Compose 部署 Umami 网站统计，Nginx 反代 + SSL，集成博客展示全站 PV/UV 和单篇阅读量。
type: tutorial
original: "[[笔记/网络与服务器/Umami-自建网站统计|Umami 自建网站统计]]"
Release Platform:
  - blog.nywerya.xyz
---

![封面](https://photo.nywerya.xyz/Obsidian/发布/注释/Umami-cover.png)

# Umami 自建网站统计

## 这是什么

Umami 是开源的网站访问统计工具，Google Analytics 的轻量替代品。部署在自己的服务器上，数据归你，不会追踪用户隐私。

对比 GA4：Umami 部署 5 分钟，打开 dashboard 就能看懂，不用考 GA 分析师证。

## 效果展示

博客底部的"阅读量"就是 Umami 提供的：

```
┌──────────────────────────────────┐
│ 📊 站点统计                        │
│ 👁 总 PV：12,345                  │
│ 👥 总 UV：4,567                   │
│ 📈 今日 PV：123                   │
└──────────────────────────────────┘
```

每个文章页面显示单篇浏览量，ProfileBar 展示全站实时统计。

## 部署架构

Umami 是 Node.js 应用，需要 Postgres 或 MySQL 数据库。用 Docker Compose 一把梭：

```
blog.example.com  ──→  Cloudflare Pages (Astro 静态页面)
                          │
                          ├─ <script> 加载 umami.example.com/script.js
                          │
umami.example.com  ──→  云服务器 (203.0.113.1)
                          │
                          ├─ Nginx (反代 + SSL)
                          │   └─ proxy_pass → localhost:3000
                          │
                          └─ Docker Compose
                              ├─ umami (Node.js, port 3000)
                              └─ postgres (port 5432)
```

## 第一步：Docker Compose 部署 Umami

在服务器上找一个目录，比如 `~/umami/`，创建 `docker-compose.yml`：

```yaml
version: '3'
services:
  umami:
    image: ghcr.nju.edu.cn/umami-software/umami:postgresql-latest
    ports:
      - "127.0.0.1:3000:3000"
    environment:
      DATABASE_URL: postgresql://umami:example-db-password@db:5432/umami
      DATABASE_TYPE: postgresql
      APP_SECRET: example-app-secret-replace-with-openssl-rand
    depends_on:
      db:
        condition: service_healthy
    restart: unless-stopped

  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: umami
      POSTGRES_USER: umami
      POSTGRES_PASSWORD: example-db-password
    volumes:
      - ./pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U umami"]
      interval: 5s
      timeout: 5s
      retries: 5
    restart: unless-stopped
```

数据库密码和 APP_SECRET 换成你自己的。APP_SECRET 跑个 `openssl rand -hex 32` 生成。

```bash
# 启动
docker-compose up -d

# 确认跑起来了
docker-compose ps
# 应该看到两个容器都是 Up 状态
```

## 第二步：Nginx 反代 + SSL

Umami 跑在 `localhost:3000`，用一个子域名反代出去。在 `/etc/nginx/sites-available/` 中创建 `umami`：

```nginx
server {
    listen 80;
    server_name umami.example.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

记得配置 DNS，然后启用并上 SSL。

**不要直接用 `certbot --nginx`** — 它有概率把 SSL 配置写进 `default` 文件，导致 403。用更稳的 `certonly` 方式：

```bash
# 先启用 site（一定要在 certbot 之前做）
sudo ln -s /etc/nginx/sites-available/umami /etc/nginx/sites-enabled/

# 只申请证书，不动 nginx 配置
sudo certbot certonly --nginx -d umami.example.com
```

证书拿到后，补完整 SSL 配置：

```nginx
server {
    listen 80;
    server_name umami.example.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name umami.example.com;
    ssl_certificate /etc/letsencrypt/live/umami.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/umami.example.com/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
sudo nginx -t && sudo systemctl reload nginx
```

### 为什么不直接用 `certbot --nginx`

`certbot --nginx` 会自动修改 nginx 配置加 SSL，但它判断"改哪个文件"的逻辑有问题 — 如果 `default` 里有 `listen 80`，它可能把 SSL block 写进 `default` 而不是你的独立配置文件。结果就是：443 请求命中 `default` 的静态文件 `root`，反代没生效，返回 403。

## 第三步：在 Umami 添加网站

1. 浏览器打开 `https://umami.example.com`
2. 用刚创建的管理员账号登录
3. **Settings → Websites → Add website**
4. Name 随便填，Domain 填你博客域名
5. 创建后拿到 **Website ID**（一串 UUID）

## 第四步：博客集成

在 `ryuchan.config.yaml` 里填：

```yaml
umami:
  enable: true
  baseUrl: https://umami.example.com
  websiteId: your-website-id-here
  shareId: ""
  timezone: Asia/Shanghai
```

部署后 F12 → Network，应该能看到 `/script.js` 请求。

## 第五步：开启分享

博客底部的 PV/UV 数字需要开**分享功能**：

1. Umami 后台 → **Settings → Websites → 点你的网站**
2. **Share → Enable share URL**
3. 填入密码，保存后得到分享 URL
4. URL 中那段随机字符串就是 **shareId**，填进 `ryuchan.config.yaml`

### 原理

Umami Share API 不需要认证 token：

1. 请求 `/api/share/{shareId}` 获取临时 token
2. 带 token 请求 `/api/websites/{websiteId}/stats` 拉数据
3. 结果缓存 1 小时（localStorage）

## 不想自建？用 Umami Cloud

1. 打开 [cloud.umami.is](https://cloud.umami.is)
2. 注册账号，添加网站，拿 Website ID
3. baseUrl 填 `https://cloud.umami.is`

免费版 3 个网站 + 无限事件，个人博客够用。

## 实操要点

- **端口只绑 127.0.0.1**：Umami 容器别暴露到公网
- **数据库持久化**：`./pgdata` 映射出来
- **首次访问直接注册**：打开网页创建管理员账号
- **定期备份**：`pg_dump` 或直接备份 `./pgdata` 目录
- **APP_SECRET 很重要**：session 加密密钥，丢了所有登录失效
