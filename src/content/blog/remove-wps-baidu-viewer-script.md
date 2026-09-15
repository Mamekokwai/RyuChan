---
title: 一键清除 WPS 看图与百度智能看图：拿回你的图片打开方式
description: 一个 548 行的 PowerShell 脚本，把 WPS Office 和百度网盘静默安装的「看图」组件连根拔掉——不碰软件本体、不动你的文档、不联网。附 -DryRun 先扫描模式与 SHA256 校验值。
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
summary: 用 548 行 PowerShell 清掉 WPS 看图与百度智能看图，恢复图片默认打开方式，省下 300–500 MB。
type: tutorial
Release Platform:
  - blog.nywerya.xyz
---

# 一键清除 WPS 看图与百度智能看图：拿回你的图片打开方式

> 一个 548 行的 PowerShell 脚本，把 WPS Office 和百度网盘**静默安装的「看图」组件**连根拔掉——不碰软件本体、不动你的文档、不联网。

## 一、先说问题

装了 WPS Office 或百度网盘之后，很多人都会遇到这几件事：

- 双击一张 JPG / PNG，打开的不是 Windows「照片」，而是 **WPS看图** 或 **百度网盘的「智能看图」**
- 右键菜单和默认程序列表里冒出一堆不认识的条目
- 最烦的是：**手动把默认程序改回来，过一阵又被抢回去**
- 磁盘上还悄悄多出几百 MB

这些组件是随本体**静默安装**的，官方卸载器不会单独处理它们——你卸载 WPS / 百度网盘，它们可能还赖着；你继续用，它们就一直抢关联。

这个脚本就是干这个的。

## 二、它清理什么

三类目标，**每一类都会单独扫描并报告**：

| # | 目标 | 具体路径 |
|---|---|---|
| 1 | 百度网盘「智能看图」 | `module\ImageViewer` |
| 2 | 百度网盘「智能播放器」 | `module\VastPlayer`、`BrowserEngine\localplayer.dll`、`vastplayer.dll`、`BaiduNetdiskPlayerLaunch.exe` |
| 3 | WPS「WPS看图」 | `photolaunch.exe`（含 `_bk` 备份文件）+ `WPS.PIC.*` 注册表条目 |

**顺带清理的关联残留**：

- 注册表：`WPS.PIC.*` 系列 ProgId、`HKCU\...\Classes\Applications\photolaunch.exe`、各扩展名「打开方式」列表里的 photolaunch 项
- 百度看图相关键：`HKCU\Software\Baidu\BaiduNetdiskImageViewer`、`...\Classes\BaiduNetdiskImageViewerAssociations` 等
- **Prefetch 预读缓存**里的残留
- **如果你的默认看图程序已被劫持，帮你恢复**

**典型释放空间：300–500 MB**

## 三、明确不动什么（这条最重要）

脚本会把要删的东西先打印出来让你确认，而它**从不碰**下面任何一项：

- ❌ **WPS Office 本体** —— `wps.exe` / `et.exe` / `wpp.exe` 照常工作
- ❌ **百度网盘本体** —— 主客户端照常工作
- ❌ **你的文档、云文件、配置**
- ❌ **Windows 自带的「照片」**
- ❌ **你原有的默认看图设置**（**只有**在被劫持的情况下才恢复）

代码层面也能验证：所有删除目标都是**写死的组件专属路径**，全文没有任何一条「清空目录」「按通配符删图片」的操作。548 行全是可读 PowerShell，你可以自己逐行审完再运行。

而且它**不下载任何东西、不发送任何数据**。

## 四、怎么用

解压后有两个文件，**必须放在同一个文件夹**（cmd 启动器是从自己所在目录找 ps1 的）。

### 方式一（推荐）：双击 cmd

> 双击 `一键清除WPS看图与某度看图.cmd` → UAC 弹窗点「是」

### 方式二：右键 ps1 →「使用 PowerShell 运行」

脚本会自我提权，效果一样。

