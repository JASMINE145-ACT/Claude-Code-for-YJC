# VPN / 代理配置指南

## 背景

中国用户访问国际服务需要走代理。本项目开发涉及的工具都需要显式配置代理端口。

**代理地址**：`http://127.0.0.1:7897`（Clash Verge 默认 HTTP 端口）

---

## 前置条件

**Clash Verge 必须开着**，否则工具会报 `Failed to connect to 127.0.0.1 port 7897`。

使用顺序：
```
先开 Clash Verge → 确认 Reality-US 可用 → 再打开终端 / Cursor / Claude Code
```

---

## Git 固定走代理

```bash
git config --global http.proxy http://127.0.0.1:7897
git config --global https.proxy http://127.0.0.1:7897
```

检查配置：
```bash
git config --global --get http.proxy
git config --global --get https.proxy
```

---

## npm 固定走代理

```bash
npm config set proxy http://127.0.0.1:7897
npm config set https-proxy http://127.0.0.1:7897
```

检查配置：
```bash
npm config get proxy
npm config get https-proxy
```

---

## Bun 走代理

Bun 通常自动跟随环境变量，可设置：
```bash
export HTTP_PROXY=http://127.0.0.1:7897
export HTTPS_PROXY=http://127.0.0.1:7897
```

Windows PowerShell：
```powershell
$env:HTTP_PROXY="http://127.0.0.1:7897"
$env:HTTPS_PROXY="http://127.0.0.1:7897"
```

---

## pip / Python 走代理

```bash
pip install <package> --proxy http://127.0.0.1:7897
```

或永久配置：
```bash
pip config set global.proxy http://127.0.0.1:7897
```

---

## curl 走代理

```bash
curl -x http://127.0.0.1:7897 https://github.com
```

---

## Claude Code / Codex 走代理

启动前设置环境变量：
```bash
export HTTP_PROXY=http://127.0.0.1:7897
export HTTPS_PROXY=http://127.0.0.1:7897
ccb
```

---

## 华为云电脑推荐配置

| 场景 | 建议 |
|------|------|
| 华为云连接服务 | DIRECT |
| GitHub / npm / pip / bun / curl | PROXY |
| OpenAI / Claude API | PROXY |
| Cursor / VS Code | PROXY |
| 其它 | DIRECT |

推荐使用 **Rule 模式**，不要长期 Global 模式。

---

## 常见问题

### 报错 `Failed to connect to 127.0.0.1 port 7897`
- 检查 Clash Verge 是否开启
- 检查端口是否正确（默认 7897，可为 7890 等）

### 代理生效但 GitHub 仍超时
- `git config --global --unset http.proxy` 清除旧配置
- 重新设置正确的端口
