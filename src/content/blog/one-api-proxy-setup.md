---
title: one-api 中转站搭建教程 — 聚合 API 赚差价
description: 用 one-api 搭建自己的 AI API 中转站，聚合 DeepSeek/OpenAI/Claude，统一管理 Key，按量计费赚取差价。附 Cloudflare Workers 零成本起步方案。
pubDate: 2026-06-12T13:20
image: https://photo.nywerya.xyz/Obsidian/发布/注释/OneAPI-cover.png
draft: false
tags:
  - one-api
  - docker
  - ai
  - self-host
  - tutorial
categories:
  - 教程
slug: one-api-proxy-setup
cover: 发布/注释/OneAPI-cover.png
summary: Docker 部署 one-api 聚合多平台 AI API，统一管理 Key 并按量计费，附 Cloudflare Workers 零成本方案。
type: tutorial
original: "[[笔记/AI/one-api搭建_中转站部署教程|one-api 中转站搭建教程]]"
---

![封面](https://photo.nywerya.xyz/Obsidian/发布/注释/OneAPI-cover.png)

# one-api 中转站搭建教程

API 中转站的核心思路：**你有上游 API Key（DeepSeek/OpenAI/Claude），下游用户通过你中转调用，你赚差价**。

开源项目 [one-api](https://github.com/songquanpeng/one-api) 帮你搞定：聚合多平台 API → 统一管理 → 生成子 Key → 按量计费。

## 一、你需要什么

| 资源 | 说明 |
|------|------|
| 一台服务器 | 轻量云 ¥50-100/月（阿里云/腾讯云），1核2G 够用 |
| 一个域名 | 用于中转站访问（api.你的域名.com），可选 |
| 上游 API Key | DeepSeek 官网注册送额度，或找上游渠道 |
| Docker 环境 | 服务器上装好 Docker + docker-compose |

## 二、服务器初始化

SSH 登录后：

```bash
# 更新系统
sudo apt update && sudo apt upgrade -y

# 安装 Docker
curl -fsSL https://get.docker.com | sudo bash
sudo usermod -aG docker $USER

# 安装 docker-compose
sudo apt install docker-compose -y

# 防火墙只开 80/443/22
sudo ufw allow 22
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable

# 重新登录使 docker 权限生效
exit
```

## 三、部署 one-api

### 3.1 Docker 一键启动

```bash
docker run -d \
  --name one-api \
  --restart always \
  -p 3000:3000 \
  -v /opt/one-api/data:/data \
  -e TZ=Asia/Shanghai \
  justsong/one-api
```

验证：

```bash
docker ps | grep one-api
curl http://localhost:3000
# 应返回 one-api 的 HTML 页面
```

### 3.2 配置 Nginx 反代 + SSL（如果有域名）

```bash
sudo nano /etc/nginx/sites-available/api
```

```nginx
server {
    listen 80;
    server_name api.example.com;

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
sudo ln -s /etc/nginx/sites-available/api /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d api.example.com
```

### 3.3 初始登录

浏览器打开 `http://你的服务器IP:3000` 或 `https://api.example.com`

- 默认账号：`root`
- 默认密码：`123456`
- **登录后第一件事：改密码！** 右上角头像 → 修改密码

## 四、配置渠道（接入上游 API）

### 4.1 添加 DeepSeek 渠道

渠道 → 添加渠道：

| 字段 | 值 |
|------|-----|
| 类型 | DeepSeek |
| 名称 | DeepSeek |
| 分组 | default |
| 模型 | `deepseek-chat`, `deepseek-reasoner` |
| 密钥 | 你的 DeepSeek API Key |
| 代理 | 留空（除非需要反代地址） |

### 4.2 添加 OpenAI 渠道（可选）

| 字段 | 值 |
|------|-----|
| 类型 | OpenAI |
| 名称 | OpenAI |
| 分组 | default |
| 模型 | `gpt-4o`, `gpt-4o-mini` |
| 密钥 | 你的 OpenAI API Key |

### 4.3 添加 Claude 渠道（可选，需反代）

Claude API 对国内 IP 不友好，需要反代。在代理栏填反代地址，或通过 Cloudflare Workers 中转（见第七节）。

### 4.4 添加自定义渠道（对接其他中转站）

如果你的上游也是中转站（兼容 OpenAI 格式）：

| 字段 | 值 |
|------|-----|
| 类型 | 自定义渠道 |
| 名称 | 上游中转 |
| 分组 | default |
| 模型 | `gpt-4o`, `claude-sonnet-4-6` 等 |
| 密钥 | 上游给的 Key |
| 代理 | 上游中转站的 API 地址 |

## 五、定价策略：设置倍率

### 5.1 模型倍率设置

模型 pricing → 编辑每个模型的倍率：

- DeepSeek 官方价格：输入 ¥1 / 百万 token
- 倍率设为 **2.0**：用户付费 ¥2 / 百万 token
- 你的毛利：¥1 / 百万 token（成本 ¥1，收 ¥2）

建议倍率：

| 模型 | 官方价（约）| 建议倍率 | 用户价（约）|
|------|-----------|---------|-----------|
| DeepSeek Chat | ¥1/M | 1.5-2.0 | ¥1.5-2/M |
| DeepSeek Reasoner | ¥4/M | 1.5-2.0 | ¥6-8/M |
| GPT-4o | ¥35/M | 1.3-1.5 | ¥45-52/M |
| Claude Sonnet | ¥45/M | 1.3-1.5 | ¥58-67/M |

- **低价模型用高倍率**：DeepSeek 本身便宜，用户对 ¥1 和 ¥2 不敏感，2 倍就是 100% 毛利
- **高价模型用低倍率**：GPT/Claude 单价高，倍率高了用户会被吓跑

### 5.2 用户分组（差异化定价）

可以为不同用户设置不同分组，每个分组对应不同倍率：

- `default` 分组：标准价格（倍率 2.0）
- `vip` 分组：大客户优惠（倍率 1.5）
- `trial` 分组：体验组（倍率 1.0，不赚钱，纯引流）

## 六、生成用户 Key

用户 → 添加用户 → 生成 Key：

1. 填写用户名（客户昵称）
2. 设置额度（如 ¥50）
3. 选择分组（default / vip）
4. 生成 → 复制 Key 发给客户

客户拿到 Key 后，在 Claude Code / Cursor 等工具里配置 API 地址和 Key 就能用。

**API 地址**：`https://api.example.com/v1`（兼容 OpenAI 格式）

## 七、零成本方案：Cloudflare Workers

如果暂时不想买服务器，用 Cloudflare Workers 免费搭反代：

### 7.1 创建 Worker

登录 Cloudflare → Workers & Pages → 创建 → 编辑代码：

```js
export default {
  async fetch(request) {
    const url = new URL(request.url);
    
    // 反代到 DeepSeek API
    const targetUrl = "https://api.deepseek.com" + url.pathname;
    
    // 验证用户 Key（简单鉴权）
    const userKey = request.headers.get("Authorization");
    const VALID_KEYS = ["sk-user1-xxx", "sk-user2-yyy"];
    
    if (!userKey || !VALID_KEYS.includes(userKey.replace("Bearer ", ""))) {
      return new Response("Unauthorized", { status: 401 });
    }
    
    // 替换为你的 DeepSeek Key
    const newHeaders = new Headers(request.headers);
    newHeaders.set("Authorization", "Bearer sk-your-deepseek-key");
    
    return fetch(targetUrl, {
      method: request.method,
      headers: newHeaders,
      body: request.body
    });
  }
};
```

### 7.2 绑定自定义域名

Worker → 设置 → 触发器 → 自定义域 → 添加 `api.example.com`

### 7.3 局限性

- Workers 免费版每天 10 万次请求，个人用够
- 只能反代一个上游，不能像 one-api 聚合多平台
- 没有额度管理系统，需要手动计费
- **适合起步验证需求，确认有客户了再升级到 one-api**

## 八、运维要点

### 8.1 监控余额

one-api 后台 → 渠道 → 点击「测试」检查上游 Key 是否有效。建议每周检查一次余额。

### 8.2 备份数据

```bash
# one-api 数据在 /opt/one-api/data/
tar -czf one-api-backup-$(date +%Y%m%d).tar.gz /opt/one-api/data/
```

### 8.3 防止滥用

- 单用户设置额度上限（如 ¥200）
- 发现异常调用立刻禁用 Key
- 在用户协议里写明「禁止自动化批量调用」

### 8.4 多账号分散风险

DeepSeek 一个账号免费额度有限。如果客户量大：多注册几个 DeepSeek 账号，在 one-api 里添加多个同类型渠道，自动负载均衡。

## 九、成本收益估算

| 项目 | 月成本 |
|------|--------|
| 轻量云服务器 | ¥50-100 |
| 域名（年付） | ¥20-50/年 ≈ ¥2-4/月 |
| 上游 API 成本 | 看客户用量 |

假设有 10 个稳定客户，每人月均消耗 ¥50 的 API：

- 月流水：10 × ¥50 = ¥500
- 上游成本（倍率 2.0）：¥250
- 毛利：¥500 - ¥250 - ¥100（服务器）= **¥150/月**

客户越多，固定成本摊得越薄。30 个客户时毛利超过 ¥500/月。

## 十、升级路径

1. **起步**：Cloudflare Worker 免费方案，验证有客户愿意付费
2. **有稳定 5-10 个客户后**：上服务器 + one-api，正规化管理
3. **规模化**：多上游 → 自动负载均衡 → 监控告警 → 自动充值

关键是**先验证需求再投入**，不要服务器买了一堆没客户。
