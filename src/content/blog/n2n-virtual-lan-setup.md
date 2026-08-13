---
title: N2N 虚拟局域网搭建 — 一键脚本 + 联机游戏实战
description: 用 N2N 自建虚拟局域网，解决无法 IP 直连游戏的联机问题（以撒/饥荒等）。含一键部署脚本和服务端/客户端完整配置。
pubDate: 2026-06-12T13:20
image: https://photo.nywerya.xyz/Obsidian/发布/注释/N2N-cover.png
draft: false
tags:
  - n2n
  - vpn
  - gaming
  - self-host
  - tutorial
categories:
  - 教程
slug: n2n-virtual-lan-setup
cover: 发布/注释/N2N-cover.png
summary: 用 N2N 自建虚拟局域网，解决无法 IP 直连游戏的联机问题，含一键部署脚本和服务端/客户端完整配置。
type: tutorial
original: "[[笔记/网络与服务器/虚拟局域网N2N|虚拟局域网N2N]]"
Release Platform:
  - blog.nywerya.xyz
---

# N2N 虚拟局域网搭建

## 为什么搭虚拟局域网

和朋友联机玩以撒的结合，被土豆服务器折磨到无言。以撒的联机不同于泰拉瑞亚与 MC，无法使用 IP 直连，内网穿透（frp）也无能为力——只能上虚拟局域网。

**原理**：将不同局域网的用户通过中转节点（Supernode）形成一个模拟的局域网，功能等效于物理局域网，支持所有局域网联机游戏。以撒和饥荒这类游戏的联机方式虽然不能选"局域网联机"，但会自动找到最优网络路径，刚打通的虚拟局域网也在其中。

## 服务端

服务器操作系统：Ubuntu 24.04

### 安装 N2N

```bash
# 更新 apt
sudo apt update
apt install cmake

# 下载 v3.1.1 稳定版
cd /tmp
rm -rf n2n
git clone https://github.com/ntop/n2n.git
cd n2n
git checkout 3.1.1

# 编译安装
mkdir build && cd build
cmake ..
make -j4
sudo make install

# 验证
/usr/local/bin/edge --version
/usr/local/bin/supernode --version

# 创建符号链接
sudo ln -sf /usr/local/bin/edge /usr/bin/edge
sudo ln -sf /usr/local/bin/supernode /usr/bin/supernode
```

### 配置 Supernode（超级节点）

```bash
# 创建配置文件
sudo sh -c 'cat > /etc/n2n/supernode.conf << "EOF"
-p=7654
-m=5645
-f=/etc/n2n/communities.list
-l=/var/log/n2n/supernode.log
-r
EOF'
```

创建 systemd 服务：

```bash
sudo sh -c 'cat > /etc/systemd/system/n2n-supernode.service << "EOF"
[Unit]
Description=N2N Supernode v3.1.1
After=network.target

[Service]
Type=simple
ExecStart=/usr/local/sbin/supernode -p 7654 -f -i 203.0.113.1
Restart=always
RestartSec=10
User=root

[Install]
WantedBy=multi-user.target
EOF'
```

启动：

```bash
sudo systemctl daemon-reload
sudo systemctl start n2n-supernode
sudo systemctl enable n2n-supernode
```

检查运行状态：

```bash
sudo systemctl status n2n-supernode --no-pager
sudo netstat -tulnp | grep 7654
ps aux | grep supernode
sudo journalctl -u n2n-supernode -f --no-pager
```

### 服务器配置 Edge（服务器也要加入网络）

```bash
sudo sh -c 'cat > /etc/systemd/system/n2n-edge.service << "EOF"
[Unit]
Description=N2N Edge Client v3.1.1
After=network.target n2n-supernode.service
Wants=n2n-supernode.service

[Service]
Type=simple
ExecStart=/usr/local/sbin/edge -d n2n0 -a 10.0.0.1 -c mycommunity -k mysecretkey -l 127.0.0.1:7654 -f
Restart=always
RestartSec=10
User=root

[Install]
WantedBy=multi-user.target
EOF'

sudo systemctl daemon-reload
sudo systemctl start n2n-edge
sudo systemctl enable n2n-edge
```

### 检查与调试

```bash
# 检查 edge 进程
ps aux | grep edge

# 查看网卡
ip link show | grep n2n

# 监听端口
sudo tcpdump -i any udp port 7654 -vv -n

# 查看日志
sudo journalctl -u n2n-supernode -n 50
```

## 客户端

