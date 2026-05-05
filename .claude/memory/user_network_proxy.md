---
name: user_network_proxy
description: User in China needs proxy port 7897 for GitHub and dev tools
type: feedback
---

所有开发工具必须显式走代理：`http://127.0.0.1:7897`

**Git 配置（已永久设置）：**
```bash
git config --global http.proxy http://127.0.0.1:7897
git config --global https.proxy http://127.0.0.1:7897
```
Git 操作会自动使用代理，无需每次设置。

**npm / pip / bun / curl 同样需要配置：**
```bash
npm config set proxy http://127.0.0.1:7897
pip config set global.proxy http://127.0.0.1:7897
export HTTP_PROXY=http://127.0.0.1:7897 HTTPS_PROXY=http://127.0.0.1:7897
curl -x http://127.0.0.1:7897 https://github.com
```

**Why:** 用户在中国，GitHub 443 端口不通，Clash Verge 系统代理不一定自动生效于命令行工具，需要显式配置。

**How to apply:** 任何涉及 GitHub / npm / pip / bun / curl 的操作都假设代理已配置。如遇连接失败，首先检查代理是否开启。

**前提：Clash Verge 必须开着**，端口错误时报 `Failed to connect to 127.0.0.1 port 7897`。

**华为云推荐 Rule 模式：** GitHub / npm / OpenAI / Claude API 走代理，其它 DIRECT。
