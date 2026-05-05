---
name: feedback_tdd_workflow
description: TDD workflow modification: Red Test first, Green Test at end
type: feedback
---

## 5 步 TDD 工作流（已更新到 impl-and-verify.yml）

**规则**: Bug fix 和核心逻辑改动时，Test 必须前置（Red Test），而不是放在最后作为收尾验收。

**Why:** GPT 指出原流程（Plan → Implement → Code Review → Test）里 Test 只是"确认代码 work"的收尾，没有真正定义目标行为。正确的 TDD 是先写测试捕获 expected behavior（Red = FAIL），再写代码让测试通过（Green = PASS）。

**原流程**（错误）：
```
Plan → Implement → Code Review → Test
```

**新流程**（正确）：
```
Plan → Red Test → Implement → Code Review → Green Test
```

| 步骤 | 含义 |
|------|------|
| Red Test | 先写测试定义 expected behavior，验证它 FAIL |
| Implement | 写/改代码让测试 PASS |
| Code Review | 审查实现 |
| Green Test | 确认红→绿通过 + 回归检查 |

**How to apply:** 未来所有 bug fix 和核心逻辑改动，按新流程走。先分析 bug 根因、写测试捕获目标行为（确认 Red），再动手改代码。

---

## Workflow confirmRequired 和 onResult 行为规则

**规则**: workflow YAML 中的 `confirmRequired` 和 `onResult` 字段控制执行流程。只有 Plan 步骤需要用户确认，其他步骤直接执行。

**Why:** 用户明确要求只有 Plan 生成之后需要确认，其余步骤直接执行。同时 Code Review 和 Green Test 需要循环（review 发现问题 → 回 Implement，test 失败 → 回 Implement），通过 `onResult` 关键字匹配实现。

**YAML 字段**:
- `confirmRequired: false`（顶级）— 全局默认：不需要确认
- `confirmRequired: true`（步骤级）— 覆盖全局，只有该步骤需要确认
- `onResult:` — 技能输出关键字匹配，决定下一步跳转目标
  - `needs_changes: Implement` — 匹配时跳回 Implement
  - `approved: Green Test` — 匹配时前进到 Green Test
  - `failed: Implement` — 匹配时跳回 Implement
  - `passed: COMPLETE` — 匹配时 workflow 结束

**当前 impl-and-verify.yml 行为**:
- Plan: `confirmRequired: true` → 等用户确认
- Red Test / Implement / Code Review / Green Test: 直接执行
- Code Review 输出含 `needs_changes` → 循环回 Implement
- Green Test 输出含 `failed` → 循环回 Implement
- Green Test 输出含 `passed` → workflow 完成

**How to apply:** 创建新 workflow 时，默认 `confirmRequired: false`，只在真正需要人工确认的步骤设置 `true`。`onResult` 关键字必须与对应 skill 的输出文本精确匹配。

---

## PowerShell 执行规范（agent-jk 项目测试）

**规则**: agent-jk 项目路径含空格（`Agent Team version3`），PowerShell 中使用 `-LiteralPath` 和 `Set-Location`，避免 cmd/bash 混用。

**Why:** 测试命令 `npx vitest run ...` 在含空格路径下，cmd 和 WSL bash 均无法正确解析。PowerShell 是唯一稳定方案。

**正确的测试命令**:
```powershell
Set-Location -LiteralPath 'D:\Projects\agent-jk\Agent Team version3\control-ui'
npx vitest run src/ui/views/chat.test.ts -t 'test-name' -v --browser.enabled=false --environment jsdom
```

**注意**: `--grep` 在 vitest 4 中已移除，改用 `-t`（test name pattern）。

**How to apply:** 在 agent-jk 项目跑测试时，用 PowerShell + 上述命令格式，不要混用 cmd 或普通 bash。

---

## Red / Green 概念解释

**规则**: Red = 测试失败（代码还没动），Green = 测试通过（代码已改好）。

**Why:** 测试框架约定：失败显示红色，通过显示绿色。TDD 圈子直接用这两个颜色代指状态。

**How to apply:**
- 看到 "Red Test" → 测试应该 FAIL，说明测试定义了目标但代码还没动
- 看到 "Green Test" → 测试应该 PASS，说明代码已经能让测试通过
- 两者都不能跳过：Red 确认测试有效，Green 确认修复成功