使用 [EasyN2N](https://bugxia.com/357.html) 软件：

1. 在自定义服务器内填写服务器 IP 和端口
2. 填写小组名称（与服务器 `-c` 参数一致）
3. 在软件设置中添加密钥附加参数：

```bash
-k mysecretkey
```

1. 连接即可

## 直连命令（不用 EasyN2N）

```bash
# 基本直连
edge -a 10.0.0.10 -c mycommunity -k mysecretkey -l 203.0.113.1:7654 -d n2n1
```

```bash
# 如果使用端口映射
edge -a 10.0.0.10 -c mycommunity -k mysecretkey -l example.com:54332 -d n2n1
```

## 一键安装脚本

需要一台云服务器（2c2g 够用，1c0.5g 也能跑，重要的是网速≥1Mbps）。

```bash
#!/bin/bash
# feat: 一键部署 n2n 局域网
# 系统要求: Ubuntu 24.04
# 网络要求: 能使用 apt 安装软件包, 能 git 抓取 github 文件

LOG_FILE="/var/log/n2n-deploy.log"
N2N_VERSION="3.1.1"
SUPERNODE_PORT=7654
EDGE_IP="10.0.0.1"
COMMUNITY="mycommunity"
SECRET_KEY="mysecretkey"  # 请换成自己的密钥！

# 停止已有服务
sudo systemctl stop n2n-supernode n2n-edge 2>/dev/null

# 日志函数
log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"
}

error_exit() {
    log "错误: $*"
    exit 1
}

# 检查是否为 root
if [ $EUID -ne 0 ]; then
    error_exit "此脚本必须以 root 权限运行！请使用 sudo。"
fi

log "开始部署 n2n v$N2N_VERSION..."

# 更新 apt 并安装依赖
log "更新 apt 并安装必要工具..."
apt update >> "$LOG_FILE" 2>&1 || error_exit "apt update 失败"
apt install -y cmake git build-essential >> "$LOG_FILE" 2>&1 || error_exit "安装依赖失败"

# 安装 n2n
echo "是否需要安装 n2n? (y/n)"
read choice
if [ "$choice" = "y" ] || [ "$choice" = "Y" ]; then
  cd /tmp || error_exit "无法进入 /tmp 目录"
  log "清理旧的 n2n 目录..."
  rm -rf n2n

  log "克隆 n2n 仓库..."
  git clone https://github.com/ntop/n2n.git >> "$LOG_FILE" 2>&1 || error_exit "git clone 失败"
  cd n2n || error_exit "无法进入 n2n 目录"

  log "切换到版本 $N2N_VERSION..."
  git checkout "$N2N_VERSION" >> "$LOG_FILE" 2>&1 || error_exit "无法切换到 tag $N2N_VERSION"

  log "配置并编译 n2n..."
  mkdir -p build && cd build || error_exit "无法创建 build 目录"
  cmake .. >> "$LOG_FILE" 2>&1 || error_exit "cmake 配置失败"
  make -j$(nproc) >> "$LOG_FILE" 2>&1 || error_exit "编译失败"

  log "安装 n2n..."
  make install >> "$LOG_FILE" 2>&1 || error_exit "安装失败"

  ln -sf /usr/local/bin/edge /usr/bin/edge
  ln -sf /usr/local/bin/supernode /usr/bin/supernode
fi

# 创建配置目录
mkdir -p /etc/n2n /var/log/n2n

# 写入 supernode 配置
log "写入 supernode 配置..."
cat > /etc/n2n/supernode.conf <<EOF || error_exit "写入 supernode.conf 失败"
-p=$SUPERNODE_PORT
-m=5645
-f=/etc/n2n/communities.list
-l=/var/log/n2n/supernode.log
-r
EOF

# 写入 supernode systemd 服务
log "创建 supernode systemd 服务..."
cat > /etc/systemd/system/n2n-supernode.service <<EOF || error_exit "创建 supernode service 失败"
[Unit]
Description=N2N Supernode v$N2N_VERSION
After=network.target

[Service]
Type=simple
ExecStart=/usr/local/sbin/supernode -p $SUPERNODE_PORT -f
Restart=always
RestartSec=10
User=root

[Install]
WantedBy=multi-user.target
EOF

# 写入 edge systemd 服务
log "创建 edge systemd 服务..."
cat > /etc/systemd/system/n2n-edge.service <<EOF || error_exit "创建 edge service 失败"
[Unit]
Description=N2N Edge Client v$N2N_VERSION
After=network.target n2n-supernode.service
Wants=n2n-supernode.service

[Service]
Type=simple
ExecStart=/usr/local/sbin/edge -a $EDGE_IP -c $COMMUNITY -l 127.0.0.1:$SUPERNODE_PORT -d n2n0 -k $SECRET_KEY -f
Restart=always
RestartSec=10
User=root

[Install]
WantedBy=multi-user.target
EOF

# 重载 systemd
log "重载 systemd 配置..."
systemctl daemon-reload >> "$LOG_FILE" 2>&1 || error_exit "systemctl daemon-reload 失败"

# 启动服务
log "启动 n2n-supernode 服务..."
systemctl start n2n-supernode >> "$LOG_FILE" 2>&1 || error_exit "启动 supernode 失败"

log "启动 n2n-edge 服务..."
systemctl start n2n-edge >> "$LOG_FILE" 2>&1 || error_exit "启动 edge 失败"

# 启用开机自启
log "启用开机自启动..."
systemctl enable n2n-supernode n2n-edge >> "$LOG_FILE" 2>&1 || error_exit "启用自启动失败"

log "n2n 部署完成！supernode 运行在端口 $SUPERNODE_PORT，edge IP: $EDGE_IP"
echo "社区名: $COMMUNITY"
echo "密钥: $SECRET_KEY （请妥善保存！）"
echo "请使用服务器公网 IP + 7654 端口连接，加上社区和密钥参数"
echo "部署成功后无需再次运行此脚本！"
echo "日志位置: $LOG_FILE"
```

## 常用管理命令

```bash
# 停止服务
sudo systemctl stop n2n-supernode n2n-edge

# 重启服务
sudo systemctl restart n2n-supernode n2n-edge

# 查看状态
sudo systemctl status n2n-supernode --no-pager
sudo systemctl status n2n-edge --no-pager

# 防火墙放行
sudo ufw allow 7654/udp
```

## 总结

- **服务端**：Supernode 作为中转节点，Edge 让服务器自己也加入网络
- **客户端**：EasyN2N 图形化连接，填 IP + 社区名 + 密钥即可
- **适用游戏**：以撒的结合、饥荒等不支持 IP 直连的局域网游戏
- **成本**：一台最低配云服务器就行，重要的是带宽
