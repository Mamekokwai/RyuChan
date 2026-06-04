---
title: GNOME 剪贴板管理器 Clipboard Indicator — 原生 · 高响应 · 安全
description: >-
  GNOME 上最好的剪贴板管理插件，200 万+ 下载。原生 Shell 集成、即搜即得、
  数据不出机器。装了就忘不掉。
pubDate: 2026-06-04
image: https://photo.nywerya.xyz/Obsidian/发布/注释/GNOME剪贴板管理器-ClipboardIndicator - cover.png
draft: false
tags:
  - gnome
  - extension
  - clipboard
  - linux
categories: []
slug: gnome-clipboard-indicator
cover: 发布/注释/GNOME剪贴板管理器-ClipboardIndicator - cover.png
summary: 原生 GNOME Shell 剪贴板扩展，即时响应，数据完全本地，隐私模式一键暂停记录。
type: tutorial
Release Platform:
  - blog.nywerya.xyz
original: "[[笔记/操作系统/Linux/GNOME剪贴板管理器-ClipboardIndicator-插件推荐|GNOME剪贴板管理器-ClipboardIndicator-插件推荐]]"
---


## 痛点

GNOME 桌面默认的剪贴板只有**「最后一次复制」**的内容。前脚复制了一段代码，后脚不小心 `Ctrl+C` 了个空行 — 刚才那段话就没了。

Windows 有 `Win+V` 剪贴板历史，macOS 有第三方工具，GNOME 呢？靠插件。

## Clipboard Indicator

[Clipboard Indicator](https://extensions.gnome.org/extension/779/clipboard-indicator/) 是 GNOME Extensions 上**下载量最高的剪贴板管理插件**（200 万+），由 Tudmotu 开发维护，支持 GNOME 3.36 ~ 50。

为什么选它？三个词：**原生、高响应、安全**。

## 原生：长在 GNOME 身上

**Clipboard Indicator 是一个 GNOME Shell Extension，不是独立 App。**

这意味着：

- **零寄生依赖** — 它跑在 GNOME Shell 进程里，用 GNOME 原生的 JS 运行时，不依赖 Electron、不依赖 Python 环境、不需要独立守护进程
- **原生面板集成** — 图标直接嵌入顶部 panel，不走系统托盘（GNOME 本来也没有托盘），和时钟、网络、音量图标平起平坐
- **原生 UI 风格** — 下拉菜单、搜索框、设置窗口全部走 GNOME 系统主题，开深色模式自动跟随，不会出现 GTK 和 Qt 混搭的割裂感
- **原生扩展管理** — 用系统自带的 Extensions 应用就能配置、开关、升级，没有额外的后台管理界面

做个不严谨的类比：CopyQ 像是装了个第三方输入法，Clipboard Indicator 像是系统输入法自带的功能增强 — 前者功能更强，后者毫无存在感。

## 高响应：不让你等

剪贴板管理器有个反直觉的要求：**你必须比 `Ctrl+V` 还快，才有存在意义。**

如果按下快捷键后菜单弹出要卡半秒，人会下意识放弃它，继续用 `Ctrl+V` 完事。

Clipboard Indicator 做到了：

- **即时弹出** — 按下快捷键，菜单即刻出现。原因是它只用 GNOME Shell 原生 API，没有跨进程通信，没有 DBus 来回，所有数据在内存里
- **即搜即得** — 历史列表内直接打字搜索，无索引重建、无后台扫描，就是简单的前端文本匹配
- **常驻内存但不吃资源** — 作为 GNOME Shell 扩展运行，不需要额外进程、不轮询剪贴板（用 GNOME 的信号机制被动接收复制事件），闲置时 CPU 占用趋近于零
- **图片也流畅** — 少数支持剪贴板图片历史的 GNOME 管理器，预览、粘贴图片不卡顿

装了跟没装一样的性能开销，但关键时刻按一下 `Super+V`，半年前复制的那段命令还能找回来。

## 安全：剪贴板数据不出机器

剪贴板是桌面上最敏感的数据通道之一。密码、Token、私钥、API Key、身份证号 — 都可能经过剪贴板。

Clipboard Indicator 在安全上做对了三件事：

**① 数据完全本地**

- 不联网、不请求任何远程 API、不上传任何数据
- 历史记录只存在内存中，重启后清空（不会写入磁盘）
- 代码开源在 [GitHub](https://github.com/Tudmotu/gnome-shell-extension-clipboard-indicator)，审过再说

**② 隐私模式 — 一键暂停记录**

进入隐私模式后，复制的内容不会进入历史。临时处理敏感信息时打开，做完关掉 — 密码、银行卡号之类的东西不会留在列表里。

**③ 随时可清**

右键菜单 → Clear history，所有历史一键清空。没有「软删除」，没有「回收站」，数据即刻消失。

相比某些剪贴板管理器会把历史存到 SQLite 甚至同步到云端，Clipboard Indicator 的安全模型简单粗暴：**你的剪贴板只属于你的内存，关机即清零。**

## 核心功能速览

### 剪贴板历史

- 自动记录文本 + 图片
- 可设缓存条数上限
- 支持搜索

### 内容置顶

右键 Pin 到顶部，适合固定邮箱地址、Git commit 模板、代码片段。

### 全键盘操作

| 按键 | 功能 |
|------|------|
| `↑` `↓` | 浏览 |
| `Enter` | 粘贴 |
| `Delete` | 删除 |
| `p` | 置顶/取消 |

### 其他

- 粘贴后自动关闭菜单
- 可自定义快捷键（默认 `Super+V`）
- 面板图标可换

## 安装

### 方式一：网页一键

[extensions.gnome.org/extension/779](https://extensions.gnome.org/extension/779/clipboard-indicator/) → 点右上角开关。

> 开关灰色？先装浏览器连接器：
>
> ```bash
> sudo apt install chrome-gnome-shell
> ```

### 方式二：包管理器

```bash
# Debian / Ubuntu
sudo apt install gnome-shell-extension-clipboard-indicator
```

```bash
# Fedora
sudo dnf install gnome-shell-extension-clipboard-indicator
```

```bash
# Arch
sudo pacman -S gnome-shell-extension-clipboard-indicator
```

### 方式三：手动

```bash
git clone https://github.com/Tudmotu/gnome-shell-extension-clipboard-indicator.git \
  ~/.local/share/gnome-shell/extensions/clipboard-indicator@tudmotu.com

gnome-extensions enable clipboard-indicator@tudmotu.com
```

装完后 `Alt+F2` → `r` → 回车。

## 配置建议

1. Extensions 应用 → Clipboard Indicator → 设置
2. **Cache Size** → 50~100
3. 开启 **Paste on selection**
4. 快捷键绑到 `Super+Shift+V`

## 同类对比

| | Clipboard Indicator | GPaste | CopyQ |
|--|:--:|:--:|:--:|
| 原生 GNOME 集成 | ✅ | ❌ | ❌ |
| 响应速度 | 即时 | 有延迟 | 有延迟 |
| 数据不出机器 | ✅ | ✅ | ❌（可能写磁盘） |
| 隐私模式 | ✅ | ❌ | ❌ |
| 图片支持 | ✅ | ❌ | ✅ |
| 额外进程 | 无 | 有 | 有 |

## 总结

Clipboard Indicator 不是功能最多的剪贴板管理器，但它是最「GNOME」的 — 原生集成、零延迟响应、数据不出机器。

装了就忘不掉，GNOME 桌面必装。
