---
title: Codex 完成对话音效通知：跨 AI 配置教程
description: 两步配置：让 Codex 在整轮对话真正结束时只播放一次 WAV 音效——只响应 agent-turn-complete，不等待播放结束、不弹播放器窗口。附可直接交给其他 AI 的通用配置提示词与排障。
pubDate: 2026-09-02
image: https://photo.nywerya.xyz/Obsidian/发布/注释/Codex完成对话音效通知-cover.png
draft: false
tags:
  - Codex
  - AI
  - 通知音效
  - 配置教程
categories:
  - 教程
slug: codex-complete-chime-notification-cross-ai
cover: 发布/注释/Codex完成对话音效通知-cover.png
summary: 让 Codex 在整轮对话结束时播放一次 WAV 音效，附可交给任意 AI 的通用配置提示词。
type: tutorial
Release Platform:
  - blog.nywerya.xyz
---

# Codex 完成对话音效通知：跨 AI 配置教程

**效果**：Codex 一轮对话**真正结束**时播放一次 WAV 音效。工具调用、权限请求、中间状态都**不播放**；播放在后台跑，不拖慢 Codex，也不弹播放器窗口。

## 📦 需要准备

| 项 | 说明 |
|---|---|
| Codex | 用户级配置文件 `~/.codex/config.toml` |
| WAV 音效文件 | 自备（本文示例 `E:\Note\Obsidian\notification_accomplished_04.wav`） |
| 轻量播放器 | 推荐 **ffplay**（msys64 自带：`C:\msys64\ucrt64\bin\ffplay.exe`） |

## 🚀 配置（两步）

### 第 1 步：在 `config.toml` 加 `notify`

编辑 **`C:\Users\你的用户名\.codex\config.toml`**，加入或更新：

```toml
notify = [
  "cmd.exe",
  "/d",
  "/c",
  "C:\\Users\\你的用户名\\.codex\\play-notify.cmd"
]
```

> ⚠️ **必须放在用户级配置**里，不要写进项目级 `.codex/config.toml`，否则可能被 Codex 忽略。
> TOML 里 Windows 路径的反斜杠要写成 `\\`。

### 第 2 步：创建 `play-notify.cmd`

在 **`C:\Users\你的用户名\.codex\play-notify.cmd`** 写入：

```bat
@echo off
start "" /b "C:\msys64\ucrt64\bin\ffplay.exe" -nodisp -autoexit -nostats -loglevel quiet -vn "E:\Note\Obsidian\notification_accomplished_04.wav"
exit /b 0
```

`start /b` 让通知命令**立即返回**，ffplay 在后台播完。

> 把两个绝对路径换成你自己的（播放器 + WAV）。

### 第 3 步：重启并测试

**完全退出 Codex，再重新打开**（配置在进程启动时读取），然后发一轮完整消息，确认结束时只响一次。

## 🔧 排障

| 现象 | 原因 / 解决 |
|---|---|
| **完成后没声音** | ① 没完全重启 Codex（最常见）② `notify` 里脚本路径写错 ③ `ffplay.exe` 不存在——换成你自己的播放器路径 ④ 单独运行 `play-notify.cmd` 试试：若也没声，查音量混音器和默认输出设备 ⑤ WAV 路径写错或文件不能被 ffplay 播放 |
| **每个中间步骤都播放** | `notify` 当前官方只支持 `agent-turn-complete`。若未来版本增加事件，需改用脚本解析通知 JSON，只放行 `notification.get("type") == "agent-turn-complete"` |
| **任务变慢** | 不要用 `PlaySync()`、不要等播放器进程结束——必须"启动后台播放器后立即退出" |

**实测参考**：本方案通知命令约 **53 ms** 返回（几乎无感）。

## 🤖 一键交给 AI（提示词）

下面这段可以直接丢给任何 AI，让它在你的机器上照做：

```text
请帮我为本机 Codex 配置“每轮对话结束后播放一次 WAV 音效”。

目标行为：只在 Codex 一轮 Agent 回复真正结束、触发 agent-turn-complete 时播放一次；工具调用、权限请求、中间状态不要播放。播放器必须后台运行，不能让 Codex 等待音频结束，也不能弹出播放器窗口。

请严格按以下步骤执行：
1. 先只读检查 CODEX_HOME、用户级 ~/.codex/config.toml、音频文件路径和可用 WAV 播放器；不要猜测路径。
2. 使用用户级 config.toml 的 notify 配置，不要把 notify 写入项目级 .codex/config.toml。
3. Windows 优先使用已经存在的轻量播放器。可以使用 ffplay；先确认 ffplay.exe 的绝对路径。
4. 创建一个 .cmd 包装器，使用 `start "" /b` 后台启动 ffplay，并使用 `-nodisp -autoexit -nostats -loglevel quiet -vn` 参数。包装器启动后立即 `exit /b 0`。
5. notify 使用 argv 数组，例如：
   ["cmd.exe", "/d", "/c", "C:\\Users\\用户名\\.codex\\play-notify.cmd"]
6. 保留 config.toml 原有内容，只新增或更新 notify；正确处理 TOML 中的 Windows 反斜杠。
7. 修改后验证：配置能解析，音频文件和播放器存在，直接运行包装器能启动播放器并快速返回。
8. 提醒我完全退出并重新打开 Codex，再发送一轮完整测试消息。
9. 最后明确列出修改了哪些文件和实际播放器路径，不要只回复“已完成”。

我的 WAV 音频文件路径是：在这里填入绝对路径
```

---
---

# 以下是原理说明（只想配置好的可以到此为止）

## 目标行为（精确定义）

- 只响应 `agent-turn-complete`，即整轮 Agent 回复完成
- 工具调用、权限请求和中间状态不播放
- 播放在后台启动，不让 Codex 等待音频结束
- 不弹出播放器窗口

## 核心原理

Codex 的用户级配置文件位于 `~/.codex/config.toml`。`notify` 会启动一个外部程序，并向它传递通知参数。当前官方支持的完成事件是 `agent-turn-complete`。

因此，在 Windows 上最稳定、速度最快的方案是：

```text
Codex notify
    ↓
cmd.exe 启动后台播放命令
    ↓
ffplay 播放 WAV，立即释放 Codex
```

## 为什么没有直接使用 PowerShell

最初的方案是：

```powershell
(New-Object System.Media.SoundPlayer '音频路径').PlaySync()
```

它会等待 WAV 播放完成，导致任务完成响应变慢。后来使用 `pythonw.exe` 解析通知 JSON，但部分 Windows 宿主调用链可能无法把 JSON 作为可解析的 `sys.argv[1]` 传入，脚本会静默退出。

最终方案只依赖 Codex 当前的事件约定，并让 `cmd + ffplay` 负责快速后台播放，实测通知命令约 53 ms 返回。

## 配置要点清单

1. 先检查 `CODEX_HOME`、用户级 `config.toml`、`ffplay.exe` 和 WAV 文件是否存在
2. 使用绝对路径；TOML 字符串中的 Windows 反斜杠写成 `\\`
3. 确认 `notify` 位于**用户级**配置，而不是项目级
4. 使用 `start /b` 启动播放器，避免 Codex 等待播放完毕
5. 保存后**完全退出 Codex**，再重新打开
6. 发送一轮完整测试消息，确认结束时只播放一次

## 参考资料

- Codex 高级配置：`https://learn.chatgpt.com/docs/config-file/config-advanced`
- Codex 配置参考：`https://developers.openai.com/codex/config-reference/`
- Microsoft PlaySound：`https://learn.microsoft.com/en-us/windows/win32/multimedia/the-playsound-function`
