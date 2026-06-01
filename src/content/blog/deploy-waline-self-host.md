---
title: 部署 Waline 评论系统到自己的服务器完全指南 (保姆级教程 2026)
description: >-
  从零部署 Waline 评论系统到自有服务器，涵盖 Docker、SQLite、
  Nginx 反代、前端接入、管理后台全流程。
pubDate: 2026-05-31
image: https://photo.nywerya.xyz/Obsidian/发布/注释/Waline-cover.png
draft: false
tags:
  - comment
  - docker
  - linux
  - self-host
  - tutorial
categories: []
slug: deploy-waline-self-host
cover: 发布/注释/Waline-cover.png
summary: 从零部署 Waline 评论系统到自有服务器，涵盖 Docker、SQLite、Nginx 反代、前端接入、管理后台全流程。
type: tutorial
original: "[[笔记/网络与服务器/Waline|Waline]]"
---

# 部署 Waline 评论系统到自己的服务器完全指南 (保姆级教程 2026)
## 简介

[Waline](https://waline.js.org) 是一个自托管的静态博客评论系统。基于 Node.js，**内置管理后台**，数据存 SQLite —— 意味着**不需要单独装数据库**，一个 Docker 容器就跑了。前端是 Web Component（Vue），原生支持暗黑模式、浏览量统计、表情包、Markdown 渲染、数学公式。

这篇教程假设你有一台服务器和一个域名，带你从零把 Waline 跑起来，每一步都有解释。

### 为什么选 Waline 而不是 Twikoo

| 对比 | Waline | Twikoo |
|-|--|--|
| 数据库 | SQLite（无需额外容器） | MongoDB（必须） |
| 管理后台 | 内置 `/ui`，注册即用 | 访问 `/#/login` 设置密码 |
| 垃圾过滤 | Akismet + IP 频率 + 关键词 + 相似度检测 | 仅 IP 频率限制 |
| 浏览量统计 | 内置，一行配置 | 不支持 |
| 前端框架 | Web Component（Vue） | 传统 JS |
| 暗黑模式 | `dark: 'auto'` 自适应 | 需手动适配 |
| 登录方式 | 注册 + GitHub OAuth | 仅密码 |
| 镜像体积 | ~150MB（含 SQLite） | 需额外 MongoDB 镜像 |

**结论：新项目直接用 Waline**，更轻量、功能更全、部署更简单。

-

## 第一步：准备工作

### 你需要这些

| 东西 | 说明 |
|-|-|
| 一台服务器 | 1c1g 足够。能 SSH 上去、能装 Docker |
| 一个域名 | 前端 HTTPS 页面无法请求 HTTP 后端，所以必须有域名配 SSL |
| 一个子域名 | 给 Waline 专用，比如 `comment.你的域名.com` |
| 15 分钟 | 从零到评论可用 |

### 没有域名怎么办

如果你还没有域名，先去任意域名注册商买一个（Namesilo / Cloudflare / 阿里云 都行）。最便宜的 `.xyz` 一年几块钱。

买完后，在你的 DNS 管理页面添加一条 A 记录，把子域名指向服务器 IP：

```
类型: A
主机记录: comment      （表示 comment.你的域名.com）
记录值:   123.456.789.0   （你的服务器公网 IP）
TTL:      600
```

DNS 生效可能需要几分钟。验证一下：

```bash
# 在服务器上执行，看子域名是否解析到你的服务器 IP
nslookup comment.example.com
```

-

## 第二步：安装 Docker

如果你的服务器还没装 Docker，先装上。

```bash
# 官方一键安装脚本
curl -fsSL https://get.docker.com | sudo sh

# 把当前用户加入 docker 组，以后不用每次加 sudo
sudo usermod -aG docker $USER

# 退出 SSH 重新登录，让用户组生效
exit
```

重新登录后验证：

```bash
docker -version
# 输出类似: Docker version 27.x.x, build ...

docker run -rm hello-world
# 输出 Hello from Docker! 表示 Docker 正常运行
```

> 如果 `docker pull` 特别慢或被墙，参考文末「常见问题」配镜像加速。

-

## 第三步：生成配置值

部署 Waline 前，先把要填的值准备好。以下 5 个值需要你替换成自己的：

### 3.1 JWT_TOKEN —— 管理员密钥

这是 Waline 内部用来签发登录凭证的密钥，**必须设，必须保密**。

```bash
# 在服务器上执行，生成一个随机字符串
openssl rand -hex 32
```

输出类似 `a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6a7b8c9d0e1f2a3b4c5d6e1f2a3b4c5d6`。**把这个字符串记下来**，后面要用。

> 不要用你别的密码，用 `openssl rand` 生成的随机值。

### 3.2 SITE_NAME —— 网站名称

随便写，会显示在管理后台和邮件通知里。比如「XX 的博客」。

### 3.3 SITE_URL —— 博客地址

你的博客完整地址，**带上 `https://`**。比如 `https://blog.example.com`。

Waline 用这个来判断哪些请求是合法的（CORS 白名单）。

### 3.4 SECURE_DOMAINS —— 安全域名

你的域名，**不带 `https://`**。比如 `blog.example.com`。

这是评论框允许嵌入的域名白名单。如果你有多个域名（比如 `example.com` 和 `www.example.com`），用逗号分隔：`example.com,www.example.com`。

### 3.5 AUTHOR_EMAIL —— 你的邮箱

收到新评论时会往这个邮箱发通知（需要配 SMTP，见第五步）。

### 填完后的参考

假设你的域名是 `blog.example.com`，子域名打算用 `comment.example.com`：

| 变量 | 值 |
|-|--|
| `JWT_TOKEN` | `a1b2c3d4...`（openssl rand 那串） |
| `SITE_NAME` | `我的博客` |
| `SITE_URL` | `https://blog.example.com` |
| `SECURE_DOMAINS` | `blog.example.com` |
| `AUTHOR_EMAIL` | `user@example.com` |

-

## 第四步：部署 Waline 后端

终于要开始部署了。以下操作全部在服务器上执行。

### 4.1 拉取镜像

```bash
docker pull lizheming/waline:latest
```

镜像大约 150MB，半分钟到一分钟能拉完。

### 4.1.5 安装 docker-compose（可选，推荐）

之后用 Compose 管理容器比手敲 `docker run` 方便得多，建议先装上：

```bash
sudo apt install -y docker-compose
```

> 如果你的 Docker 版本 ≥ 20.10，自带 `docker compose` 插件（注意是空格不是连字符），那么下面的 `docker-compose`（有连字符）命令要替换成 `docker compose`（空格）。版本查看：`docker -version`

### 4.2 创建数据目录

Waline 的评论数据存在 SQLite 文件里，这个文件需要挂载到宿主机，否则删容器数据就没了。

```bash
mkdir -p /opt/waline/data
```

`/opt/waline/data` 是约定俗成的路径，你想放别的地方也行，但后面命令里的路径要跟着改。

### 4.3 启动容器

把 3.1~3.5 准备好的值填进去，执行：

```bash
# 替换以下 5 个值:
#   JWT_TOKEN:      openssl rand -hex 32 生成
#   SITE_NAME:      你的网站名称（含 & 等特殊字符需加引号，如 "Code & Flower"）
#   SITE_URL:       你的博客域名，带 https://
#   SECURE_DOMAINS: 你的域名，不带 https://
#   AUTHOR_EMAIL:   你的邮箱

docker run -d \
  -name waline \
  -restart=unless-stopped \
  -p 127.0.0.1:8360:8360 \
  -v /opt/waline/data:/app/data \
  -e TZ=Asia/Shanghai \
  -e SQLITE_PATH=/app/data \
  -e JWT_TOKEN=a1b2c3d4... \
  -e "SITE_NAME=我的博客" \
  -e SITE_URL=https://blog.example.com \
  -e SECURE_DOMAINS=blog.example.com \
  -e AUTHOR_EMAIL=user@example.com \
  lizheming/waline:latest
```

每个参数的含义：

| 参数 | 作用 |
|-|-|
| `-d` | 后台运行 |
| `-name waline` | 给容器取名，方便后续操作 |
| `-restart=unless-stopped` | 服务器重启后自动启动容器 |
| `-p 127.0.0.1:8360:8360` | 只监听本机 8360 端口（不暴露公网，安全） |
| `-v /opt/waline/data:/app/data` | 把宿主机目录挂载进容器，数据持久化 |
| `-e SQLITE_PATH=/app/data` | 告诉 Waline SQLite 文件存哪 |
| `-e JWT_TOKEN=...` | 管理员登录密钥 |
| `-e SITE_NAME/URL/DOMAINS` | 站点信息 |
| `-e AUTHOR_EMAIL` | 博主邮箱 |

> **关键提示**：
> 1. bash 续行符 `\` 必须是该行最后一个字符，**后面不能跟任何东西（包括空格和 `# 注释`）**，否则续行会断裂。
> 2. 如果 `SITE_NAME` 含 `&` 等特殊字符，要用双引号包住整个 `-e "SITE_NAME=xxx"`，否则 bash 会把 `&` 解释为后台运行符。

### 4.4 验证容器状态

```bash
docker ps | grep waline
```

看到 `Up` 字样说明容器在运行：

```
abc123def456   lizheming/waline:latest   ...   Up 10 seconds   127.0.0.1:8360->8360/tcp   waline
```

也可以看日志确认有没有报错：

```bash
docker logs waline -tail 20
```

正常的话最后一行类似 `ThinkJS 3.x is running at http://127.0.0.1:8360`。

### 4.5 使用 Docker Compose（可选且推荐，在后面操作成功之后回来把配置写进文件里，再启动就不用用一大串命令）

用 Compose 管理比手敲 `docker run` 更方便，配置一目了然。

新建 `docker-compose.yml`：

```bash
mkdir -p /opt/waline && cd /opt/waline
```

```yaml
# docker-compose.yml
version: '3'
services:
  waline:
    container_name: waline
    image: lizheming/waline:latest
    restart: always
    ports:
      - 127.0.0.1:8360:8360
    volumes:
      - ./data:/app/data
    environment:
      TZ: Asia/Shanghai
      SQLITE_PATH: /app/data
      JWT_TOKEN: a1b2c3d4...              # ← 替换
      SITE_NAME: "我的博客"                # ← 替换：含特殊字符需引号
      SITE_URL: https://blog.example.com   # ← 替换
      SECURE_DOMAINS: blog.example.com     # ← 替换
      AUTHOR_EMAIL: user@example.com       # ← 替换
      IPQPS: 5
      AKISMET_KEY: "false"
```

启动：

```bash
# 重启服务
docker stop waline && docker rm waline
docker-compose up -d
docker ps | grep waline
```

后续改配置也是编辑 `docker-compose.yml` 然后 `docker-compose up -d` 即可。

-

## 第五步：Nginx 反代 + HTTPS

Waline 只监听了 `127.0.0.1:8360`，外部访问不到。需要用 Nginx 反代到公网，并配上 HTTPS。

用 Certbot 自动化处理证书 —— 比手动配 acme.sh 简单得多，一条命令就能搞定申请 + 配置 + 自动续期。

### 5.1 安装 Nginx 和 Certbot

```bash
sudo apt update
sudo apt install -y nginx certbot python3-certbot-nginx
```

### 5.2 创建临时 HTTP 站点

Certbot 需要通过 HTTP（80 端口）验证域名所有权，所以先建一个 HTTP-only 的 Nginx 站点。**替换 `server_name` 为你的子域名**：

```bash
sudo tee /etc/nginx/sites-available/waline <<'EOF'
server {
    listen 80;
    server_name comment.example.com;                       # ← 替换：你的子域名

    location / {
        proxy_pass http://127.0.0.1:8360;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header REMOTE-HOST $remote_addr;
    }
}
EOF
```

启用站点并重载 Nginx：

```bash
sudo ln -sf /etc/nginx/sites-available/waline /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

### 5.3 Certbot 自动获取 SSL 证书

**替换域名为你的子域名**，然后执行：

```bash
sudo certbot -nginx -d comment.example.com
```

Certbot 交互流程：

1. **输入邮箱** — 用于证书到期提醒（填你的真实邮箱）
2. **同意服务条款** — 输入 `Y`
3. **是否接收推广邮件** — 输入 `N`（看你自己）
4. **HTTP 是否自动跳转 HTTPS** — 选 **2 (Redirect)**

执行完后 certbot 自动做了三件事：
- 申请 Let's Encrypt SSL 证书
- 把 Nginx 配置改成 HTTPS + 证书路径
- 加了 HTTP→HTTPS 自动跳转

> 证书有效期 90 天，**certbot 安装时会自动注册 systemd timer，到期前自动续期**。手动检查续期状态：`sudo certbot renew -dry-run`

### 5.4 验证

```bash
curl https://comment.example.com
```

应该返回一段 JSON：

```json
{"name":"Waline","version":"x.x.x",...}
```

看到这个 JSON 说明后端已经通过 HTTPS 正常提供服了。

-

## 第六步：注册管理员

**这一步必须立刻做，免得被别人抢注。**

浏览器打开：

```
https://comment.example.com/ui/register
```

输入你的邮箱和密码，点击注册。**第一个注册的用户自动成为管理员**。

注册后就可以登录管理后台了：

```
https://comment.example.com/ui
```

管理后台长这样：

- 左侧是评论列表，可以审核、回复、删除、标星
- 右上角可以配置站点信息、导入导出数据
- 支持多用户管理

### 6.1 服务器目录结构

部署完成后，服务器上的文件布局：

```
/opt/waline/
├── docker-compose.yml         # 容器配置（如果用 Compose）
└── data/
    └── waline.sqlite           # 评论数据（挂了 volume，删容器不丢）

/etc/nginx/sites-available/waline   # Nginx 站点配置
/etc/nginx/sites-enabled/waline     # 已启用的 symlink
```

> 如果用 `docker run` 而非 Compose，则没有 `docker-compose.yml`，容器直接通过 `docker run` 命令管理。

-

## 第七步：前端接入

现在后端已经跑起来了，最后一步是把评论框嵌入你的博客页面。

### 7.1 基础接入

在你想显示评论框的位置（通常是文章页底部）加入以下代码：

```html
<!- 评论框会渲染到这个 div 里 ->
<div id="waline"></div>

<script type="module">
  import { init } from 'https://unpkg.com/@waline/client@v3/dist/waline.mjs';

  init({
    el: '#waline',                                 // 评论框要挂载的 DOM 元素
    serverURL: 'https://comment.example.com',       // ← 替换：你的 Waline 后端地址
    dark: 'auto',                                   // 自动跟随系统暗黑模式
    lang: 'zh-CN',                                  // 界面语言
    wordLimit: 500,                                 // 评论字数上限
    pageview: true,                                 // 开启文章浏览量统计
    emoji: [
      'https://unpkg.com/@waline/emojis@1.2.0/qq',   // QQ 表情包
      'https://unpkg.com/@waline/emojis@1.2.0/tieba', // 贴吧表情包
    ],
  });
</script>
```

`init()` 返回一个 Waline 实例，可以调用 `.update()` 更新配置，或 `.destroy()` 销毁。

### 7.2 浏览量统计（可选）

如果你想要文章阅读计数，在页面中放一个元素，然后开启 `pageview: true`：

```html
<!- data-path 填当前页面的路径，用于区分不同文章 ->
阅读量：<span class="waline-pageview-count" data-path="/posts/hello-world"></span> 次
```

Waline 会自动查找页面上所有 `.waline-pageview-count` 元素并填入计数。

### 7.3 常见博客框架的接入方式

不同框架的接入位置略有不同：

| 框架 | 在哪加代码 |
|-|---|
| Hugo | `layouts/_default/single.html` 或主题的评论区 partial |
| Hexo | 主题的 `layout/_partial/comments.ejs` 或文章模板 |
| Jekyll | `_layouts/post.html` |
| VuePress | `.vuepress/config.js` 的 `plugins.comment` 配置 |
| 纯 HTML | 每篇文章底部直接贴 |

各种框架的详细配置参考 [Waline 官方文档 - 客户端接入](https://waline.js.org/guide/get-started/client.html)。

### 7.4 验收

部署完前端后，打开你的博客，进入一篇文章，拉到最底：

1. 能看到评论输入框 ✓
2. 输入昵称、邮箱、内容，点发送 ✓
3. 评论成功出现在下方 ✓
4. 登录管理后台能看到这条评论 ✓

恭喜，Waline 已经完整跑起来了。

-

## 第八步：邮件通知（可选但建议配）

不配邮件的话，有人评论你不知道。配了 SMTP 后，新评论会自动发邮件通知你。

### QQ 邮箱配置示例

1. 登录 QQ 邮箱 → 设置 → 账户 → POP3/IMAP/SMTP 服务
2. 开启「SMTP 服务」，按提示发送短信验证
3. 获得一个 16 位的**授权码**（不是 QQ 密码！）
4. 把这个授权码填入 `SMTP_PASS`

添加以下环境变量（如果用的 `docker run`，加 `-e`；如果用 Compose，加在 `environment` 下）：

```bash
-e SMTP_SERVICE=QQ \
-e SMTP_USER=你的QQ号@qq.com \
-e SMTP_PASS=授权码 \
-e SENDER_NAME=Waline通知 \
```

重启容器生效：

```bash
docker restart waline
```

> 163 邮箱同理，去邮箱设置里开 SMTP 拿授权码，`SMTP_SERVICE` 填 `163`。

-

## 日常维护

### 升级 Waline

```bash
# Docker Compose 方式
cd /opt/waline
docker compose pull        # 拉最新镜像
docker compose up -d       # 重建容器

# docker run 方式
docker pull lizheming/waline:latest
docker stop waline && docker rm waline
# 重新执行第四步的 docker run 命令
```

数据在挂载目录里，删容器不会丢。

### 备份

```bash
# SQLite 数据就是一个文件（或几个），直接复制目录
cp -r /opt/waline/data /opt/backup/waline-$(date +%F)

# 建议加个 crontab 每天自动备份
# 0 3 * * * cp -r /opt/waline/data /opt/backup/waline-$(date +\%F)
```

### 恢复

```bash
# 把备份目录覆盖回数据目录，重启容器即可
cp -r /opt/backup/waline-2026-01-01 /opt/waline/data
docker restart waline
```

### 查看日志

```bash
docker logs waline -tail 50       # 最近 50 行
docker logs waline -f              # 实时跟踪（Ctrl+C 退出）
```

-

## 进阶：邮箱提醒失败排查

如果你配了 SMTP 但收不到通知邮件：

```bash
# 进入容器内部，手动测试邮件发送
docker exec -it waline sh
# 进容器后用 curl 测试发信（Waline 内部 ThinkJS 框架自带测试端点）
curl -X POST http://127.0.0.1:8360/comment \
  -H 'Content-Type: application/json' \
  -d '{"user_id":"test","comment":"测试评论"}'
```

收到评论后，看 Waline 日志有没有 SMTP 相关报错：

```bash
docker logs waline | grep -i smtp
```

常见原因：
- `SMTP_PASS` 填了邮箱密码而不是授权码（QQ/163 必须用授权码）
- SMTP 端口不对（QQ 是 465，163 也是 465，Gmail 是 587）
- 服务器防火墙屏蔽了 SMTP 端口（出站一般不拦，但如果拦了加白名单）

-

## 实战踩坑记录

以下问题来自本次部署的真实踩坑，建议先过一遍。

### 踩坑 1：bash 命令 `\` 后面不能跟注释

```bash
# ❌ 错误：注释会让续行断裂，docker 只执行了第一行
docker run -d \
  -name waline \
  -e SITE_NAME=xxx \   # ← 这个注释会破坏续行

# ✓ 正确：注释单独写，\ 必须是行末最后一个字符
#   以下是替换说明:
#     SITE_NAME: 你的网站名称
docker run -d \
  -name waline \
  -e SITE_NAME=xxx
```

### 踩坑 2：SITE_NAME 含 `&` 必须加引号

`SITE_NAME=Code & Flower` 在 bash 里 `&` 会被解释为「放后台运行」，命令就断了。

```bash
# ❌ 错误
-e SITE_NAME=Code & Flower

# ✓ 正确：双引号包住整个 key=value
-e "SITE_NAME=Code & Flower"
```

YAML（Compose）里同样需要：

```yaml
# ✓ 正确
SITE_NAME: "Code & Flower"
```

### 踩坑 3：SECURE_DOMAINS 必须包含管理后台域名

`SECURE_DOMAINS` 控制的是 Waline API 允许哪些域名跨域访问。**管理后台也在 `comment.xxx.com` 上，不加上去的话注册/登录 API 返回 403。**

```bash
# ❌ 错误：只写了博客域名
-e SECURE_DOMAINS=blog.example.com

# ✓ 正确：博客域名 + 管理后台域名，逗号分隔
-e SECURE_DOMAINS=blog.example.com,comment.example.com
```

### 踩坑 4：SQLite 文件需要预初始化

直接删掉 `waline.sqlite` 后重启容器，Waline 会创建一个 0 字节的空文件，**不会自动建表**，注册时报 `no such table: wl_Users`。

解决办法 —— 下载官方预初始化的数据库文件：

```bash
# GitHub 直连失败用镜像
wget -O /opt/waline/data/waline.sqlite \
  https://ghproxy.net/https://raw.githubusercontent.com/walinejs/waline/main/assets/waline.sqlite
docker restart waline
```

> 如果你已经注册了用户再删数据库，数据会丢失。升级或迁移不要直接删文件，用管理后台的导出/导入功能。

### 踩坑 5：社交登录（GitHub/QQ）在国内可能 403

Waline 的第三方登录走 `oauth.lithub.cc` 代理，这个服务在国内访问不稳定，经常返回 403。**这不是你配置的问题**，是代理服务本身的问题。

**用邮箱注册就够了**，去 `/ui/register` 填邮箱和密码。访客评论也可以用昵称 + 邮箱，不需要登录。

### 账号归属

Waline 跑在你自己的服务器上，所有用户注册的账号、评论数据都存在你的 `/opt/waline/data/waline.sqlite` 里。**账号只在你的网站有效**，去别人家用 Waline 的网站需要重新注册——这不是 SaaS 平台。

-

## 常见问题

### 评论一直转圈、发送失败

99% 是 `serverURL` 填错了或者 HTTPS 证书有问题。

排查步骤：

1. 浏览器 F12 → Console → 看报错信息
2. 如果是 `Failed to fetch`：检查 `serverURL` 是否以 `https://` 开头
3. 直接浏览器访问 `https://你的子域名`，看是否返回 JSON
4. 检查证书是否过期：`curl -I https://你的子域名`

### 关闭垃圾评论过滤，加快评论速度

设置 `AKISMET_KEY=false` 关闭 Akismet 检测：

```bash
# docker run 方式加这行
-e AKISMET_KEY=false

# 如果已经跑起来了
docker stop waline && docker rm waline
# 重新 docker run 时加上上面的 -e AKISMET_KEY=false
```

### Failed to fetch 错误

```
POST https://comment.example.com/comment net::ERR_FAILED
```

原因排查：

1. **Waline 没在运行**：`docker ps | grep waline`
2. **Nginx 没反代对**：`curl http://127.0.0.1:8360` 看看本地能不能访问
3. **HTTPS 证书过期**：`curl -Iv https://comment.example.com` 看证书信息
4. **域名 DNS 没解析**：`nslookup comment.example.com`
5. **防火墙没开放**：443 端口要在安全组里放行

### 管理后台打不开 / 404

- 确认 URL 路径是 `/ui`，不是 `/ui/`（末尾不加斜杠）
- 首次访问应该去 `/ui/register` 注册
- 如果 `/ui` 返回页面但是空白：检查浏览器是否有广告拦截插件，暂时关掉

### Docker pull 太慢或失败

国内服务器拉 Docker 镜像可能会很慢。配镜像加速：

```bash
sudo tee /etc/docker/daemon.json <<-'EOF'
{
  "registry-mirrors": [
    "https://docker.xuanyuan.me",
    "https://docker.1ms.run",
    "https://docker.m.daocloud.io"
  ]
}
EOF
sudo systemctl daemon-reload
sudo systemctl restart docker
```

### LeanCloud 用户迁移到自建

如果你以前用 LeanCloud 版 Waline，现在想迁移到自建 SQLite：

1. 登录 LeanCloud → 找到 Waline 应用 → 导出数据（JSON 或 CSV）
2. 自建 Waline 跑起来后，在管理后台 `/ui` 里有「导入」功能
3. 把导出的数据导入即可

### 升级 @waline/client v2 → v3

`@waline/client` v3 的初始化方式从 `Waline.init()` 变成了 `init()`，API 不兼容。如果你的博客还在用 v2 的 CDN 地址，升级时注意同步改前端代码。

-

## 参考

- [Waline 官方文档](https://waline.js.org)
- [服务端环境变量完整列表](https://waline.js.org/reference/server/env.html)
- [客户端配置参考](https://waline.js.org/reference/client/props.html)
- [Certbot 文档](https://eff-certbot.readthedocs.io)
- [Docker 镜像加速](https://docs.docker.com/engine/daemon/daemon.json/)
