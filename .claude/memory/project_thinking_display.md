---
name: project_thinking_display
description: 前端 thinking/reasoning 展示配置（已扩展覆盖 agent-jk control-ui 三层过滤 + 空白气泡修复）
type: project
---

# Thinking & Reasoning 展示配置

> 注意：本文档覆盖 Claude Code CLI（`src/components/Message.tsx`）和 agent-jk 项目（`control-ui/src/`）两套配置。

## Claude Code CLI 自身（2026-04-22，已归档）

**文件**: `src/components/Message.tsx` L449-451

LLM 照常 thinking，但前端不显示：
```typescript
case 'thinking': {
  return null
}
```

恢复方法：改回原版本即可。

---

## agent-jk control-ui（多层过滤，已实现）

### 三层架构

| 层级 | 文件 | 处理逻辑 |
|------|------|----------|
| 层1 | `grouped-render.ts` | `extractedThinking = null`（原生 thinking block 无条件不渲染） |
| 层2 | `reasoning-tags.ts` | `stripReasoningTagsFromText` 处理三种格式：`<think>` / Plan/Gather/Act / `Reasoning:` 前缀 |
| 层3 | `views/chat.ts` | `buildChatItems` 中 `stripThinkingTags` 预过滤流式文本，全推理时显示读取指示器 |

### reasoning-tags.ts 三层规则

| LLM 输出格式 | 触发条件 | 处理方式 |
|-------------|----------|----------|
| `<think>…` | 已有逻辑 | 标签内容剥除 |
| `1. Plan / 2. Gather…` | 消息开头匹配 `^(?:###\s*)?1\.` | 整条消息返回空字符串，泡泡不渲染 |
| `Reasoning:\n…` | 消息开头是 `Reasoning:` | 剥除前缀推理块，只保留空行后的结论句 |

**正则说明**：`^(?:###\s*)?1\.` 只需看到 `1.`（句点）即触发，不等待完整单词 `Plan`，确保流式输出早期 partial token 也被过滤。

---

### 空白气泡修复（2026-04-30，已实施）

**问题**：正常回复后出现额外的空 assistant 气泡（只有机器人头像，没有文本内容）。原因是 LLM 输出含纯 thinking 内容，写入 history 后 `extractTextCached` 剥除标签只剩空字符串，但仍作为 assistant 消息被渲染。

**修复方案**：在 `buildChatItems` 的历史消息遍历中，新增 `shouldSkipEmptyAssistantMessage` 判断，精准跳过"内容为纯 thinking"的 assistant 消息。

**关键实现**（`views/chat.ts`）：

**L735-791** `hasRenderableNonTextBlocks` — 保护垫逻辑，若消息含 tool_call / file / image 任一类型，不跳过：
```typescript
function hasRenderableNonTextBlocks(message: unknown): boolean {
  // toolcall / tool_use / tool_result / file / image / image_url → return true（不跳过）
  // 普通 text 块 → return false（走后续可见文本检查）
}
```

**L793-802** `shouldSkipEmptyAssistantMessage`：
```typescript
function shouldSkipEmptyAssistantMessage(message: unknown, normalizedRole: string): boolean {
  if (normalizedRole.toLowerCase() !== "assistant") return false;
  if (hasRenderableNonTextBlocks(message)) return false;
  const visibleText = (extractTextCached(message) ?? "").trim();
  return visibleText.length === 0;  // strip 后为空才跳过
}
```

**L1058**：在 `items.push` 前插入 guard：
```typescript
if (shouldSkipEmptyAssistantMessage(msg, normalized.role)) {
  continue;
}
```

**设计原则**：
- 保守跳过：仅对 assistant 生效，tool/user 消息不受影响
- 精确保护：`hasRenderableNonTextBlocks` 确保含图片/文件/工具调用的消息不被误杀
- 流式独立：流式阶段（`props.stream`）走 `stripThinkingTags` + reading indicator，不受此改动影响

---

### Bug1 + Bug2（2026-04-30，chat.ts / chat.py）

**Bug1**：库存查询结果出现异常字符"1" — `on_tool_calls_ready` 时清零 accumulated

**Bug2**：消息闪烁与重建 — `state=final` 时先 push 消息再清 stream

**状态**：已验证，代码中已实现。

---

## 恢复方法

| 层级 | 恢复操作 |
|------|----------|
| Claude Code 原生 thinking | `src/components/Message.tsx` L449-451 改回原版本 |
| reasoning-tags 过滤 | `reasoning-tags.ts` 移除 `startsWithPlanBlock` / `startsWithReasoningPrefix` 分支 |
| 流式预过滤 | `views/chat.ts` 将 `visibleStream` 判断改回 `props.stream.trim()` |
| 空白气泡修复 | `views/chat.ts` 移除 L1058 `shouldSkipEmptyAssistantMessage` guard |