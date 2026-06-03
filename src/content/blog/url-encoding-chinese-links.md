---
title: 为什么你输入的链接从「私人/幽香.jpg」变成了「%E7%A7%81%E4%BA%BA/...」
description: >-
  中文 URL 为什么变成 %XX 乱码？从 HTTP 协议的 ASCII 遗产说起，讲透 URL 编码的原理、UTF-8
  字节转换、浏览器何时帮你藏、curl 何时炸、以及实操建议。
pubDate: 2026-06-03
image: https://cdn.example.com/Obsidian/发布/注释/URL编码-中文链接变形记-cover.png
draft: false
tags:
  - url-encoding
  - http
  - utf-8
  - web
  - tutorial
categories: []
slug: url-encoding-chinese-links
cover: 发布/注释/URL编码-中文链接变形记-cover.png
summary: 从中文链接变 %XX 乱码说起，讲透 URL 编码原理：UTF-8 字节转换、浏览器兜底、curl 踩坑、1994 年的设计债。
type: tutorial
original: "[[笔记/网络与服务器/URL编码-中文链接变形记|URL编码-中文链接变形记]]"
Release Platform:
  - blog.nywerya.xyz
---

# 为什么你输入的链接从「私人/幽香.jpg」变成了「%E7%A7%81%E4%BA%BA/...」

## 你有没有见过这种场景

你往 Markdown 里插一张图片：

```markdown
![幽香](https://cdn.example.com/Obsidian/私人/绘画/幽香.jpg)
```

写完还挺满意——路径清晰，中文文件名一目了然。Ctrl+C 复制链接，贴到地址栏，回车——图片正常显示。一切正常。

然后你 `curl` 一下：

```bash
curl -I "https://cdn.example.com/Obsidian/私人/绘画/幽香.jpg"
```

返回 `400 Bad Request`。

过了几天，你在 Obsidian 里把同一个文件拖进编辑器，发现它自动变成了：

```
https://cdn.example.com/Obsidian/%E7%A7%81%E4%BA%BA/%E7%BB%98%E7%94%BB/%E5%B9%BD%E9%A6%99.jpg
```

你盯着这串乱码——不对，这是有规律的，看起来像是某种编码。

没错。这就是 **URL 编码**。

你每天在互联网上看到的每一个链接，只要包含非英文内容，背后都在经历同样的变形。只是浏览器帮你遮住了——它把乱码藏了起来，让你以为中文链接"本来就能用"。

## URL 为什么不能直接写中文

回到 1994 年。

那年 HTTP 1.0 还没正式发布，互联网上跑的链接长这样：

```
http://example.com/index.html
http://example.com/search?q=hello
```

全是 ASCII。因为 RFC 1738（URL 规范）明确规定：**URL 只能包含 ASCII 可打印字符**。理由很朴素——当时互联网上的服务器和路由器五花八门，谁知道某个中间设备收到非 ASCII 字节会怎么处理？

于是得出一条铁律：

> URL 里不能有非 ASCII 字符。要传？先编码。

这就是 URL 编码存在的唯一原因。

你说「浏览器不是能显示中文吗？」——那是在**地址栏**里。浏览器对用户友好，会自动把中文解码显示。但背后的 HTTP 请求，永远、必须、只能是 ASCII。你粘贴到地址栏看到的中文，发出去那一瞬间已经被浏览器偷偷编码了。

不信你打开 F12 → Network，随便点一个中文路径的请求，看 Request URL——全是 `%XX`。

## 怎么变的：三句话

编码规则本身不复杂：

1. **把中文字符转成 UTF-8 字节**。比如「私」= `E7 A7 81`（3 字节）
2. **每个字节前面加个 `%`**，写成十六进制 → `%E7 %A7 %81`
3. **英文字母和数字保持原样**，因为 ASCII 安全

以「幽香.jpg」为例：

