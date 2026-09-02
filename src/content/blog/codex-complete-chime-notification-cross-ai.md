---
title: Codex 完成对话音效通知：跨 AI 配置教程
description: 让 Codex 在整轮对话真正结束时只播放一次 WAV 音效——只响应 agent-turn-complete，不等待播放结束、不弹播放器窗口。提供可直接交给其他 AI 的通用配置提示词。
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

## 目标

让 Codex 在一轮对话真正结束时播放一次 WAV 音效：

- 只响应 `agent-turn-complete`，即整轮 Agent 回复完成；
- 工具调用、权限请求和中间状态不播放；
- 播放在后台启动，不让 Codex 等待音频结束；
- 不弹出播放器窗口。

> 使用方法：将本文发送给你心爱的 AI 即可。

## 核心原理

Codex 的用户级配置文件位于 `~/.codex/config.toml`。`notify` 会启动一个外部程序，并向它传递通知参数。当前官方支持的完成事件是 `agent-turn-complete`。

因此，在 Windows 上最稳定、速度最快的方案是：

```
Codex notify
    ↓
cmd.exe 启动后台播放命令
    ↓
ffplay 播放 WAV，立即释放 Codex
```

不要把 `notify` 写入项目级 `.codex/config.toml`；它应位于用户级配置中，否则可能被 Codex 忽略。

## Windows 实际可用配置

以下示例使用：

- 音频文件：`E:\Note\Obsidian\notification_accomplished_04.wav`
- ffplay：`C:\msys64\ucrt64\bin\ffplay.exe`

在 `C:\Users\你的用户名\.codex\config.toml` 中加入或更新：

```toml
notify = [
  "cmd.exe",
  "/d",
  "/c",
  "C:\\Users\\你的用户名\\.codex\\play-notify.cmd"
]
```

创建 `C:\Users\你的用户名\.codex\play-notify.cmd`：

```bat
@echo off
start "" /b "C:\msys64\ucrt64\bin\ffplay.exe" -nodisp -autoexit -nostats -loglevel quiet -vn "E:\Note\Obsidian\notification_accomplished_04.wav"
exit /b 0
```

`start /b` 会让 Codex 的通知命令立即返回，`ffplay` 在后台完成音频播放。不要使用 `PlaySync()`、`WaitForExit` 或其他等待播放器结束的写法。

## 为什么没有直接使用 PowerShell

最初的方案是：

```powershell
(New-Object System.Media.SoundPlayer '音频路径').PlaySync()
```

它会等待 WAV 播放完成，导致任务完成响应变慢。后来使用 `pythonw.exe` 解析通知 JSON，但部分 Windows 宿主调用链可能无法把 JSON 作为可解析的 `sys.argv[1]` 传入，脚本会静默退出。

最终方案只依赖 Codex 当前的事件约定，并让 `cmd + ffplay` 负责快速后台播放，实测通知命令约 53 ms 返回。

## 配置步骤

1. 先检查 `CODEX_HOME`、用户级 `config.toml`、`ffplay.exe` 和 WAV 文件是否存在。
2. 使用绝对路径；TOML 字符串中的 Windows 反斜杠写成 `\\`。
3. 确认 `notify` 位于用户级配置，而不是项目级配置。
4. 使用 `start /b` 启动播放器，避免 Codex 等待声音播放完毕。
5. 保存后完全退出 Codex，再重新打开。
6. 发送一轮完整测试消息，确认结束时只播放一次。

## 排障

### 完成后没有声音

- 确认已经完全退出并重新打开 Codex；配置通常在进程启动时读取。
- 检查 `notify` 中的脚本路径是否正确。
- 检查 `C:\msys64\ucrt64\bin\ffplay.exe` 是否存在；其他电脑需要改成自己的播放器路径。
- 单独运行 `play-notify.cmd`，确认 Windows 音量混音器和默认输出设备正常。
- 确认音频路径没有写错，且 WAV 文件可以被 ffplay 播放。

### 每个中间步骤都播放

`notify` 当前官方支持的事件是 `agent-turn-complete`。如果未来版本增加了其他事件，需要改用脚本解析通知 JSON，并仅允许：

```python
notification.get("type") == "agent-turn-complete"
```

### 任务变慢

不要在通知命令中直接使用 `PlaySync()`，也不要等待播放器进程结束。通知程序应该启动后台播放器后立即退出。

## 给其他 AI 的配置提示词

下面的提示词可以直接交给其他 AI：

```
请帮我为本机 Codex 配置"每轮对话结束后播放一次 WAV 音效"。

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
9. 最后明确列出修改了哪些文件和实际播放器路径，不要只回复"已完成"。

我的 WAV 音频文件路径是：在这里填入绝对路径
```

## 参考资料

- Codex 高级配置：`https://learn.chatgpt.com/docs/config-file/config-advanced`
- Codex 配置参考：`https://developers.openai.com/codex/config-reference/`
- Microsoft PlaySound：`https://learn.microsoft.com/en-us/windows/win32/multimedia/the-playsound-function`
