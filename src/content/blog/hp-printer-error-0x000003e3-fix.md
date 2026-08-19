---
title: HP 打印机报错 0x000003e3（打印被中止）修复教程
description: 打印图片或测试页时报错 0x000003e3（I/O 操作已中止）？多半是 Windows 用「Microsoft IPP 类驱动程序」自动安装的队列，端口指向了不稳定的链路本地 IPv6 地址。换成打印机的 IPv4 地址 + 官方 HP 驱动即可；若换完端口又复发，本文还提供根治方法（禁用 WSD/IPP 自动发现设备并重建干净队列）。
pubDate: 2026-08-19
image: https://photo.nywerya.xyz/Obsidian/发布/注释/HP打印机报错0x000003e3修复教程-cover.png
draft: false
tags:
  - 打印机
  - Windows
  - HP
  - 故障排查
  - 教程
categories:
  - 教程
slug: hp-printer-error-0x000003e3-fix
cover: 发布/注释/HP打印机报错0x000003e3修复教程-cover.png
summary: 打印报错 0x000003e3？换 IPv4 端口 + 官方 HP 驱动即可；换完又复发时，禁用 WSD/IPP 自动发现设备并重建干净队列根治。
type: tutorial
Release Platform:
  - blog.nywerya.xyz
---

# HP 打印机报错 0x000003e3（打印被中止）修复教程

## 问题现象

用 Windows 打印东西时弹出错误：

- **Windows 照片查看器**：「Windows 照片查看器遇到问题打印您的图片」
- **打印测试页**：「操作无法完成（错误 0x000003e3）。I/O 操作已中止，因为线程退出或应用程序请求。」

打印机型号为 **HP Smart Tank 580-590 系列**，设备信息里驱动显示为 **Microsoft IPP Class Driver**。

## 原因分析

打印机是通过 **Wi-Fi / 局域网** 联网的，问题**不在打印机，而在 Windows 里的「打印机队列」**：

| 问题点 | 说明 |
|-|-|
| 驱动不对 | Windows 自动安装时用了通用的「Microsoft IPP 类驱动程序」，而不是 HP 官方驱动 |
| 端口指向失效地址 | 队列的端口是 **WSD 端口**，指向打印机的**链路本地 IPv6 地址**（`fe80::` 开头）。这种地址重启或网络变化后会失效 |
| 结果 | 打印数据发不到打印机 → 后台程序中止 I/O → 报错 `0x000003e3` |

另外，机器上通常还有一个指向 `USB001` 的旧队列（打印机实际没插 USB），也会造成混淆。

**解决办法**：给打印机队列换一个**稳定的 IPv4 地址端口** + **HP 官方驱动**。

## 准备工作：查出打印机的 IP 地址

下面所有方法都需要先知道打印机在局域网里的 IPv4 地址（本文例子为 `192.168.31.123`，请替换成你自己的）。

**方法 A：打印机面板，最简单**
打印按信息按钮，就是那个 `i` 字→ 打印出来一张纸 → 查看上面的 IP 地址。

**方法 B：路由器管理页**
登录路由器后台（小米路由器默认 `192.168.31.1`）→ 设备列表 → 找到名字带 HP / 打印机的设备。

**方法 C：Windows 命令行（推荐）**
1. 按 `Win + R`，输入 `cmd` 回车
2. 输入 `arp -a` 回车
3. 找到 MAC 地址为 `f8-ed-fc-bd-77-c1` 的那一行，对应的 `192.168.x.x` 就是打印机 IP：

```
接口: 192.168.31.225 --- 0xe
  192.168.31.1           90-fb-5d-95-11-80     dynamic
  192.168.31.123         f8-ed-fc-bd-77-c1     dynamic   ← 这一行就是打印机
```

## 修复方法一：图形界面（推荐，最直观）

1. 按 `Win + I` 打开 **设置 → 蓝牙和其他设备 → 打印机和扫描仪**
2. **删除坏队列**：找到名称里带 `[HPBD77C1]` 或驱动显示「Microsoft IPP 类驱动程序」的打印机 → 点击它 → 点 **删除设备**
3. 点 **添加设备**，如果它又自动搜到刚才那台，选 **手动添加**（或「我需要的打印机不在列表中」）→ **使用 IP 地址或主机名添加打印机**
4. 按下面填写：
   - 设备类型：**TCP/IP 设备**
   - 主机名或 IP 地址：`192.168.31.123`（换成你的）
   - 端口名：自动生成，不用改
   - 勾选 **查询打印机并自动选择要使用的驱动程序**
5. 选择驱动：**HP Smart Tank 580-590 series PCL-3 (V4)**。如果列表里没有，点「Windows 更新」搜索，或用微软商店安装 **HP Smart** 应用来装驱动
6. 添加完成后，右键该打印机 → **设为默认打印机**
7. 右键 → **打印机属性 → 常规 → 打印测试页**，能打出来就成功了

## 修复方法二：PowerShell 命令

本次实际使用的方法，一般**不需要管理员权限**（如果提示拒绝访问，就右键 PowerShell → 以管理员身份运行重试）。

