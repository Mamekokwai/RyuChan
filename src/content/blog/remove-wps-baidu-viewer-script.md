---
title: 一键清除 WPS 看图与百度智能看图：拿回你的图片打开方式
description: 下载即用：548 行 PowerShell 脚本，清掉 WPS 看图与百度智能看图，恢复图片默认打开方式，省下 300–500 MB。不碰软件本体、不动文档、不联网。附参数、退出码与 SHA256。
pubDate: 2026-09-15
image: https://photo.nywerya.xyz/Obsidian/发布/注释/清除WPS看图与百度看图-cover.png
draft: false
tags:
  - Windows
  - PowerShell
  - 去捆绑
  - WPS
  - 百度网盘
categories:
  - 工具
slug: remove-wps-baidu-viewer-script
cover: 发布/注释/清除WPS看图与百度看图-cover.png
summary: 下载即用：清掉 WPS 看图与百度智能看图，恢复图片默认打开方式，省下 300–500 MB。
type: tutorial
Release Platform:
  - blog.nywerya.xyz
---

# 一键清除 WPS 看图与百度智能看图：拿回你的图片打开方式

## 📦 下载

**https://webdav.nywerya.xyz/妙妙脚本/删除智能看图和wps看图.zip**

解压后得到三个文件，**必须放在同一个文件夹**：

```
删除智能看图和wps看图/
├── 一键清除WPS看图与某度看图.cmd    ← 双击这个
├── Remove-WpsAndBaiduViewer.ps1   ← 主脚本
└── 使用说明-README.txt             ← 完整说明
```

**作用一句话**：清掉 WPS 和百度网盘静默安装的「看图」组件，把图片的默认打开方式还给你，顺带释放 **300–500 MB**。不碰软件本体，不动你的文档，不联网。

---

## 🚀 快速使用