### 先扫描（强烈建议第一次这么用）

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File "$env:USERPROFILE\Downloads\Remove-WpsAndBaiduViewer.ps1" -DryRun
```

`-DryRun` 会逐条打印「**将会**删除什么」，**什么都不改，也不会请求管理员权限**。看完清单心里有数了，再去掉 `-DryRun` 正式跑。

## 五、参数

| 参数 | 作用 |
|---|---|
| `-DryRun` | 只扫描报告，不改动 |
| `-Force` | 跳过确认提示（无人值守用） |
| `-DoNotTouchWpsFiles` | 只清 WPS 注册表，磁盘上的 `photolaunch.exe` 保留 |
| `-NoPlaceholder` | 不种占位文件（见第七节） |
| `-KeepLog` | 即使成功也保留日志 |

## 六、退出码

| 码 | 含义 |
|---|---|
| **0** | 成功 |
| **1** | 完成，但有部分操作失败 |
| **2** | 提权被拒绝 / 无法启动 |
| **3** | 你在确认提示处取消了 |

## 七、几个做得挺讲究的细节

读代码时注意到的，值得单独说：

1. **0 字节只读占位文件**
   删掉 `photolaunch.exe` 后，脚本在原位置种一个 **0 字节只读同名文件**。目的是**阻止 WPS 更新时静默恢复**这个组件。如果你更希望 WPS 能正常更新，用 `-NoPlaceholder`。

2. **纯 ASCII 源码、无 BOM**
   任何语言区域设置下都不会乱码、不会因编码报错——跨机器分发给别人时这点很关键。

3. **动态定位安装**
   不写死版本号：自动扫 `APPDATA`、`LOCALAPPDATA`、`Program Files`、`Program Files (x86)`，**每用户安装和全机安装都能找到**，WPS 换版本号也不影响。

4. **大小写不敏感去重**
   Windows 路径不区分大小写，代码用 `HashSet[string](OrdinalIgnoreCase)` 去重，避免同一个安装被处理两次、报告两遍。

5. **只删大于 0 字节的 `photolaunch.exe`**
   这样不会把自己种的占位文件当成目标再删一次。

6. **幂等**
   重复运行是安全的，已清理干净的项会报告 `not found`。

7. **完整日志**
   写到 `%TEMP%\clean_viewers_<时间戳>.log`，**有失败时自动保留**（成功时才按需清理），方便定位到底是哪个文件没删掉。

8. **双版本兼容**
   Windows 10 / 11 通吃，Windows PowerShell 5.1 **和** PowerShell 7+ 都能跑。

## 八、如果它又回来了

厂商更新可以把组件加回来——这是厂商的决定，**脚本没法永久阻止**。真回来了：

1. **再跑一次脚本**（它是幂等的，跑多少次都安全）
2. **从源头关掉自动更新**：
   - **WPS**：设置 → 配置 / 修复工具 → 高级 → 更新设置 → 关闭自动更新
   - **百度网盘**：设置 → 基本设置 → 取消自动更新

## 九、排障

| 现象 | 解决 |
|---|---|
| 「在此系统上禁止运行脚本」 | 用 **cmd 启动器**（它带了 `-ExecutionPolicy Bypass`） |
| 「拒绝访问」/ 什么都没删 | 你拒绝了 UAC。重跑并点「是」，或右键 cmd → 以管理员身份运行 |
| 部分文件删不掉 | 文件正被占用。**重启后再跑一次**，残留项在日志里能看得很清楚 |
| WPS 提示要「修复」自己 | 用 `-NoPlaceholder` 重跑即可 |

## 十、比对哈希，确认文件没被改过

从别处拿到的脚本，建议先核对 SHA256：

```powershell
Get-FileHash .\Remove-WpsAndBaiduViewer.ps1 -Algorithm SHA256
```

| 文件 | SHA256 |
|---|---|
| `Remove-WpsAndBaiduViewer.ps1` | `B92A775B02C02EA640BE7499FDD00477896C2C1589F1E596E0F6549E5BD053E8` |
| `一键清除WPS看图与某度看图.cmd` | `C5ADA2C54D7BD2FC78947F5A7FD1183DC6BE08FDA56F5D2F23A6CCEA9BAA2DDE` |

> **本机实测**：以上两个哈希与脚本包内说明文件的声明值**完全一致** ✅
> （脚本 548 行 / 22.9 KB，纯 ASCII、无 BOM，与说明一致）

## 十一、下载

**https://webdav.nywerya.xyz/妙妙脚本/删除智能看图和wps看图.zip**

解压后得到：

```
删除智能看图和wps看图/
├── Remove-WpsAndBaiduViewer.ps1   ← 主脚本
├── 一键清除WPS看图与某度看图.cmd    ← 双击这个
└── 使用说明-README.txt             ← 完整说明
```

**保持三个文件在同一个文件夹**再运行。

## 小结

这类捆绑看图组件的讨厌之处不在于它占空间，而在于它**反复抢你的文件关联**——你改一次它抢一次。

这个脚本的思路很清楚：**只删属于这几个组件的东西，其余一律不碰**，并且把「改了什么」全程留痕。对不敢随便跑网上清理工具的人来说，它最大的价值是**你能读懂它每一行在干什么**。

有问题或发现漏网的文件，欢迎反馈。

---

## 参考

- 下载：https://webdav.nywerya.xyz/妙妙脚本/删除智能看图和wps看图.zip
- 脚本包内含 `使用说明-README.txt`（含参数、退出码、排障、哈希校验）