开始菜单搜索 `powershell` 回车打开。

### 第 1 步：创建标准 TCP/IP 端口

```powershell
Add-PrinterPort -Name "IP_192.168.31.123" -PrinterHostAddress "192.168.31.123"
```

> 端口名和 IP 都换成你自己的。标准 TCP/IP 端口默认走 9100 端口，HP 网络打印机都支持。

### 第 2 步：把队列改成 HP 驱动 + 新端口

**先看一个坑**：自动生成的队列名带方括号（如 `HP Smart Tank 580-590 series [HPBD77C1]`），而 PowerShell 的打印命令会把 `-Name` 当**通配符**，带方括号的名字匹配不到。所以先用 WMI 精确匹配，把队列改成一个不带括号的名字：

```powershell
# 把旧队列重命名（去掉方括号，避开通配符坑）
$w = Get-WmiObject -Class Win32_Printer -Filter "Name='HP Smart Tank 580-590 series [HPBD77C1]'"
$w.RenamePrinter('HP Smart Tank 580-590')
```

> 如果重命名那行报错，说明队列名和你机器上的不一样。先运行 `Get-Printer` 查看实际名称，再把上面两行的名字替换成你的。

然后换成 HP 官方驱动 + 新 IPv4 端口：

```powershell
Set-Printer -Name 'HP Smart Tank 580-590' -DriverName 'HP Smart Tank 580-590 series PCL-3 (V4)' -PortName 'IP_192.168.31.123'
```

### 第 3 步：设为默认打印机

```powershell
$p = Get-CimInstance Win32_Printer -Filter "Name='HP Smart Tank 580-590'"
Invoke-CimMethod -InputObject $p -MethodName SetDefaultPrinter
```

### 第 4 步：打印测试页验证

```powershell
rundll32 printui.dll,PrintUIEntry /k /n "HP Smart Tank 580-590"
```

等几秒后查看打印任务：

```powershell
Get-CimInstance Win32_PrintJob
```

看到类似下面的输出就说明成功了：

```
Name                     Document  Status TotalPages
----                     --------  ------ ----------
HP Smart Tank 580-590, 6 Test Page OK              1
```

## 为什么光换端口还会复发（重点）

换完端口当时能打印，但过一阵或重启后又报 `0x000003e3`？因为 Windows 的**自动发现机制**还没停：

- 系统里有几个「软件设备」负责自动安装打印机：`SWD\IPP\...`（Microsoft IPP 类驱动的安装源）和 `SWD\DAFWSDPROVIDER\...`（WSD 打印 / 发现设备）
- 只要这些设备存在，spooler 一重启或网络扫描一触发，就会：重新创建 WSD 端口 → 把队列端口**抢回** WSD → 甚至重新装一个「Microsoft IPP 类驱动程序」的队列
- 所以只改端口是**治标**；**禁用这些自动发现设备**才能治本

## 修复方法三：根治（禁用自动发现设备 + 重建干净队列）

**需要管理员权限**（方法二不用，方法三要）。先右键开始菜单 →「终端（管理员）」或「Windows PowerShell（管理员）」，再执行下面的命令。

### 第 1 步：查自动发现设备的 ID

```powershell
Get-PnpDevice | Where-Object { $_.FriendlyName -match 'HP|Tank|IPP' } | Select-Object FriendlyName,Class,Status,InstanceId
```

记下这两类设备的完整 `InstanceId`：

| 设备 | 作用 |
|-|-|
| `SWD\IPP\1BBA82A1-...` | Microsoft IPP 类驱动自动安装源 |
| `SWD\DAFWSDPROVIDER\URN:UUID:1BBA82A1-...` | WSD 打印 / 发现设备 |

> 名字里的 UUID（`1BBA82A1-9F75-46DA-95D6-A55BEAEFB297`）每台机器不同，以你查到的为准。

### 第 2 步：禁用自动发现设备

```powershell
# 换成你自己查到的 InstanceId
Disable-PnpDevice -InstanceId 'SWD\IPP\1BBA82A1-9F75-46DA-95D6-A55BEAEFB297' -Confirm:$false
Disable-PnpDevice -InstanceId 'SWD\DAFWSDPROVIDER\URN:UUID:1BBA82A1-9F75-46DA-95D6-A55BEAEFB297' -Confirm:$false
```

禁用后 Windows 就不会再自动安装队列、也不会再抢回端口。**扫描不受影响**（扫描走独立的 eSCL 通道）。

### 第 3 步：删除旧队列，重建干净队列

先在 设置 → 打印机和扫描仪 里删除旧队列（最简单，不怕方括号通配符问题）；命令行删除也可以：

```powershell
# 队列名带方括号时用 WMI 精确匹配删除
$w = Get-WmiObject -Class Win32_Printer -Filter "Name='HP Smart Tank 580-590 series [HPBD77C1]'"
$w.Delete()
```

再删掉所有 WSD 端口：

```powershell
Get-PrinterPort | Where-Object { $_.Name -like 'WSD-*' } | ForEach-Object { Remove-PrinterPort -Name $_.Name }
```