### 第 1 步：先扫描（什么都不改）

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File "$env:USERPROFILE\Downloads\Remove-WpsAndBaiduViewer.ps1" -DryRun
```

`-DryRun` 逐条打印「**将会**删除什么」，**不改动任何东西，也不请求管理员权限**。看完心里有数再动手。

### 第 2 步：正式运行

**双击 `一键清除WPS看图与某度看图.cmd` → UAC 弹窗点「是」** 即可。

> 或者：右键 `Remove-WpsAndBaiduViewer.ps1` →「使用 PowerShell 运行」（脚本会自我提权）。
>
> ⚠️ 两个文件必须同目录——cmd 启动器是从自己所在目录去找 ps1 的。

### 第 3 步：建议重启一次

让图标和文件关联缓存刷新。

---

## ⚙️ 参数

| 参数 | 作用 |
|---|---|
| `-DryRun` | 只扫描报告，不改动 |
| `-Force` | 跳过确认提示（无人值守用） |
| `-DoNotTouchWpsFiles` | 只清 WPS 注册表，磁盘上的 `photolaunch.exe` 保留 |
| `-NoPlaceholder` | 不种占位文件（WPS 若提示"修复"，用这个重跑） |
| `-KeepLog` | 即使成功也保留日志 |

## 🔢 退出码

| 码 | 含义 |
|---|---|
| **0** | 成功 |
| **1** | 完成，但有部分操作失败 |
| **2** | 提权被拒绝 / 无法启动 |
| **3** | 你在确认提示处取消了 |

---

## 🧹 它会删什么

| # | 目标 | 具体位置 |
|---|---|---|
| 1 | 百度网盘「智能看图」 | `module\ImageViewer` |
| 2 | 百度网盘「智能播放器」 | `module\VastPlayer`、`BrowserEngine\localplayer.dll`、`vastplayer.dll`、`BaiduNetdiskPlayerLaunch.exe` |
| 3 | WPS「WPS看图」 | `photolaunch.exe`（含 `_bk` 备份）+ `WPS.PIC.*` 注册表条目 |

**顺带清理**：注册表关联（`WPS.PIC.*`、`Applications\photolaunch.exe`、各扩展名"打开方式"列表）、百度看图相关键、**Prefetch 预读缓存**；**若默认看图程序已被劫持，帮你恢复**。

## 🛡️ 它绝不会碰什么

- ✅ **保留** WPS Office 本体（`wps.exe` / `et.exe` / `wpp.exe` 照常工作）
- ✅ **保留** 百度网盘本体
- ✅ **保留** 你的文档、云文件、设置
- ✅ **保留** Windows 自带「照片」
- ✅ **保留** 你原有的默认看图设置（**只有**被劫持时才恢复）

---

## 🔧 排障

| 现象 | 解决 |
|---|---|
| 「在此系统上禁止运行脚本」 | 用 **cmd 启动器**（它带了 `-ExecutionPolicy Bypass`） |
| 「拒绝访问」/ 什么都没删 | 你拒绝了 UAC。重跑并点「是」，或右键 cmd → 以管理员身份运行 |
| 部分文件删不掉 | 文件被占用。**重启后再跑一次**（幂等，安全），残留项在日志里能看到 |
| WPS 提示要「修复」自己 | 用 `-NoPlaceholder` 重跑即可 |
| 日志在哪 | `%TEMP%\clean_viewers_<时间戳>.log`，**有失败时自动保留** |

## 🔐 核对哈希（建议）

```powershell
Get-FileHash .\Remove-WpsAndBaiduViewer.ps1 -Algorithm SHA256
```

| 文件 | SHA256 |
|---|---|
| `Remove-WpsAndBaiduViewer.ps1` | `B92A775B02C02EA640BE7499FDD00477896C2C1589F1E596E0F6549E5BD053E8` |
| `一键清除WPS看图与某度看图.cmd` | `C5ADA2C54D7BD2FC78947F5A7FD1183DC6BE08FDA56F5D2F23A6CCEA9BAA2DDE` |

> 本机实测：两个哈希与脚本包内说明文件的声明值**完全一致** ✅

## 🔁 如果它又回来了

厂商更新可以把组件加回来——这是厂商决定，脚本没法永久阻止。真回来了：**再跑一次脚本**（幂等，安全），然后从源头关掉自动更新：

- **WPS**：设置 → 配置 / 修复工具 → 高级 → 更新设置 → 关闭自动更新
- **百度网盘**：设置 → 基本设置 → 取消自动更新

---
---

# 以下是原理与设计说明（只想解决问题的可以到此为止）

## 一、为什么会有这个问题

装了 WPS Office 或百度网盘之后，很多人都会遇到这几件事：

- 双击一张 JPG / PNG，打开的不是 Windows「照片」，而是 **WPS看图** 或 **百度网盘的「智能看图」**
- 右键菜单和默认程序列表里冒出一堆不认识的条目
- 最烦的是：**手动把默认程序改回来，过一阵又被抢回去**
- 磁盘上还悄悄多出几百 MB

这些组件是随本体**静默安装**的，官方卸载器不会单独处理它们——你卸载 WPS / 百度网盘，它们可能还赖着；你继续用，它们就一直抢关联。

## 二、为什么这个脚本可以放心跑

代码层面能验证这几件事：

- 所有删除目标都是**写死的组件专属路径**，全文没有任何一条「清空目录」或「按通配符删图片」的操作
- 548 行全是可读 PowerShell，你可以逐行审完再运行
- **不下载任何东西、不发送任何数据**

## 三、几个做得挺讲究的细节

1. **0 字节只读占位文件**
   删掉 `photolaunch.exe` 后，脚本在原位置种一个 **0 字节只读同名文件**，用来**阻止 WPS 更新时静默恢复**这个组件。如果你更希望 WPS 正常更新，用 `-NoPlaceholder`。

2. **纯 ASCII 源码、无 BOM**
   任何语言区域设置下都不会乱码、不会因编码报错——跨机器分发时这点很关键。

3. **动态定位安装**
   不写死版本号：自动扫 `APPDATA`、`LOCALAPPDATA`、`Program Files`、`Program Files (x86)`，**每用户安装和全机安装都能找到**，WPS 换版本号也不影响。

4. **大小写不敏感去重**
   Windows 路径不区分大小写，代码用 `HashSet[string](OrdinalIgnoreCase)` 去重，避免同一个安装被处理两次、报告两遍。

5. **只删大于 0 字节的 `photolaunch.exe`**
   不会把自己种的占位文件当成目标再删一次。

6. **幂等**
   重复运行安全，已清理干净的项报 `not found`。

7. **完整日志**
   写到 `%TEMP%\clean_viewers_<时间戳>.log`，**有失败时自动保留**，方便定位到底是哪个文件没删掉。

8. **双版本兼容**
   Windows 10 / 11 通吃，Windows PowerShell 5.1 **和** PowerShell 7+ 都能跑。

## 四、小结

这类捆绑看图组件的讨厌之处不在于它占空间，而在于它**反复抢你的文件关联**——你改一次它抢一次。

这个脚本的思路很清楚：**只删属于这几个组件的东西，其余一律不碰**，并且把「改了什么」全程留痕。对不敢随便跑网上清理工具的人来说，它最大的价值是**你能读懂它每一行在干什么**。

有问题或发现漏网的文件，欢迎反馈。

---

## 参考

- 下载：https://webdav.nywerya.xyz/妙妙脚本/删除智能看图和wps看图.zip
- 脚本包内含 `使用说明-README.txt`（含参数、退出码、排障、哈希校验）
