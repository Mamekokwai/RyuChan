---
title: 自建图床：Syncthing + Nginx 零成本图片 CDN
description: 利用 Syncthing 实时同步 + Nginx 静态服务，把已有服务器变成个人图片 CDN。Obsidian 写作流程零改变，数据全在自己手里。
pubDate: 2026-06-12T12:30
image: https://photo.nywerya.xyz/Obsidian/发布/注释/自建图床-cover.png
draft: false
tags:
  - 图床
  - Nginx
  - 自托管
categories:
  - 教程
slug: self-host-image-cdn
cover: 发布/注释/自建图床-cover.png
summary: 利用 Syncthing 实时同步 + Nginx 静态服务搭建个人图床，写作流程零改变。
type: tutorial
original: "[[笔记/网络与服务器/自建图床-Syncthing+Nginx|自建图床-Syncthing+Nginx]]"
Release Platform:
  - blog.nywerya.xyz
---

# 自建图床：Syncthing + Nginx

## 思路

```
本地 Vault 图片  ──Syncthing──▶  服务器 /var/www/photo/  ──Nginx──▶  photo.example.com/xxx.png
```

本地写完笔记直接丢图到 vault 里，Syncthing 自动推到服务器，Nginx 提供公网访问。写作流程零改变。

重点：保留了 vault 的文件结构，只需要添加链接头即可访问。

## 第一步：服务器准备

### 1.1 创建图片目录 + 占位页

```bash
sudo mkdir -p /var/www/photo
sudo chown $USER:$USER /var/www/photo
```

```bash
# 占位页面，避免空目录 403
cat > /var/www/photo/index.html << 'EOF'
<!DOCTYPE html>
<html lang="zh">
<head><meta charset="UTF-8"><title>Photo</title></head>
<body><h1>Photo CDN</h1></body>
</html>
EOF
```

### 1.2 配置 Nginx（先 80，不要写 SSL）

```bash
sudo nano /etc/nginx/sites-available/photo
```

```nginx
server {
    listen 80;
    server_name photo.example.com;

    root /var/www/photo;
    index index.html;

    # 允许跨域（博客站点引用图片）
    add_header Access-Control-Allow-Origin "*";

    # 图片缓存 1 年
    location ~* \.(png|jpg|jpeg|webp|gif|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/photo /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

### 1.3 DNS + Certbot 自动升级 HTTPS

DNS 先加 A 记录：`photo → 203.0.113.1`，生效后：

```bash
sudo certbot --nginx -d photo.example.com
```

Certbot 会自动：

- 申请证书
- 把 `listen 80` 改为 `listen 443 ssl`
- 补上 `ssl_certificate` / `ssl_certificate_key` 路径

> **关键**：不要手写 SSL 配置——证书还不存在时 nginx 配置校验会失败，certbot 也无法运行。先 `listen 80`，让 certbot 自己升级。

## 第二步：Syncthing 同步

### 2.1 添加共享目录

在服务器 Syncthing 的 GUI 中：

1. **添加文件夹** → 路径填 `/var/www/photo`
2. 文件夹 ID 随意，如 `photo-cdn`
3. 在「共享」选项卡，选择你的本地电脑

### 2.2 本地电脑接受

本地 Syncthing 收到共享请求后，路径选 vault 的图片目录，接受。

### 2.3 筛选同步（.stignore）

在服务器 `/var/www/photo/.stignore` 里创建：

```
# 不同步 Syncthing 冲突文件
.sync-conflict-*

# 不同步临时文件
*.tmp
*.temp
~$*

# 只同步图片
!*.png
!*.jpg
!*.jpeg
!*.webp
!*.gif
!*.svg
!*.ico

# 默认拒绝
*
```

> `.stignore` 的规则：`!` 是允许，`*` 是拒绝所有。上面意思是"只同步图片文件"。

## 第三步：与 Obsidian 写作流程对接

### 3.1 本地写文章时

仍然用 Obsidian 的 wiki 链接：

```markdown
![[笔记/工具软件/CopyQ/data/注释/screenshot.png]]
```

### 3.2 发布时替换链接

发布到博客时，将 `![[...]]` 替换为 Markdown 标准格式：

```markdown
![screenshot](https://photo.example.com/笔记/CopyQ/data/注释/screenshot.png)
```

转换规则：去掉 `[[`-`]]`，加上 `https://photo.example.com/` 前缀。

## 第四步：验证

```bash
# 服务器放一张测试图
touch /var/www/photo/test.png
```

```bash
# 公网可达性
curl -s -o /dev/null -w "%{http_code}" https://photo.example.com/test.png
# 应返回 200
```

```bash
# 缓存头
curl -I https://photo.example.com/test.png 2>/dev/null | grep -i cache
# Cache-Control: public, immutable
```

## 优缺点

| 维度 | 评价 |
| - | - |
| 成本 | ✅ 用已有服务器，零额外支出 |
| 速度 | ⚠️ 家用服务器上行带宽有限（10-30Mbps），大图加载慢 |
| 维护 | ⚠️ 需要维护 Nginx + Syncthing + SSL 证书 |
| CDN | ❌ 无 CDN，全国/全球访问不如云对象存储 |
| 写作体验 | ✅ 零改变——扔图进 vault，自动同步 |
| 数据安全 | ✅ 数据全在手里，不怕图床跑路 |

如果后续图片多了、访问慢了，可以升级到 Cloudflare R2（配合 PicGo），Syncthing + Nginx 作为起步方案够用。