```
幽 → UTF-8: E5 B9 BD → %E5%B9%BD
香 → UTF-8: E9 A6 99 → %E9%A6%99
.  → ASCII:  2E       → .（保持）
j  → ASCII:  6A       → j
p  → ASCII:  70       → p
g  → ASCII:  67       → g
```

结果：「幽香.jpg」→ `%E5%B9%BD%E9%A6%99.jpg`

同理，「私人」→ `%E7%A7%81%E4%BA%BA`

脑子里过一遍：UTF-8 里一个 CJK 汉字占 3 字节，所以每个汉字变成 3 组 `%XX`。

## 各种场景实测

同一个中文链接，不同地方的表现：

| 场景 | 看到的 | 实际发出的 |
|------|--------|-----------|
| 浏览器地址栏 | `私人/绘画/幽香.jpg` | `%E7%A7%81%E4%BA%BA/...` |
| Markdown 渲染 | `私人/绘画/幽香.jpg` | 同上，浏览器自动编码 |
| curl (bash) | — | 取决于有没有引号，可能炸 |
| wget | — | `400 Bad Request` |
| Nginx access log | `%E7%A7%81...` | 原始编码后请求 |

想安全地在命令行用中文 URL：

```bash
# 错误：shell 可能把中文吞了
curl https://cdn.example.com/Obsidian/私人/绘画/幽香.jpg

# 正确：手动编码
curl "https://cdn.example.com/Obsidian/$(python3 -c "import urllib.parse; print(urllib.parse.quote('私人/绘画/幽香.jpg'))")"
```

也可以现找一个在线 URL encoder，输入中文得到 `%XX` 版本。

## 为什么有的链接中文没问题

现代规范（RFC 3986 + WHATWG URL Standard）放宽了限制——URL 可以包含 Unicode，**但浏览器必须内部编码后再发**。所以：

- **浏览器里的链接**：大概率没问题，浏览器帮你兜底
- **微信/QQ 里点的链接**：可能没问题，客户端会编码
- **curl 里的链接**：看 shell 和 curl 版本，有时候行有时候炸
- **nginx rewrite 规则**：必须写正则匹配 `%XX`，不能直接匹配中文

所以是「看你运气」。靠谱做法是自己编码一步到位。

## 有没有办法不编码直接传中文

有一个提案叫 **IRI**（Internationalized Resource Identifier，RFC 3987），允许 URL 直接包含 Unicode。现代浏览器和大部分 Web 框架都支持 IRI。

实际效果：

- 你在地址栏输入 `https://网站/中文路径` ← 浏览器支持 IRI 输入
- 但 HTTP 请求头里还是 `https://%E7%BD%91%E7%AB%99/...`
- 所以底层还是编码的

IRI 只是在用户层面让你可以**看中文**，传输层从未改变。

## 操作建议

| 场景 | 建议 |
|------|------|
| 手写 HTML/Markdown | 能编码就编码，文件名尽量用英文 |
| 配 Nginx location | 用 `%XX`，别写中文 |
| bash 脚本 | 用 Python `urllib.parse.quote()` 编码 |
| 图床 CDN | Syncthing 同步到 VPS 时文件名是中文没问题，但公开链接里建议统一编码 |
| 写文章引用 CDN 图片 | 把图片路径跑一遍 encodeURIComponent，粘贴编码后的 |

我的自建图床 `cdn.example.com` 上两种链接都能访问——Nginx 收到的都是 `%XX` 格式，不存在不兼容。区别只在于你肉眼想读中文还是读编码。

## 最后

URL 编码这件事，说到底是互联网在 30 年前留下的疤痕。

当年那群工程师觉得「ASCII 够用了」，没想过有一天中国人要在互联网上写汉字。等到发现不够用了，只能在上面糊一层编码层——用户看到中文，传输层传 ASCII，来回翻译，谁都不爽但谁也没法推到重来。

你现在看到的每一个 `%E7%A7%81`，都在替 1994 年的设计决策还债。
