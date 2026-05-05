---
name: user language and model awareness
description: User communicates in Chinese and is aware they are using minimax model
type: user
---

User communicates in Chinese (简体中文). User is aware that the underlying model is minimax — they explicitly asked whether I use minimax, confirming they understand the model being used. User works with multiple projects: `d:/Projects/agent-jk` (primary agent project with many API keys in its `.env`) and `D:/Projects/claude-code` (this Claude Code CLI repo). User is interested in MCP integration: successfully set up a Google Maps MCP server (`mcp_servers/google_maps/`) with dependencies installed in the `.venv` virtual environment. API key for Google Maps was sourced from `d:/Projects/agent-jk/.env`. User also copies skills from `d:/Projects/agent-jk/yjc-skill/` into `.claude/skills/` — e.g. `indonesia-biz-trip` skill was copied on 2026-04-17.

**Cursor global rules (2026-04-21):** Created `~/.cursor/rules/karpathy-guidelines.mdc` — a global Cursor rule containing Karpathy's four guidelines (Sparse over Generic, Mentions are Anchors, Consistent Persona, Be a Craftsman). This applies to all Cursor projects.

**Excel file reading:** User confirmed on 2026-04-20 that Python/openpyxl can read `.xlsx` files. The `d:/Projects/agent-jk/Agent Team version3/data/turns.xlsx` is a conversation log with columns: query, thinking, extra.

**Quotation system (2026-04-20):** User has a weekly sales report system in `d:/Projects/agent-jk/Agent Team version3/` that pulls from Accurate Online API, stores in Neon DB (`report_task_config`, `report_records` tables). The LLM analysis (`llm_analyzer.py`) was recently enhanced to include structured week-over-week comparison (amount delta + percentage, order count delta + percentage, daily trend comparison, Top customer进出变化).

**Clarification skill (2026-04-22):** `SKILL_CLARIFY` already handles inventory vs price ambiguity but does NOT cover product type ambiguity. When user says "pvc" without specifying type (drainage/water supply/electrical conduit), the model may guess wrong. User's business has diverse PVC products: drain pipes, water supply pipes, electrical conduit, fittings, valves, adhesives — so "pvc" alone is too ambiguous. Recommended solution: add a clarification rule in `SKILL_INVENTORY_PRICE_RULES` to ask user to confirm PVC type when not specified.

**Working style (2026-04-23):**
- User prefers terse responses — no trailing summaries, can read the diff
- User gives feedback in Chinese, expects responses in Chinese
- User often asks "看一下 trellis" to check documentation before proceeding
- User wants technical details alongside summary ("能看一下原因吗" type questions)
- User self-solves issues quickly after investigation — when I suggested checking Neon tables, user said "我解决了" and moved on
- User prefers to fix root cause rather than patch symptoms (e.g., wanted PN→MPa conversion at field-matching layer, not just LLM prompt fallback)
- User explicitly asks to record lessons to Trellis ("把这个处理过程 记录 trellis 以后别犯类似问题")

**Trellis project management (2026-04-23):**
- User manages `d:/Projects/agent-jk/Agent Team version3/.trellis/` as project memory/spec repository
- `.trellis/spec/backend/database-guidelines.md` is the canonical place for DB lessons learned
- `.trellis/workspace/cursor-agent/journal-*.md` tracks development sessions automatically via `add_session.py` hook
- User wants all lessons (successes and failures) recorded to Trellis, not just code

**Neon database context (2026-04-23):**
- `business_knowledge` table: key='wanding_selector' with 2531 chars, updated 2026-04-21
- Price library `万鼎价格库_管材与国标管件_标准格式`: 4969 rows in Neon (19 skipped due to non-numeric Material codes)
- `Product_Type` column: 国标(67 rows) / 日标(350 rows) — populated from Excel upload
- `DATABASE_URL`: `postgresql://neondb_owner:***@ep-shiny-frost-a16b6ixd-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require`

**Skills 改名（2026-04-25）：** `plan` → `sup-plan`

**主动决策偏好（2026-04-25）：**
- 用户说"你来决定"时，直接制定计划并执行，不需要等确认
- 用户说"持续完善整理一下 trellis"时，我判断方向并执行：新建 knowledge-graph.md + journal 轮转 + 补全 index，用户认可结果
- 用户问 skill 是否常用，我主动说明倾向（markitdown 不如直接用 pandas），用户无异议
