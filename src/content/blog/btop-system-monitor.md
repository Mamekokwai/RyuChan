---
title: btop — 装完系统第一个 apt install 的终端资源监视器
description: btop 是 htop 的终极进化版，C++ 重写的 TUI 系统监视器。实时展示 CPU/内存/磁盘/网络图表，鼠标可点，内置多套主题。
pubDate: 2026-06-13T13:00
image: https://photo.nywerya.xyz/Obsidian/发布/注释/btop-cover.png
draft: false
tags:
  - Linux
  - btop
  - 监控
categories:
  - 教程
slug: btop-system-monitor
cover: 发布/注释/btop-cover.png
summary: btop 终端系统资源监视器的安装、配置与使用教程，替代 htop/iftop/iotop 三合一。
type: tutorial
original: "[[笔记/操作系统/Linux/btop-系统资源监视器|btop 系统资源监视器]]"
Release Platform:
  - blog.nywerya.xyz
---


# btop — 终端里的资源监视器

`btop` 是一个用 C++ 重写的系统资源监视器，可以看作 `htop` 的终极进化版。在终端里实时展示 CPU、内存、磁盘、网络、进程信息，界面精致、高度可定制。

## 和 htop / top 的区别

| 特性 | top | htop | btop |
| ------ | ----- | ------ | ------ |
| 界面 | 纯文本 | 彩色文本 | **全图形化 TUI**（鼠标可点） |
| CPU 显示 | 数字 | 柱状条 | **每个核心独立折线图 + 颜色主题** |
| 内存/磁盘 | 数字 | 柱状条 | **柱状图 + 百分比 + 详细信息** |
| 网络 | ❌ | ❌ | **✅ 实时上下行速率图** |
| 进程树 | ❌ | ✅ | ✅ |
| 鼠标支持 | ❌ | ✅ | ✅ |
| GPU 监控 | ❌ | ❌ | **✅ 部分支持** |
| 主题 | ❌ | ❌ | **✅ 内置多套主题** |

## 安装

### Debian / Ubuntu

```bash
sudo apt install btop
```

### Arch Linux

```bash
sudo pacman -S btop
```

### Fedora

```bash
sudo dnf install btop
```

### macOS

```bash
brew install btop
```

### 从源码编译

```bash
git clone https://github.com/aristocratos/btop.git
cd btop
make
sudo make install
```

## 基础操作

```bash
# 启动
btop
```

进入后直接用鼠标点击即可切换菜单，也可以用键盘：

| 按键 | 功能 |
| ------ | ------ |
| `1` / `2` / `3` / `4` | 切换到 CPU / 内存 / 磁盘 / 网络 详细视图 |
| `f` | 进程过滤器（输入关键词筛选） |
| `t` | 切换进程树模式 |
| `m` | 切换菜单栏显示 |
| `Esc` | 退出当前菜单 / 全局 |
| `q` / `Ctrl+C` | 退出 btop |
| `p` | 切换进程排序方式 |
| `+` / `-` | 调整刷新间隔 |

## 配置主题

```bash
# 配置文件位置
~/.config/btop/btop.conf
```

预设主题切换：

```bash
btop --theme gruvbox_dark
```

```bash
btop --theme nord
```

```bash
btop --theme monokai
```

在配置文件中改主题：

```ini
# ~/.config/btop/btop.conf
color_theme = "gruvbox_dark"
```

其他常用配置：

```ini
# 刷新间隔（毫秒）
update_ms = 1000

# 显示温度
show_cpu_temp = True

# 图表背景
theme_background = False

# 网络图表自动缩放
net_auto = True
```

## 实用场景

### 排查 CPU 瓶颈

编译大项目时开一个 btop，每个核心的折线图一眼看出是不是有单核瓶颈：

```bash
# 终端 1：编译
make -j$(nproc)

# 终端 2：监控
btop
```

### 监控磁盘 IO

```bash
# 按 3 切换到磁盘视图
# 能看出哪个进程在大量读写
```

### 排查内存泄漏

```bash
# 按 m 打开菜单 → 进程按内存排序
# 看哪个进程内存持续增长
```

### 网络流量监控

```bash
# 按 4 切换到网络视图
# 显示每个网络接口的实时收发速率
```

### 远程服务器常驻

```bash
# SSH 到服务器后直接跑
ssh user@server -t btop

# 或者在 tmux 里常驻一个面板
tmux split-window -h btop
```

## 进阶技巧

### 快捷键绑定别名

```bash
# ~/.bashrc 或 ~/.zshrc
alias top='btop'
```

从此敲 `top` 就是 btop。

### 进程信号

btop 里选中进程后可以直接发送信号（`T` 键），支持 `SIGTERM`、`SIGKILL`、`SIGSTOP` 等，不用再开一个终端 `kill`。

### 预设布局

```bash
# 启动时直接进入指定视图
btop --preset cpu      # 只看 CPU
btop --preset net      # 只看网络
btop --preset proc     # 只看进程
```

## 总结

btop 在我所有 Linux 机器上都是装完系统第一个 `apt install` 的东西。相比 htop 的优势不只是好看——网络监控和磁盘 IO 面板在很多排查场景里能省掉另外开 `iftop` / `iotop` 的步骤。而且鼠标可点，对不熟命令行的人也更友好。