> 如果提示「端口被占用」，需要停掉打印后台服务再删注册表：
> ```powershell
> Stop-Service Spooler
> Get-ChildItem 'HKLM:\SYSTEM\CurrentControlSet\Control\Print\Monitors\WSD Port\Ports' | ForEach-Object { Remove-Item $_.PSPath -Recurse }
> Start-Service Spooler
> ```

最后用 IP 端口重建一个**干净**的队列（没有任何 WSD 关联数据）：

```powershell
Add-Printer -Name 'HP Smart Tank 580-590' -DriverName 'HP Smart Tank 580-590 series PCL-3 (V4)' -PortName 'IP_192.168.31.123'
```

### 第 4 步：设为默认 + 打印测试页

```powershell
$p = Get-CimInstance Win32_Printer -Filter "Name='HP Smart Tank 580-590'"
Invoke-CimMethod -InputObject $p -MethodName SetDefaultPrinter
rundll32 printui.dll,PrintUIEntry /k /n "HP Smart Tank 580-590"
```

### 第 5 步：重启打印服务验证（关键）

```powershell
Restart-Service Spooler
```

等几秒，确认队列端口没被抢回（用注册表查，避免 `Get-PrinterPort` 在 spooler 刚重启完时卡住）：

```powershell
(Get-ItemProperty 'HKLM:\SYSTEM\CurrentControlSet\Control\Print\Printers\HP Smart Tank 580-590').Port
```

显示 `IP_192.168.31.123` 就说明根治成功，再打一张测试页确认。

> 验证技巧：打印测试页后，在 事件查看器 → Windows 日志 → Microsoft → Windows → PrintService/Operational 里看 307 事件，若显示「through port IP_192.168.31.123」即成功。

## 怎么确认修好了

- 测试页能正常打印，任务状态显示 `OK`
- 用 Windows 照片查看器重新打印图片，不再报 `0x000003e3`
- 队列属性确认：驱动 = `HP Smart Tank 580-590 series PCL-3 (V4)`，端口 = `IP_192.168.31.123`

## 防止复发

1. **给打印机固定 IP（最重要）**：登录路由器管理页（小米默认 `192.168.31.1`）→ 设备管理 / DHCP 静态分配 → 把 `192.168.31.123` 保留给 MAC `f8:ed:fc:bd:77:c1`。否则打印机重启后 IP 变了，又得重配一遍。
2. **删除残留队列**：在 设置 → 打印机和扫描仪 里删掉指向 `USB001` 的旧队列（打印机不用 USB 的话）；以后 Windows 若又自动添加带 `[HPBD77C1]` 的 IPP 队列，删掉即可。
3. **长期更省心**：安装 **HP Smart** 应用（微软商店），让官方工具管理打印机连接和驱动。
4. **只换过端口的话，复发风险仍在**：如果发现队列端口又变回 `WSD-*`（spooler 重启或重启电脑后），说明自动发现设备还在作祟，按「修复方法三」根治一次。
5. **孤儿 WSD 端口可以无视**：根治后每次 spooler 重启，WSD 监视器可能又生成一个没有队列使用的 WSD 端口，不影响打印，忽略即可。
6. **扫描不受影响**：禁用的是打印相关的自动发现设备，扫描走独立的 eSCL 通道；若扫描异常，在设备管理器里把禁用的软件设备重新启用即可（不影响打印）。

## 本次修复记录（本机实测 2026-08-19）

### 第一次修复（治标）：换 IPv4 端口

| 项目 | 修复前 | 修复后 |
|-|-|-|
| 队列名 | `HP Smart Tank 580-590 series [HPBD77C1]` | `HP Smart Tank 580-590` |
| 驱动 | Microsoft IPP Class Driver | `HP Smart Tank 580-590 series PCL-3 (V4)` |
| 端口 | WSD（链路本地 IPv6） | `IP_192.168.31.123`（IPv4 / 9100） |
| 默认打印机 | 坏队列 | 修复后的队列 |
| 测试页 | 报错 `0x000003e3` | **OK** |

结果：当时能打，但约 1 小时后 spooler 重启时端口被 WSD 监视器**抢回**，又报 `0x000003e3`。

### 根治（治本）：禁用自动发现设备 + 重建干净队列

| 项目 | 内容 |
|-|-|
| 复发原因 | WSD 自动发现设备在 spooler 重启时重新创建 WSD 端口并抢回队列 |
| 禁用设备 | `SWD\IPP\1BBA82A1-...`、`SWD\DAFWSDPROVIDER\URN:UUID:1BBA82A1-...`（含 PRINTSERVICE） |
| 处理步骤 | 禁用设备 → 删旧队列 → 删 WSD 端口（注册表）→ 用 `IP_192.168.31.123` 重建干净队列 |
| 验证 | `Restart-Service Spooler` 后端口仍为 `IP_192.168.31.123`，测试页两次 OK（事件 307 确认走 IP 端口） |
| 遗留 | 孤儿 WSD 端口每次重启可能重新生成，无队列使用，忽略即可 |
