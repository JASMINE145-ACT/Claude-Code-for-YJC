---
name: project_agent_jk
description: agent-jk Agent Team version3 项目状态（2026-04-30）：Bug修复计划已文档化、subagent能力存在但工作流未跑通
type: project
---

# agent-jk Agent Team version3 项目（2026-04-30）

## 项目定位（已润色）

面向报价与周报场景的智能协作 Agent 系统，通过多 Agent 分层编排实现端到端自动化：

```
Control UI（前端）
  └── reasoning 可视化 / 结构化结果渲染 / 无障碍支持
          ↓
Backend Agent（编排层）
  ├── WorkExecutor — 任务编排与状态跟踪
  ├── Session / ConversationSummary — 多轮上下文管理
  └── KnowledgeBackend — 业务知识积累与复用
          ↓
Plugin: JAgent（业务技能层）
  ├── 规则预筛（库存/历史报价/规则库）
  └── LLM 语义判断（批量匹配 + 理由输出）
          ↓
Reports（数据层）
  ├── Phase 1（同步）：数据抓取 → 统计 → 报告生成
  └── Phase 2（异步）：LLM 分析 → 回写 → 可追踪状态
```

核心能力：报价匹配（规则引擎 + LLM 双层过滤）/ 周报两阶段流水线 / Reasoning 可视化 / 多 Agent 协作。

---

## Bug1 + Bug2 修复计划（2026-04-30，已写入 Plan）

| Bug | 根因 | 修复方案 | 涉及文件 |
|-----|------|----------|----------|
| Bug1：库存查询结果出现异常字符"1" | `accumulated[0]` 跨 ReAct step 累积，GLM 先吐"1"再发 tool_call | `on_tool_calls_ready` 回调里清零 accumulated | `backend/server/gateway/handlers/chat.py` |
| Bug2：查询过程消息闪烁与重建 | `state="final"` 时先清 chatStream 再 push message，时间差导致闪烁 | 先 push 最终消息，再清 stream | `control-ui/src/ui/controllers/chat.ts` L271-274 |

**Plan 文件**：`docs/superpowers/plans/2026-04-30-chat-stream-bugfix.md`

**状态**：2026-04-30 验证时发现 Bug1 + Bug2 均已在代码中实现，无需额外操作。代码 review 完成：两处修复均正确，无回归。

**Code Review 结果（2026-04-30）**：

| Fix | Verdict | Notes |
|-----|---------|-------|
| Bug1：`on_tool_calls_ready` 清 accumulated | ✅ PASS | 闭包引用同一 list，清零时机正确 |
| Bug2：final 先 push 再清 stream | ✅ PASS | 顺序符合 spec，闪烁消除 |

**Pre-existing concerns**（非本次引入）：
- `delta` 分支 L267：`next.length >= current.length` 在乱序时可能设短串（潜在视觉回退风险）
- `accumulated` 清零后若 `result["answer"]` 为空，post-tool 流式 token 无法被捕获（L371 备选为空）

---

---

## Bug3：拖拽提示层不消失（2026-05-01，已修复）

**文件**: `control-ui/src/ui/views/chat.ts` L474-479

**问题**：拖拽文件进聊天页面后松开鼠标，"松开以上传 Excel/PDF" 提示层持续显示不隐藏。

**根因**：`handleDragLeave` 中 `if (next == null) return;` 导致松开鼠标时（`relatedTarget === null`）直接 return，`onComposeDragLeave` 不被调用。

**修复**:
```typescript
// Before (buggy):
if (next == null) return;
if (el.contains(next)) return;
props.onComposeDragLeave?.();

// After (fixed):
if (next != null && el.contains(next)) return;
props.onComposeDragLeave?.();
```

**Plan 文件**: `docs/superpowers/plans/2026-05-01-drag-leave-bug.md`
**测试**: 新增 test case + DragEvent polyfill，19 个测试全部 PASS，无回归。

---

## Subagent 能力说明（2026-04-30 确认）

