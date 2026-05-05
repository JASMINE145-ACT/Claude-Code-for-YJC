---
name: Neon PostgreSQL SSL connection pool issue
description: psycopg2 ThreadedConnectionPool needs pool_recycle+sslmode to survive Neon serverless idle disconnect
type: feedback
---

## Neon Serverless SSL 断连根因：psycopg2 ThreadedConnectionPool 无 pool_recycle

**规则**: `session_backend_neon.py` 和 `knowledge_backend.py` 使用 `psycopg2.pool.ThreadedConnectionPool`，必须显式处理 SSL + 连接回收，否则必现 `SSL connection has been closed unexpectedly`。

**Why:** Neon Serverless 的 idle connection 在约 5 分钟后被服务端主动关闭。`ThreadedConnectionPool` 默认永久复用连接，不会主动回收。空闲超过 5 分钟后再用这条死连接 → SSL closed。

**How to apply:** 涉及 Neon 连接的代码（`session_backend_neon.py`、`knowledge_backend.py`），优先用 SQLAlchemy `QueuePool` 替代 `psycopg2.pool.ThreadedConnectionPool`，配置：
- `pool_recycle=300`（5分钟回收，低于 Neon 断连时间）
- `pool_pre_ping=True`（checkout 前验证连接是否活着）
- `connect_args={"sslmode": "require"}`（显式声明 SSL）
- `max_overflow=0`（避免超过 Neon 连接数限制）

**对比**：正确案例是 `repository.py` — 用 `create_engine` + `pool_pre_ping=True`，正常工作。

**错误案例**（当前有问题的）：
- `backend/agent/session_backend_neon.py` — `ThreadedConnectionPool(minconn=1, maxconn=5, dsn=database_url)` 无 pool_recycle
- `backend/agent/knowledge_backend.py` — `ThreadedConnectionPool(minconn=1, maxconn=3, dsn=database_url)` 无 pool_recycle

**DATABASE_URL** 当前值（含 `sslmode=require&channel_binding=require`），但 DSN 字符串透传给 `ThreadedConnectionPool` 时 SSL 握手仍可能失败，因为 `channel_binding=require` 与某些 Neon 代理不兼容。

**最小排查清单**（5 分钟可执行）：
1. `echo $DATABASE_URL` 确认 URL 含 `sslmode=require`
2. 确认部署平台（Render Free Tier 有 24h 空闲断连，更严重）
3. 记录业务空闲时长是否超过 5 分钟
4. `maxconn=5` 对 Neon 免费版可能偏大（限制 6 连接）
5. 确认 `pool_recycle` 是否设置（没有 = 必现 SSL 断连）
