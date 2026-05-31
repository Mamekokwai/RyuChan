---
title: Linux包管理升级 - 终极指令大全(2026-05)
description: >-
  Linux 各发行版全量升级已安装软件包的命令速查，覆盖
  apt/dnf/pacman/zypper/emerge/apk/snap/flatpak/xbps/nix 共 10 种包管理器。
pubDate: 2026-05-31T16:48
image: /images/linux-package-upgrade/0ddfa5cc6ec8146d.png
draft: false
tags:
  - 指令
  - linux
  - package-management
categories: []
---

# Linux 包管理升级

升级系统内所有已安装软件包，按发行版和包管理器分类。

## Debian / Ubuntu (apt)

```bash
# 更新软件包列表
sudo apt update
```

```bash
# 升级已安装软件包至最新稳定版本
sudo apt upgrade
```

```bash
# 完整升级：处理包依赖变更和替换
sudo apt full-upgrade
```

```bash
# 清理不再需要的依赖包
sudo apt autoremove
```

## RHEL / CentOS 7 (yum)

```bash
# 检查可用更新
sudo yum check-update
```

```bash
# 升级所有已安装软件包
sudo yum update
```

## RHEL / CentOS 8+ / Fedora (dnf)

```bash
# 检查可用更新
sudo dnf check-update
```

```bash
# 升级所有已安装软件包
sudo dnf upgrade
```

```bash
# 清理缓存
sudo dnf clean all
```

## Arch Linux (pacman)

```bash
# 同步软件包数据库并升级所有已安装软件包
sudo pacman -Syu
```

```bash
# 清理包缓存（保留最近 3 个版本）
sudo paccache -r
```

## OpenSUSE (zypper)

```bash
# 更新软件源索引
sudo zypper refresh
```

```bash
# 升级所有已安装软件包
sudo zypper update
```

## Gentoo (emerge)

```bash
# 同步 Portage 树并更新整个系统
sudo emerge --sync && sudo emerge --update --deep --newuse @world
```

```bash
# 清理不再需要的依赖
sudo emerge --depclean
```

## Alpine (apk)

```bash
# 更新索引并升级所有包
sudo apk update && sudo apk upgrade
```

## Snap（跨发行版）

```bash
# 刷新所有已安装 snap 包
sudo snap refresh
```

```bash
# 查看待升级的 snap 列表
sudo snap refresh --list
```

## Flatpak（跨发行版）

```bash
# 升级所有已安装 flatpak 应用和运行时
flatpak update
```

```bash
# 清理不再需要的运行时
flatpak uninstall --unused
```

## NixOS (nix)

```bash
# 重建系统并升级所有包（切换至新世代）
sudo nixos-rebuild switch --upgrade
```

```bash
# 仅构建不切换（测试用）
sudo nixos-rebuild build --upgrade
```

```bash
# 清理旧世代和包缓存
sudo nix-collect-garbage -d
```

## Void Linux (xbps)

```bash
# 同步仓库索引
sudo xbps-install -S
```

```bash
# 升级所有包
sudo xbps-install -u xbps && sudo xbps-install -Su
```

```bash
# 清理旧包缓存
sudo xbps-remove -Oo
```

## 升级后操作

```bash
# 检查是否需要重启（内核/ glibc / systemd 更新后）
sudo needrestart
```

```bash
# Debian/Ubuntu: 清理旧内核
sudo apt autoremove --purge
```

```bash
# 查看残留配置文件（dpkg 系）
dpkg -l | grep '^rc'
```

```bash
# 对比 .pacnew 配置文件（Arch 系）
sudo pacdiff
```

## 通用工具 (topgrade)

```bash
# 跨包管理器一键升级所有软件
topgrade
```

> **注意**：生产环境升级前建议先在测试环境验证，并做好系统备份。
