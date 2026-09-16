---
title: Obsidian Bases 有没有「SQLite 后端」？我把官方 changelog 和 7684 个插件都查了一遍
description: 有篇文章称 Bases 做了「SQLite 架构重写」，还给出 45 秒索引、120 毫秒渲染等基准数字。我核了官方 changelog、社区插件注册表和它的原文：没有任何依据。附一套可复用的核查方法。
pubDate: 2026-09-16T09:30
image: https://photo.nywerya.xyz/Obsidian/发布/注释/ObsidianBases-SQLite-claim-cover.png
draft: false
tags:
  - Obsidian
  - Bases
  - 内容核实
  - 辟谣
categories:
  - 核实
slug: obsidian-bases-sqlite-claim-debunk
cover: 发布/注释/ObsidianBases-SQLite-claim-cover.png
summary: 官方 changelog 全文 30,995 字里 SQLite 出现 0 次；7684 个社区插件里没有一个叫 Bases。这篇把证据和自查方法一起给你。
type: reference
Release Platform:
  - blog.nywerya.xyz
---

# Obsidian Bases 有没有「SQLite 后端」？我把官方 changelog 和 7684 个插件都查了一遍

![封面](https://photo.nywerya.xyz/Obsidian/发布/注释/ObsidianBases-SQLite-claim-cover.png)

## 结论先行

有一篇 2026 年 5 月的文章（[原文](https://notes-automate.com/posts/obsidian-bases-native-update-review-2026/)）称 Obsidian 的 Bases 做了「SQLite 架构重写」，并给出了一串看起来非常专业的基准数字。我逐条核对后：

1. **官方 changelog 全文 30,995 字**（覆盖 1.13.4–1.14.2，截至 2026-09-15），**`SQLite` 出现 0 次**，`database` 0 次，`架构` 0 次。
2. **官方社区插件注册表 7684 个插件里，没有任何一个叫「Bases」**——所有名字带 base 的都是**长在官方 Bases 之上的扩展**。
3. 那篇文章全文 **30 个链接，指向 obsidian.md / GitHub / 官方论坛的：0 个**。讲「官方架构重写」，却不引任何官方页面。

所以：**该文关于「Bases 使用 SQLite 后端」的说法，没有任何官方或注册表依据。** 下面是你可以自己复现的核查过程。

## 那篇文章说了什么

它的核心句子（原文引用）：

> "The 2026 update represents a **complete rewrite** of the Bases plugin. Instead of parsing markdown files on the fly every time a table is opened, Bases now utilizes a **background SQLite cache** that maintains a real-time index of your vault's metadata."

> "Instead of holding the entire vault's metadata in active RAM, the **SQLite background worker** pages data in and out as required."

> "the new **SQLite-backed architecture** runs natively on both iOS and Android versions of Obsidian."

它还给了一组「实测」数字：在 **15,000 篇**的 vault 上，安装后初次缓存耗时 **45 秒**（M3 MacBook Pro），打开跨 12 列、**5,000 行**的表格渲染 **120 毫秒**，重度读写时**峰值内存仅 150MB**——并建议把 `.obsidian/bases-cache.db` 排除出同步目录。

听起来很硬。问题是，这些数字没有任何一处给出可复现的方法。

## 三条核查（你可以自己跑）

### 1. 回一手源，用全量词频而不是印象

打开官方 changelog：`https://obsidian.md/changelog/`，把页面正文存下来全文检索：

- `SQLite` → **0 次**
- `database` → **0 次**
- `Bases` → **15 次**，逐条看过去，全是具体功能条目：新增 **Kanban 布局**（用 `Group by` 定义列、可拖拽排序）、**跨文件夹列拖拽**（按 `file.folder` 分组时卡片可在文件夹列间移动，列内新建笔记会自动落进对应文件夹）、表格视图 **RTL 支持**、列宽菜单、数字属性自动列宽、CSV 导出修复、弹出窗口里的公式编辑器修复。

同期的性能相关条目是「**模糊匹配算法改进**（>10,000 文件的 vault 更快）」和「数学渲染换成 MathJax 4.1.3」——都跟「SQLite 重写」无关。

### 2. 查「存在性」：到底有没有一个叫 Bases 的插件？

有人会说：会不会它讲的根本不是官方功能，而是某个第三方插件？

我把官方社区插件注册表（`community-plugins.json`，**7,684 个条目**）拉下来检索：

- id 或名字里含 `base` 的插件有一大批，但没有一个叫「Bases」。它们是 `bases-kanban`、`bases-chart`、`bases-cms`、`bases-improvements`、`colored-bases-properties`……
- 而且这些插件自己的描述写得很清楚，比如 `bases-kanban`：**"A kanban-style drag-and-drop custom view for Obsidian Bases"**。

**一个东西能被几十个插件当作底座来扩展，恰恰说明「Bases」指的就是官方的核心功能。** 同时，那篇文章里出现了 0 次「community plugin / 第三方 / 官方」这类自我限定，它引用 Obsidian 核心 API、称其为「native update」——如果它指的真是某个第三方插件，它从头到尾没告诉读者是哪一个。

### 3. 那 Obsidian 里的 SQLite 是真的吗？

是真的，但属于**另一类插件**，与 Bases 无关：

| 插件 | 官方注册表里的描述 |
| --- | --- |
| `sqlseal` | Use **SQL** in your notes to query your vault files and CSV content |
| `sqlite-db` | Interact with local **SQLite** files in your notes |
| `sqlite-explorer` / `sql-viewer` / `obs-sqlite-md` | 打开、预览、查询 SQLite 文件 |
| `vaultquery` | 对笔记执行 SELECT / INSERT / UPDATE / DELETE |
| `quackblocks` / `duckdb-motherduck` | DuckDB WASM 跑 SQL |

最可能发生的事情是：把「Obsidian 里的 SQLite 查询插件」这个话题，嫁接到了「Bases」这个热词上。听起来很硬的组合，但两边都不成立——SQLSeal 不是 Bases，Bases 也没有 SQLite 后端，更没有所谓「2026 年重写」。

## 它为什么会长成这样（这部分是推断）

我不主张作者有恶意，也不评价该站其他文章。以下是可观察到的三点，其中只有第一点是我能证明的：

1. **可证**：该页有三处分佣/广告披露，包括 *"As an Amazon Associate we earn from qualifying purchases."*、*"This post may contain affiliate links."* 和 *"We use privacy-minded analytics, advertising scripts, and affiliate tracking to keep this site free."* 分佣模式下，选题天然偏向「越重磅越有点击」。
2. **推断**：文章结构完整、篇幅够长，但没有版本号、没有提交记录、没有官方链接，却给出精确到毫秒的数字——这是批量生成内容常见的形状。
3. **推断**：「索引 / 缓存」这个模糊印象（Obsidian 确实有自己的缓存与索引机制）被套上了一个听起来很硬的技术名词。

## 三条自查法（收藏备用）

1. **回一手源 + 全量词频**：别靠印象，把官方页面存成纯文本搜关键词。**数字比记忆可靠**——「`SQLite` 0 次」是一句话就能说清、别人也能复现的证据。
2. **做存在性检查**：说「某插件如何如何」，就去插件注册表/仓库查这个插件是否存在、描述是否对得上。
3. **警惕“具体到可疑”的数字**：45 秒、120 毫秒、150MB 这种精度，必须伴随可复现的方法（工具、版本、数据集）。没有方法的精确数字，不是证据，是修辞。

## 我不主张什么（边界声明）

- 我不主张作者是故意的，也不评价该站其它内容；
- 我的结论只到「**没有任何官方或注册表依据**」这一步；
- 如果谁能给出**官方 changelog 里带 SQLite 的条目**，或者一个 **id/名字就叫 `bases` 的社区插件**，欢迎指正——这两条任意一条成立，我就改口。

工具摆在这儿，方法也给了：下次再看到「某工具被彻底重写」这种重磅说法，花三分钟自己查一遍，比信任何人的转述都值。
