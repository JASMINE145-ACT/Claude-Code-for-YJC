# Workflow 系统文档

## 概述

Workflow 是一种声明式多步骤工作流，运行在 Claude Code 的子 Agent（fork）环境中，带有实时进度 UI 支持。

- **触发方式**：`/workflow-name` 或 `/impl-and-verify`
- **执行模式**：`context: fork`（独立子 Agent，隔离 token 预算）
- **UI**：终端显示 `WorkflowProgress` 组件，带旋转动画和步骤完成状态

---

## Workflow YAML 结构

```yaml
name: <workflow-name>              # 唯一名称，也是 slash command 名称
description: <描述>                 # 在 autocomplete 中显示
confirmRequired: <boolean>          # 全局默认：所有步骤是否需要用户确认

steps:
  - name: <步骤名称>                # 必填，UI 中显示
    description: <描述>             # 可选
    skill: <skill-name>             # 可选；设为 SkillTool 调用时自动推进步骤
    confirmRequired: <boolean>      # 覆盖全局 confirmRequired（可选）
    onResult:                       # 技能步骤完成后根据输出关键词跳转
      <keyword>: <目标步骤名|COMPLETE>  # 不区分大小写匹配
```

### 顶层字段

| 字段 | 类型 | 说明 |
|------|------|------|
| `name` | string | Workflow 唯一名称，同时也是 `/name` slash command |
| `description` | string | 描述，用于 autocomplete 显示 |
| `confirmRequired` | boolean | 全局默认值；可被单步骤的 `confirmRequired` 覆盖 |

### 步骤字段

| 字段 | 类型 | 说明 |
|------|------|------|
| `name` | string | **必填**。步骤名称，用于 `onResult` 跳转目标 |
| `description` | string | 步骤描述 |
| `skill` | string | Skill 名称；调用 `SkillTool` 时自动推进该步骤 |
| `confirmRequired` | boolean | 覆盖全局默认值；设为 `true` 则该步骤执行前等待用户确认 |
| `onResult` | object | 技能步骤的结果跳转表 |

### `onResult` 跳转规则

- **key**（关键词）：不区分大小写；在 Skill 输出文本中包含该词即触发跳转
- **value**（目标）：
  - 另一个步骤的 `name` → 跳转到该步骤，重新执行
  - `COMPLETE`（大写）→ 立即结束 workflow
- 用途示例：`needs_changes: Implement`（审查让修改）、`failed: Fix`（测试失败重做）

---

## CLI 前端修改详情

### 类型定义 (`src/types/command.ts`)

```typescript
// 新增类型
export type WorkflowStepResult = {
  [outcome: string]: string | undefined
}

// WorkflowStep 新增字段
export type WorkflowStep = {
  name: string
  description?: string
  skill?: string
  confirmRequired?: boolean    // 新增
  onResult?: WorkflowStepResult // 新增
}

// PromptCommand 新增字段
export type PromptCommand = {
  // ...
  workflowSteps?: WorkflowStep[]
  workflowConfirmRequired?: boolean // 新增：顶层 confirmRequired 默认值
  // ...
}
```

### YAML 解析 (`createWorkflowCommand.ts`)

- `parseWorkflowSteps()` 新增提取 `confirmRequired`（顶层 + 每步）和 `onResult`
- 返回类型从 `WorkflowStep[] | undefined` 变为 `{ steps: WorkflowStep[], workflowConfirmRequired?: boolean } | undefined`
- 顶层 `confirmRequired` 通过 `as unknown as { confirmRequired?: boolean }` 安全访问

### 执行逻辑 (`processSlashCommand.tsx`)

`executeForkedSlashCommand` 中新增 **workflow 状态机**：

```typescript
type WorkflowState =
  | { phase: 'idle' }              // 空闲，等待下一步
  | { phase: 'skill_active'; skillStepIndex: number }  // 技能执行中
  | { phase: 'confirm_wait' }     // 等待用户确认
  | { phase: 'done' }              // 结束
```

**confirmRequired 门控**：
1. `stepNeedsConfirm(stepIndex)` — 检查 `step.confirmRequired === true` 或 `workflowConfirmRequired === true`
2. 满足条件时，注入 `buildConfirmMessage(stepName)` 用户消息调用 `runAgent`
3. 监听用户回复：含 `"abort"` → 中止；含 `"confirm"/"y"` → 继续执行

**onResult 循环**：
1. `isSkillToolResult(msg)` — 检测 Skill 工具的 `tool_result` 返回
2. Skill 完成后，调用 `extractResultText(allAgentMessages)` 提取输出文本
3. 按 `onResult` 表逐一匹配关键词（不区分大小写）：
   - 匹配到 `COMPLETE` → `workflowState = { phase: 'done' }` 退出
   - 匹配到步骤名 → `buildStepRedirectMessage(targetStep)` 注入跳转消息，重新进入循环

