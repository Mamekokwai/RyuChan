---
title: 自建博客 SEO 实战：不提废话，做完就有效
description: >-
  自建博客搜索优化的手把手教程，覆盖 Sitemap、robots.txt、
  Google Search Console、内容 Checklist、站外引流。
pubDate: 2026-06-02
image: https://photo.nywerya.xyz/Obsidian/发布/注释/SEO-自建博客搜索优化实战-cover.png
draft: false
tags:
  - seo
  - blog
  - google
categories:
  - 教程
slug: self-hosted-blog-seo-guide
cover: 发布/注释/SEO-自建博客搜索优化实战-cover.png
summary: 自建博客搜索优化的手把手教程，不提废话，做完就有效。Astro / Hexo / Hugo 通用。
type: tutorial
Release Platform:
  - blog.nywerya.xyz
original: "[[笔记/网络与服务器/SEO-自建博客搜索优化实战|SEO-自建博客搜索优化实战]]"
---

# 自建博客 SEO 实战：不提废话，做完就有效

适用：Astro / Hexo / Hugo / VitePress 等静态博客，自建域名。

## 1. 技术基建（一次配好）

### 1.1 Sitemap

```bash
# Astro
pnpm add @astrojs/sitemap
```

```js
// astro.config.mjs
import sitemap from '@astrojs/sitemap';
export default { integrations: [sitemap()] };
```

构建后会生成 `sitemap-index.xml`。

### 1.2 robots.txt

放入 `public/robots.txt`：

```
User-agent: *
Allow: /
Sitemap: https://你的域名/sitemap-index.xml
```

### 1.3 文章 Frontmatter 必填项

每篇不缺不漏：

```yaml
title: 含关键词的标题
description: 150 字内摘要
pubDate: 2026-06-02
image: https://你的图床域名/封面图.png
draft: false
tags:
  - 关键词1
  - 关键词2
```

### 1.4 图片优化

- 用 WebP / AVIF（PNG 太大）
- 标签写 `width` `height`（防 CLS）
- 封面图放 CDN / 图床，不存 Git 仓库

---

## 2. Google Search Console（必做）

1. 打开 [search.google.com/search-console](https://search.google.com/search-console)
2. 添加资源 → 网址前缀 → 填 `https://你的域名`
3. 验证（HTML 文件上传最简单：下载 `.html` 放到 `public/`，部署即可）
4. 左侧菜单 → 站点地图 → 提交 `sitemap-index.xml`
5. 网址检查 → 逐个输入你的文章 URL → 请求编入索引

**每发一篇新文章，第 5 步重复一次。**

---

## 3. 内容 Checklist（每篇对照）

| 项 | 说明 |
|----|------|
| 标题含关键词 | 搜的人打什么，标题就含什么 |
| URL 语义化 | `/blog/deploy-waline` 不是 `/blog/post-3` |
| 内链 2+ | 每篇链到两篇旧文 |
| H2/H3 含关键词变体 | 不只是「问题」，而是「搜索权重低怎么办」 |
| 首段 100 字摘要 | Google 展示在搜索结果里 |
| 封面图 1000×600 | Open Graph 分享时的社交卡片 |

---

## 4. 站外引流（按优先级）

1. **GitHub**：README / 项目主页放博客链接
2. **技术社区**：V2EX、掘金发帖时引用
3. **社交媒体**：Twitter / 朋友圈转发

---

## 5. 检查清单（每次写完文章）

- [ ] `title` `description` `pubDate` `image` 不缺
- [ ] 一张封面图，CDN URL 可访问
- [ ] 内链 ≥ 2 篇旧文
- [ ] URL 可读
- [ ] 部署后去 Search Console 手动提交 URL
- [ ] Sitemap 状态正常
