---
name: user feedback on plan mode and structure
description: User expected two plan files but found only one; confirmed only Analysis tab for week comparison
type: feedback
---

User used `/plan` thinking there were two plans, but found only one at `D:\Config\ccb-claude\plans\warm-kindling-boot.md`. User clarified the need is to add week-over-week comparison data to the weekly report's intelligent analysis section, and confirmed it should only appear in the Analysis tab (not the Data tab).

**Why:** User's intent was clear — they want LLM-generated analysis to include structured week-over-week comparison, not a new UI component in the Data tab.

**How to apply:** When user invokes `/plan` and asks about plans, check `D:\Config\ccb-claude\plans/` for the single plan file. The plan naming uses a "warm-kindling-boot" pattern (adjective-noun-noun) — looks like a randomly generated name.

**sup-plan confirmed identical to /plan（2026-04-26）：** 用户问三个 plan 命令（`/plan` / `/sup-plan` / `/multi-plan`）区别，发现 `/plan` 和 `/sup-plan` 功能完全相同，`sup-plan` 是从 `D:\Projects\claude-code\.claude\skills\sup-plan` 加载的 skill，`multi-plan` 未验证。用户确认只保留 `/plan`（已够用）。

---

**plan 文件位置（2026-04-26 确认）：**
- Agent Team version3 工作流 plan：`d:/Projects/agent-jk/Agent Team version3/.trellis/workflow/2026-04-26-remove-channels-tab.md`（Claude Code session 创建）
- Claude Code 自己的 plan：`D:\Config\ccb-claude\plans/`（Cursor project plans）