**关键辅助函数**：

| 函数 | 位置 | 作用 |
|------|------|------|
| `buildConfirmMessage(stepName)` | processSlashCommand.tsx | 生成确认请求用户消息 |
| `buildStepRedirectMessage(targetStepName)` | processSlashCommand.tsx | 生成跳转指令用户消息 |
| `isSkillToolResult(msg)` | processSlashCommand.tsx | 检测 tool_result 是否来自 SkillTool |
| `stepNeedsConfirm(stepIndex)` | processSlashCommand.tsx | 解析步骤确认需求 |
| `findStepIndexByName(name)` | processSlashCommand.tsx | 按名称查找步骤索引 |

---

## Workflow 执行流程图

```
用户调用 /workflow-name
  → executeForkedSlashCommand (fork 模式)
    → WorkflowProgress UI 显示步骤列表
    ↓
while (currentStep < steps.length) {
  ┌─ confirmRequired 检查 ─────────────────────┐
  │ stepNeedsConfirm(currentStep)?               │
  │   → 注入确认消息 → runAgent → 用户回复       │
  │   → 含 "abort" → resultText = "aborted" → break│
  │   → 含 "confirm"/"y" → 继续                 │
  └────────────────────────────────────────────┘
  │
  ├─ 技能步骤 (skill 字段)：
  │   runAgent → 观察 SkillTool tool_use → 推进步骤
  │   观察 SkillTool tool_result → 评估 onResult
  │     → 关键词匹配 → 跳转或 COMPLETE
  │
  └─ 手动步骤（无 skill）：
      runAgent → 自然结束 → 继续下一步
}
→ WorkflowProgress 显示全部完成
→ extractResultText → 返回 <local-command-stdout>
```

---

## 示例 Workflows

### impl-and-verify.yml（推荐工作流）

```yaml
name: impl-and-verify
description: TDD-first workflow: plan → red test → implement → review → green test
confirmRequired: false   # 默认不需要确认

steps:
  - name: Plan
    confirmRequired: true  # Plan 需要用户确认后再继续
    skill: superpowers-writing-plans

  - name: Red Test
    skill: superpowers-tdd  # 写失败的测试

  - name: Implement
    # 手动步骤，Claude 直接实现代码

  - name: Code Review
    skill: superpowers-code-review
    onResult:
      needs_changes: Implement  # 需要修改 → 回到 Implement
      approved: Green Test     # 通过 → 跳到 Green Test

  - name: Green Test
    skill: superpowers-tdd
    onResult:
      failed: Implement   # 测试失败 → 回到 Implement
      passed: COMPLETE    # 测试通过 → 结束
```

### quick-fix.yml（快速修复）

```yaml
name: quick-fix
description: Quick bug fix: reproduce → fix → verify
confirmRequired: false

steps:
  - name: Reproduce
    # 写一个失败的测试来复现 bug

  - name: Fix
    # 实现修复

  - name: Verify
    skill: superpowers-tdd
    onResult:
      failed: Fix     # 失败 → 回到 Fix
      passed: COMPLETE  # 通过 → 结束
```

### full-review.yml（完整审查流程）

```yaml
name: full-review
description: Full review workflow with manual verification gates
confirmRequired: false

steps:
  - name: Plan
    confirmRequired: true
    skill: superpowers-writing-plans

  - name: Code Review
    confirmRequired: true    # 审查需要确认
    skill: superpowers-code-review
    onResult:
      needs_changes: Implement
      passed: Security Scan

  - name: Implement
    # 修正问题

  - name: Security Scan
    confirmRequired: true
    skill: superpowers-code-review
    onResult:
      issues_found: Implement  # 发现问题 → 回到 Implement
      clean: COMPLETE           # 清白 → 结束
```

---

## 调试技巧

- **查看 workflow 列表**：`/workflows`
- **workflow 日志路径**（ANT 用户）：`[ANT-ONLY] API calls: <path>`
- **跳过确认**：在 workflow YAML 中将 `confirmRequired` 设为 `false`
- **强制循环**：在 skill 输出中包含 `onResult` 关键词（如 "needs_changes"）即可触发跳转

---

## 相关文件索引

| 文件 | 职责 |
|------|------|
| `.claude/workflows/*.yml` | Workflow YAML 定义 |
| `src/types/command.ts` | `WorkflowStep`、`PromptCommand` 类型 |
| `packages/builtin-tools/src/tools/WorkflowTool/createWorkflowCommand.ts` | YAML 解析 |
| `src/utils/processUserInput/processSlashCommand.tsx` | 执行引擎（状态机、onResult、confirmRequired） |
| `src/components/WorkflowProgress.tsx` | 终端 UI（步骤进度动画） |
| `src/tasks/LocalWorkflowTask/LocalWorkflowTask.ts` | 后台任务生命周期 |
