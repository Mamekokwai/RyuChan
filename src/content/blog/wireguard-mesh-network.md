---
title: WireGuard 网状网配置指南 — 让两台不在同一网段的机器互相直连
description: 用一台有公网 IP 的服务器当 hub，把家里的台式、随身笔记本和服务器组进 10.10.0.0/24：7 步配置顺序、5 级验证阶梯、7 个会静默失败的坑。
pubDate: 2026-09-20T00:40
image: https://pic.nywerya.xyz/pic/%E6%B3%A8%E9%87%8A/WireGuard-mesh-cover.png
draft: false
tags:
  - WireGuard
  - 组网
  - 内网穿透
  - 自托管
categories:
  - 教程
slug: wireguard-mesh-network
cover: 发布/注释/WireGuard-mesh-cover.png
summary: 一台公网服务器当 hub，把 NAT 后的台式与笔记本组进 10.10.0.0/24：7 步顺序 + 5 级验证 + 7 个会静默失败的坑。
type: tutorial
Release Platform:
  - blog.nywerya.xyz
---

![WireGuard 网状网](https://pic.nywerya.xyz/pic/%E6%B3%A8%E9%87%8A/WireGuard-mesh-cover.png)

> 场景：家里的台式机和随身笔记本**不在同一网段**（一个 `192.168.31.0/24`、一个 `192.168.3.0/24`，都躲在 NAT 后面），你想让它们像同一局域网那样互相 ping、SSH、互传文件——而且**不开任何公网入站端口**。
>
> 读完你会得到三样东西：① 一台有公网 IP 的服务器当 hub，两台机器各得一个固定私网地址；② 一套 5 级验证阶梯，能分清"通了"和"只是握上手了"；③ 7 个会让你白折腾几小时的坑。

## 📦 准备

| 你要有什么 | 说明 |
| --- | --- |
| 一台有公网 IP 的机器 | 云主机即可（本文用 Ubuntu 24.04 示例）；它当 **hub**，只需放行一个 UDP 端口 |
| 两台要互连的机器 | Windows / Linux / macOS 都行（本文含 Windows 客户端的完整命令） |
| 地址规划 | 本文用 `10.10.0.0/24`：hub `10.10.0.1`、台式 `10.10.0.2`、笔记本 `10.10.0.3` |

先在服务器上确认三件事：

```bash
wg --version || echo "还没装 wireguard-tools"
sysctl -n net.ipv4.ip_forward     # 需要是 1
ss -lunp | grep 51820 || echo "51820/UDP 空闲"
```

## 🚀 快速使用：7 步

### 第 1 步 · 服务器装 WireGuard 并生成自己的密钥

```bash
apt update && apt install -y wireguard-tools
mkdir -p /etc/wireguard && chmod 700 /etc/wireguard
cd /etc/wireguard
umask 077
wg genkey > server.key && wg pubkey < server.key > server.pub
cat server.pub          # 这串公钥后面要用；私钥留在本机，不要外传
```

### 第 2 步 · 服务器写 wg0.conf 并起服务

```ini
[Interface]
Address    = 10.10.0.1/24
ListenPort = 51820
PrivateKey = <把 server.key 的内容粘这里>

# hub 必须显式放行：默认 FORWARD 是 DROP（还常常叠着 ufw / Docker 链），
# 不放行就只有握手、没有数据。
PostUp   = iptables -I INPUT 1 -p udp --dport 51820 -j ACCEPT; iptables -I FORWARD 1 -i %i -o %i -j ACCEPT
PostDown = iptables -D INPUT -p udp --dport 51820 -j ACCEPT; iptables -D FORWARD -i %i -o %i -j ACCEPT
```

```bash
echo "net.ipv4.ip_forward=1" > /etc/sysctl.d/99-wireguard.conf
sysctl -q --system
systemctl enable --now wg-quick@wg0
wg show                 # 应看到 interface: wg0 与 listening port: 51820
```

### 第 3 步 · 每台客户端**在本机**生成密钥

> 私钥永远不要离开它所属的那台机器。只把**公钥**发给服务器。

```bash
# Linux / macOS
wg genkey | tee private.key | wg pubkey      # 输出的那串就是公钥
```

```powershell
# Windows：先装客户端 winget install --id WireGuard.WireGuard -e
& "C:\Program Files\WireGuard\wg.exe" genkey | Set-Content .\private.key
& "C:\Program Files\WireGuard\wg.exe" pubkey (Get-Content .\private.key)
```

### 第 4 步 · 服务器把两个 peer 加进来

```ini
# 追加到 /etc/wireguard/wg0.conf
[Peer]
# desktop
PublicKey  = <台式公钥>
AllowedIPs = 10.10.0.2/32

[Peer]
# laptop
PublicKey  = <笔记本公钥>
AllowedIPs = 10.10.0.3/32
```

```bash
wg syncconf wg0 <(wg-quick strip wg0)     # 热加载，不重启接口
wg show                                   # 应列出两个 peer
```

### 第 5 步 · 客户端装 WireGuard 并导入配置

每台客户端的 `.conf`（只改 `PrivateKey` 与 `Address`）：

```ini
[Interface]
PrivateKey = <本机私钥>
Address    = 10.10.0.2/24
# 不写 DNS：别让隧道接管你的域名解析

[Peer]
PublicKey  = <服务器公钥>
Endpoint   = 203.0.113.1:51820          # 你的服务器公网地址
AllowedIPs = 10.10.0.0/24               # 只把私网走隧道
PersistentKeepalive = 25                # 两端都在 NAT 后：靠它维持映射
```

Windows 起**常驻隧道**（需要管理员；注意命令开头那个 `&`，少了它会报
`You must provide a value expression following the '/' operator`）：

```powershell
& "C:\Program Files\WireGuard\wireguard.exe" /installtunnelservice "C:\path\desktop-wg0.conf"
```

Linux 客户端则 `wg-quick up wg0`（把 conf 放 `/etc/wireguard/wg0.conf`），或 `systemctl enable --now wg-quick@wg0` 常驻。

### 第 6 步 · 按 5 级阶梯验证（**别跳级**）

| 级 | 命令 | 通过的样子 |
| --- | --- | --- |
| ① 握手 | 服务器 `wg show` | 每个 peer 有 `latest handshake: N seconds ago`。**只有 public key 没有握手 = 包根本没到** |
| ② 转发 | 服务器 `iptables -L FORWARD -nv` | 第 1 条 `wg0→wg0 ACCEPT` 的**计数器在涨**（握手不产生转发） |
| ③ 可达 | 两端 `ping 10.10.0.2` / `ping 10.10.0.3` | 有 reply |
| ④ 应用层 | `Test-NetConnection 10.10.0.3 -Port 22000` | `TcpTestSucceeded : True` |
| ⑤ 业务 | `ssh user@10.10.0.3 hostname` | 返回对端主机名 |

我这边实测：两端互 ping **58–60 ms**（用国内云主机当 hub），应用层端口一次连通。

### 第 7 步 · 把应用切到私网地址

以 Syncthing 为例：把对端设备地址从 `dynamic` 改成静态 `tcp://10.10.0.3:22000`（两台各改对方的），然后看连接类型从 `relay-client / relay-server` 变成 **`tcp-client`**——我这边 **8 秒**完成切换，同步从此不再经过公共中继。

## ⚙️ 参数速查

| 项 | 含义 | 常见取值 |
| --- | --- | --- |
| `Address` | 本机在私网里的地址 | hub 用 `10.10.0.1/24`，peer 用 `10.10.0.x/24` |
| `AllowedIPs`（peer 段） | 既是"允许该 peer 使用哪些源地址"，也决定"哪些目标走它" | 客户端填 `10.10.0.0/24`；hub 上每个 peer 填 `/32` |
| `PersistentKeepalive` | NAT 后维持映射的保活间隔 | `25`（秒） |
| `ListenPort` | hub 的 UDP 端口 | `51820` |
| `PostUp / PostDown` | 起停接口时顺带执行的命令（放行规则） | 见第 2 步 |
| split tunnel | 只路由私网，不动默认路由与 DNS | `AllowedIPs = 10.10.0.0/24` |
| full tunnel | 全流量走隧道 | `AllowedIPs = 0.0.0.0/0` + `DNS = …`（本文**不**用） |

## 📋 它做什么 / 不做什么

**做**：

- 让 NAT 后的机器拥有固定私网地址，**双向可达** ✓
- 只用一个 UDP 端口，**不开任何公网入站端口** ✓
- 端到端加密（Noise），走标准 UDP，现有防火墙与 NAT 正常对待 ✓

**不做**：

- **不能唤醒睡眠或关机的机器**——没有网络栈就没有可达性，跨网 Wake-on-LAN 基本不现实 ✗
- 不自动穿透所有 NAT：两边都在大 NAT 后面时，用 hub 转发最省事 ✗
- 不替代认证：**私钥就是身份**，泄露等于把机器交出去 ✗

## 🔧 排障速查

| 现象 | 原因 | 解决 |
| --- | --- | --- |
| `wg show` 里 peer 没有 handshake | 包没到：端口没开 | 云主机**安全组**要单独放行 UDP 端口（服务器本机放行了不代表能进来） |
| 握手正常，但 ping / ssh 全超时 | Windows 防火墙把 wg 适配器判成 **Public** 档案，而入站规则只对 Private 生效 | 每台加一条限网段的入站规则（见下） |
| 握手正常、转发计数器不涨 | hub 没有放行转发 | `iptables -I FORWARD 1 -i wg0 -o wg0 -j ACCEPT` |
| 重启后规则消失 | `PostUp` 没写或写错 | 对照 `wg show` 与 `iptables -L FORWARD -nv` |
| 能用私网但**上不了网** | `AllowedIPs` 写成 `0.0.0.0/0` 又没配转发/DNS | 改 split tunnel：`10.10.0.0/24` |
| 只有某个应用通、别的都不通 | 该应用自己的防火墙规则恰好放行（如 Syncthing 是 Any），其它不是 | 别把"某个服务能通"当成"网络没问题" |
| 加了 peer 却不生效 | `wg syncconf` **不动路由表** | 需要路由就用 `wg-quick` 重起接口 |

Windows 侧那条入站规则（每台跑一次，**管理员**）：

```powershell
New-NetFirewallRule -DisplayName "WireGuard mesh (10.10.0.0/24)" -Direction Inbound -Action Allow -RemoteAddress 10.10.0.0/24 -Profile Any
```

它只对 `10.10.0.0/24` 生效，而该网段里只有持钥匙的设备，不是对公网开放。

---

## 以下是原理与设计说明（只想解决问题的可以到此为止）

### 为什么"握手"是唯一可靠的健康信号

WireGuard 不做协议协商：没有"连接"概念，只有一组 peer 和它们的公钥。发数据前先做一次 Noise 握手，握手成功才认对方。所以接口 up、端口在听、进程在跑，**都不能**说明对端可达——只有 `latest handshake` 能。

### 为什么两端都在 NAT 后要用 hub

谁也主动连不上谁（对方地址是 NAT 私有的）。三种办法：

| 办法 | 代价 |
| --- | --- |
| **hub-and-spoke**（本文） | 数据多一跳，经 hub 转发；配置最省事、行为最可预测 |
| 端口映射 | 要在两边路由器上做映射，等于暴露端口 |
| NAT 打洞 | 需要双方同时发包 + 信令服务器，成功率看 NAT 类型 |

hub 的职责就两条：**转发（FORWARD）** 与 **保活（keepalive）**。这也是为什么"握手成功却没有数据"几乎总是转发没放行。

### 为什么坚持 split tunnel

`AllowedIPs = 0.0.0.0/0` 是"全流量走隧道"：一旦 hub 侧没有 NAT 与转发，你的机器当场断网；`DNS=` 还会接管解析，把内网服务名搅乱。**只路由你真正需要的那一段**，机器其余行为完全不变，出问题也只影响这一个网段。

### 我为什么用它替掉了反向 SSH 隧道

之前是"笔记本主动连服务器开反向隧道、台式经服务器跳进去"——能跑，但：

| | 反向 SSH 隧道 | WireGuard |
| --- | --- | --- |
| 连接语义 | 靠一条常驻 SSH 进程"握着" | 接口一直存在，按需发包 |
| 稳定性 | 断了要等重连；密集连接还可能被服务器在密钥交换阶段掐掉 | 保活在 UDP 层，重连无感 |
| 应用层 | 基本只有 SSH / 端口转发能用 | **任何** IP 应用都能用（我把 Syncthing 直接切了过来） |
| 依赖 | 每台机器上要维护隧道进程与自启 | 一个系统服务 |

实际收益：两台之间的 Syncthing 从**经公共中继**变成**直连**，跨机脚本也少一跳、不再被服务器的连接限流误伤。

### 顺序为什么不能乱

最容易犯的错是"一次全配完，然后对着一个不工作的结果猜"。可用的顺序是：**先立 hub → 再让 peer 出现 → 验握手 → 验转发 → 验应用层 → 最后动业务**。每一级都有独立、可观察的判据，失败时你知道停在哪一级，而不是从头怀疑一切。

## 小结

1. **7 步**：服务器密钥 → `wg0.conf` + 起服务 → 各机自生成密钥 → 服务器加 peer → 客户端导入 → 5 级验证 → 切应用。
2. **验证阶梯比配置本身重要**：握手 ≠ 转发 ≠ 可达 ≠ 应用层。
3. 最容易白折腾的三处：**云安全组**是另一道门、**hub 必须放行 FORWARD**、**Windows 防火墙的 Public 档案**。

参考：

- WireGuard 官网与各平台安装包：https://www.wireguard.com/install/
- `wg` 手册：https://manpages.debian.org/unstable/wireguard-tools/wg.8.en.html
