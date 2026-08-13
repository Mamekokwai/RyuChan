---
title: CA51F2 SDK 分享 2025-12 版本
description: 锦锐 CA51F2 芯片官方 SDK 开发资料免费分享，无需积分签到，点击即取。
pubDate: 2026-08-13
image: https://photo.nywerya.xyz/Obsidian/发布/注释/CA51F2-SDK-cover.png
draft: false
tags:
  - 嵌入式
  - MCU
  - 锦锐
  - CA51F2
categories:
  - 教程
slug: ca51f2-sdk-share
cover: 发布/注释/CA51F2-SDK-cover.png
summary: 锦锐 CA51F2 芯片官方 SDK 免费分享，无需积分签到，点击即取。
type: tutorial
original: "[[发布/CA51F2_SDK分享2025-12版本|CA51F2 SDK 分享 2025-12 版本]]"
Release Platform:
  - blog.nywerya.xyz
---

# 废话不多点击下载

[CA51F2_SDK-2025-12](https://webdav.nywerya.xyz/%E9%94%A6%E9%94%90/CA51F2_SDK_%E3%80%902025-12-25%E3%80%91.rar)

碎碎念：我在网站找了半天资料要不就是付费要不就是签到积分，现在的程序员开发环境真的是依托，你说去官网找，不好意思，`锦锐` 的官网什么资料都没有，无言了。
最后在销售手中问来的资料，已经上传到自己搭建的 `webdev` 中，点击即可下载，直链不扫码不限速。

---

## 这包里都有啥

不是那种丢个工程就跑路的 SDK，里面塞得挺满：

| 目录 | 说明 |
|------|------|
| `MCU用户手册` | 寄存器级手册，点灯之前先翻它 |
| `应用实例` | 36 个 Keil 工程，外设基本全覆盖 |
| `开发下载工具` | 烧录 / 下载上位机工具 |
| `触摸功能开发包` | 触摸按键例程和调参工具 |
| `仿真功能插件` | 在线仿真调试插件 |
| `仿真下载器升级指引` | 下载器固件升级说明 |
| `CA51F2系列MCU硬件设计指南Rev 1.6.pdf` | 画板子看这个 |

## 36 个例程都覆盖了啥

常用外设基本不用自己从零点寄存器，直接抄作业：

- **基础**：`GPIO`、`LED`、`External_Interrupt`、`System_Clock_Select`
- **定时器**：`Timer0/1/2` 全模式（Mode0/1/2、自动重载、捕获、比较）
- **通信**：`Uart0/1/2`、`I2C_Master_Slave`、`SPI_Master_Slave`
- **模拟**：`ADC_Simple`、`ADC_Detect_VDD`
- **PWM**：`PWM_Simple`、`PWM_interrupt`、`PWM_Complementary_Mode(互补模式)`、`PWM_Clock_Out`
- **LCD**：`LCD_Simple`、`LCD_Power_Saving_Mode`
- **低功耗**：`Idle_Mode`、`Stop_Mode`
- **系统 / 安全**：`WatchDog_Interrupt/Reset`、`LVD_Interrupt/Reset`、`Read_32bit_UID`、`Flash_Data_Area_Access`

## 怎么用

这货是 **Keil C51** 工程（`.uvproj`），51 内核别用 MDK ARM 版去开：

1. 装好 Keil C51（不是 MDK）
2. 打开 `应用实例\xxx\ca51f2.uvproj`
3. 编译 → 烧录，完事

每个例程都是 `include / lib / source / lst / output` 的老一套结构：头文件丢 `include`，驱动在 `lib`，`main` 在 `source`。改自己的逻辑基本只碰 `source` 就够了。

## 几个坑

- 官网是真的啥也没有，这份是从销售手里要来的，版本 `2025-12-25`，出了新版欢迎评论区踢我
- 工程是 Keil C51 的，MDK 用户别硬开
- 文件挂在自建 webdav 上，直链下载不扫码不限速；哪天挂了留言，我补链

#CA51F2
