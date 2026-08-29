---
title: 惠普打印机打印双面卡片错位对不上（别勾 Fit picture to frame）
description: HP 打印机打印双面卡片时正反两面错位、对不上？多半是打印设置里勾了 Fit picture to frame，或纸张放歪了。本文记录 HP Tank 599 的解决方法和打印参数建议。
pubDate: 2026-08-29
image: https://photo.nywerya.xyz/Obsidian/发布/注释/惠普打印机打印双面卡片错位对不上-cover.png
draft: false
tags:
  - 打印机
  - 惠普
  - 经验
  - 双面打印
categories:
  - 经验
slug: hp-printer-double-sided-card-misalignment
cover: 发布/注释/惠普打印机打印双面卡片错位对不上-cover.png
summary: 双面卡片打印正反对不上？别勾 Fit picture to frame，检查纸是否放歪；Quality 选 Normal、Paper type 选 Plain Paper。
type: tutorial
model: HP Tank 599
driver: 580-590 series
enviroment: Windows 11
Release Platform:
  - blog.nywerya.xyz
---

# 惠普打印机打印双面卡片错位对不上（别勾 Fit picture to frame）

## 现象

打印机型号：**HP Tank 599**（驱动 580-590 series，Windows 11）。打印双面卡片时，**正反两面不能完美重叠**，导致裁切后出现瑕疵：

![](https://photo.nywerya.xyz/Obsidian/发布/注释/Pasted%20image%2020260829100217.png)

理想情况是两面**完全重叠**：

![](https://photo.nywerya.xyz/Obsidian/发布/注释/20260829-0203-52.9874980.gif)

## 问题解决

打印时**不要勾选 `Fit picture to frame`**（适合图片到边框）：

![](https://photo.nywerya.xyz/Obsidian/发布/注释/20260829-0206-17.3734210.gif)

如果正反还是对不上，那就是**纸放歪了**，或者又勾上了 `Fit picture to frame`——重新放纸再打一次即可。

## 打印参数建议

| 参数 | 建议 | 说明 |
|-|-|-|
| `Quality` | **Normal** | `Best` 颜色过深 |
| `Paper type` | **Plain Paper** | 普通纸即可 |

## 小结

- 双面卡片错位 → 先查 `Fit picture to frame` 是否勾选（取消勾选）
- 取消后仍错位 → 检查纸张是否放歪
- 质量参数：Normal + Plain Paper 效果最佳
