---
title: Syncthing 部署与配置指南
description: 开源 P2P 文件同步工具 Syncthing 的完整部署教程，涵盖 Nginx 反代、踩坑实录与诊断命令。
pubDate: 2026-06-11T21:15
image: https://photo.nywerya.xyz/Obsidian/发布/注释/Syncthing-cover.png
draft: false
tags:
  - syncthing
  - nginx
  - self-host
  - tutorial
categories:
  - 教程
slug: p2p-file-sync-setup
cover: 发布/注释/Syncthing-cover.png
summary: Syncthing 开源 P2P 文件同步工具的完整部署教程，含 Nginx 反代配置与踩坑实录。
type: tutorial
original: "[[笔记/网络与服务器/Syncthing|Syncthing]]"
---

![封面](https://photo.nywerya.xyz/Obsidian/发布/注释/Syncthing-cover.png)

# Syncthing 部署与配置指南

Syncthing 是一款开源的连续文件同步工具，P2P 架构，无需中心服务器。本文记录在云服务器上部署 Syncthing 并配置 Nginx 反代的全过程。

## GUI 访问

GUI 默认监听 `127.0.0.1:8384`（仅本地）。**不要改为 `0.0.0.0`**——走 Nginx 反代更安全。

### 临时：SSH 隧道

```bash
ssh -L 8384:127.0.0.1:8384 root@服务器IP -N
```

浏览器 `http://127.0.0.1:8384`。

### 长期：Nginx 反代 + HTTPS

```bash
sudo nano /etc/nginx/sites-available/syncthing
```

```nginx
server {
    listen 443 ssl;
    server_name sync.example.com;

    ssl_certificate     /etc/letsencrypt/live/sync.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/sync.example.com/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:8384;
        proxy_http_version 1.1;
        proxy_set_header Host 127.0.0.1:8384;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/syncthing /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

DNS 添加 A 记录 `sync → 203.0.113.1`，certbot 申请证书：

```bash
sudo certbot --nginx -d sync.example.com
```

### 踩坑：403 Forbidden

直接访问 `127.0.0.1:8384` 返回 200，但通过域名返回 403。两个原因叠加：

| 序号 | 原因 | 现象 | 修复 |
|-|-|-|-|
| 1 | Certbot 生成的 server block 是**静态文件服务器**（`root` + `try_files`），不是反代 | nginx 尝试从 `/var/www/html` 找文件，找不到返回 403 | 改为 `proxy_pass http://127.0.0.1:8384` |
| 2 | Syncthing 的 **CSRF Host 校验**拒绝域名头 | 改了反代后依然 403 | `proxy_set_header Host 127.0.0.1:8384`（传 Syncthing 自己监听的地址） |

> 关键：Host 头不能传 `$host`（域名），必须传 `127.0.0.1:8384`，Syncthing 才认。

## 同步端口

### 防火墙

```bash
sudo ufw allow 22000/tcp
sudo ufw allow 21027/udp
```

### 阿里云安全组

| 端口 | 协议 | 授权 |
|-|-|-|
| 22000 | TCP | 0.0.0.0/0 |
| 21027 | UDP | 0.0.0.0/0 |

### 监听地址

GUI 仅本地，同步端口监听所有接口：

```xml
<!-- ~/.local/state/syncthing/config.xml -->
<gui enabled="true" tls="false">
    <address>127.0.0.1:8384</address>
</gui>
<options>
    <listenAddress>tcp://0.0.0.0:22000</listenAddress>
</options>
```

### NAT 穿透验证

云服务器无 UPnP（`Detected NAT services: count=0` 正常）。开端口后确认直连：

```bash
# 看日志：不应再有 "Joined relay"
journalctl -u syncthing -f | grep -i relay
# 应出现 quic://公网IP:22000，不再走 relay
```

## 设置访问密码

```xml
<gui enabled="true" tls="false">
    <address>127.0.0.1:8384</address>
    <user>admin</user>
    <password>example-password</password>
</gui>
```

密码会在下次启动时自动哈希。

## 开机自启

```bash
mkdir -p ~/.config/systemd/user
```

```ini
# ~/.config/systemd/user/syncthing.service
[Unit]
Description=Syncthing - Open Source Continuous File Synchronization
Documentation=man:syncthing(1)
After=network.target

[Service]
ExecStart=/usr/local/bin/syncthing -no-browser -gui-address=127.0.0.1:8384 -logflags=0
Restart=on-failure
RestartSec=10
UMask=0027
Environment=STNORESTART=1

[Install]
WantedBy=default.target
```

```bash
systemctl --user daemon-reload
systemctl --user enable syncthing.service
systemctl --user start syncthing.service
systemctl --user status syncthing.service
```

## 诊断命令

```bash
# GUI 监听
ss -tlnp | grep 8384

# 同步端口
ss -tlnp | grep 22000

# 外部可达性
nc -zv 203.0.113.1 22000

# GUI 可达性
curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:8384
curl -s -o /dev/null -w "%{http_code}" https://sync.example.com

# 实时日志
journalctl -u syncthing -f

# 检查 relay 状态（无输出=直连成功）
journalctl -u syncthing --since "5 min ago" | grep "Joined relay"
```