- **能力存在**：`Agent` tool 可派发子 agent（`subagent_type` 可选 general-purpose）
- **现状**：能力存在但工作流未跑通——没有配置好的 subagent 池或调度器
- **Superpower skills**：已创建 6 个 skill 文件在 `D:\Projects\claude-code\.claude\skills\superpowers-*`，但实际 dispatch 需手动构造 prompt 和 context
- **执行建议**：Bug1/Bug2 适合 Inline Execution（改动小、互不依赖），周报 P0 改进适合 Subagent-Driven

---

## 已完成的 Bug 修复（2026-04-30）

### 空白气泡修复（已实施）

**问题**：正常回复后出现额外的空 assistant 气泡（只有机器人头像，没有文本内容）。

**修复**：`shouldSkipEmptyAssistantMessage`（L793-802）+ `hasRenderableNonTextBlocks`（L735-791），在 history 遍历中跳过 content.strip() 为空的 assistant 消息，从源头阻止空白气泡进入渲染队列。

---

## 待执行的 Plans（2026-04-30）

| Plan 文件 | 内容 | 涉及文件 |
|-----------|------|----------|
| `docs/superpowers/plans/2026-04-30-chat-stream-bugfix.md` | Bug1 + Bug2 修复 | chat.py / chat.ts |
| `docs/superpowers/plans/2026-04-30-weekly-report-p0-improvements.md` | 周报 P0 三项改进（排障助手/DQ Gate/列表筛选） | reports-tab.ts / llm_analyzer.py / reports.ts |

---

## 周报优化文档（27 轮迭代状态）

**文档**：`d:/Projects/agent-jk/Agent Team version3/to-do-list/周报优化循环文档.md`

**问题**：一直在完善"计划文档"而不是"计划执行"，27 轮迭代后大部分方案仍是文档阶段。

**建议优先实现（P0）**：
1. **P0-1: DQ Gate 落库与展示** — 后端单一改动，不破坏现有契约
2. **P0-3: 前端失败态排障助手** — 纯前端文案/交互，不碰后端状态机
3. **P0-2: reanalyze 可观测性增强** — 扩展 API 响应结构

**为什么不先做 SSE**：需要后端事件表基建 + 前端状态机重构，跨 PR 依赖多。

---

## reasoning-tags.ts 三层过滤（已确认实现）

| 层级 | 文件 | 处理 |
|------|------|------|
| 层1 | `grouped-render.ts` | 原生 thinking block 无条件置 null |
| 层2 | `reasoning-tags.ts` | `<think>` / Plan/Gather/Act / Reasoning: 前缀 |
| 层3 | `views/chat.ts` | 流式预过滤，全推理时显示读取指示器 |

---

## 周报系统架构

两阶段：
- Phase 1：`Accurate API → pandas → report_md → 入库`（同步）
- Phase 2：`后台线程 → LLM 生成 analysis_md`（异步）

关键文件：
- `backend/reports/runner.py` — Phase 1
- `backend/reports/llm_analyzer.py` — Phase 2
- `backend/server/api/routes_reports.py` — API
- `control-ui/src/ui/views/reports-tab.ts` — 前端
- `control-ui/src/ui/controllers/reports.ts` — 轮询/SSE 状态机

---

## 技术细节

- **.env 加载顺序**：`backend/tools/oos/.env` → `backend/.env` → 项目根 `.env`（根优先）
- **DATABASE_URL**：Neon serverless，sslmode=require，pool_recycle=300
- **Trellis 更新**：每次代码修改后主动询问用户是否更新
- **用户偏好**：简洁回答，不做总结，用户能读 diff

---

## 关键文件速查

| 用途 | 路径 |
|------|------|
| 周报优化文档（27轮） | `to-do-list/周报优化循环文档.md` |
| 聊天异常修复 Plan | `docs/superpowers/plans/2026-04-30-chat-stream-bugfix.md` |
| 周报 P0 改进 Plan | `docs/superpowers/plans/2026-04-30-weekly-report-p0-improvements.md` |
| Superpowers skills（Claude Code） | `D:\Projects\claude-code\.claude\skills\` |