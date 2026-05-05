---
name: project_claude_code_workflow
description: Workflow 系统实现原理和 superpowers skill 文件位置
type: project
---

# Claude Code CLI 项目（2026-05-01）

## Workflow 系统实现原理

Workflow 是基于 SKILL 系统的 YAML 格式定义，本质是**元技能**（组合已有 Skills）。

**文件位置**：`.claude/workflows/*.yml`（支持 `.yml` / `.yaml` / `.md`）

**WorkflowStep 类型**（`src/types/command.ts`）:
```typescript
export type WorkflowStepResult = { [outcome: string]: string | undefined }
export type WorkflowStep = {
  name: string
  description?: string
  skill?: string
  confirmRequired?: boolean    // 步骤级确认控制
  onResult?: WorkflowStepResult // 条件跳转表
}
// PromptCommand 新增 workflowConfirmRequired?: boolean（顶级默认）
```

**示例**（`impl-and-verify.yml`）：
```yaml
name: impl-and-verify
description: TDD-first workflow
confirmRequired: false        # 全局：不需要确认

steps:
  - name: Plan
    confirmRequired: true      # 只有 Plan 需要确认
    skill: superpowers-writing-plans
  - name: Red Test
    skill: superpowers-tdd
  - name: Implement
  - name: Code Review
    skill: superpowers-code-review
    onResult:
      needs_changes: Implement   # 匹配关键字 → 跳回 Implement
      approved: Green Test
  - name: Green Test
    skill: superpowers-tdd
    onResult:
      failed: Implement
      passed: COMPLETE            # 匹配 → workflow 结束
```

**执行流程**：
1. `getWorkflowCommands()` 扫描 workflows 目录，构建 `Command`（`type: 'prompt'`）
2. 每个文件注册为 slash command（`/impl-and-verify`）
3. `processPromptSlashCommand` 读取 YAML 内容
4. `skill:` 字段通过 `SkillTool` 调用对应的 bundled skill
5. skill 输出文本通过 `onResult` 关键字匹配决定是否跳转

**关键文件**：
- `packages/builtin-tools/src/tools/WorkflowTool/createWorkflowCommand.ts` — 扫描 + 构建 Command，解析 YAML steps
- `src/commands/workflows/index.ts` — `/workflows` 命令
- `packages/builtin-tools/src/tools/WorkflowTool/WorkflowTool.ts` — Tool 定义
- `src/utils/processUserInput/processSlashCommand.tsx` — slash command 处理，fork 执行
- `packages/builtin-tools/src/tools/SkillTool/SkillTool.ts` — Skill 调用
- `src/types/command.ts` — `WorkflowStep` 类型定义

## WorkflowProgress 组件（5 阶段对勾 UI）

**文件**：`src/components/WorkflowProgress.tsx`

当 LLM 执行 workflow fork 时：
1. 渲染带 spinner/tick 的 5 步进度列表（`◐` = 当前，`✓` = 完成，`○` = 待处理）
2. 通过 `SkillTool.call()` 的 progress callback 跟踪 skill 调用
3. 每当 LLM 调用 SkillTool（skill 匹配 steps 中的 skill），对应 step 变 spinner
4. skill 执行完毕后打勾
5. 无 skill 的 "Implement" 步在下一个 skill 被调用时自动完成

**改动**：
- `src/types/command.ts` — 新增 `WorkflowStep` 类型 + `PromptCommand.workflowSteps`
- `packages/.../WorkflowTool/createWorkflowCommand.ts` — 解析 YAML steps，添加 `context: 'fork'`
- `src/utils/processUserInput/processSlashCommand.tsx` — fork 执行时展示 WorkflowProgress

---

## 示例 Workflows（`.claude/workflows/`）

### impl-and-verify.yml
5 步 TDD-first：Plan → Red Test → Implement → Code Review → Green Test
- Plan: `confirmRequired: true`，其余 `false`
- Code Review `onResult`: `needs_changes → Implement`，`approved → Green Test`
- Green Test `onResult`: `failed → Implement`，`passed → COMPLETE`

### quick-fix.yml
3 步快速修复：Reproduce → Fix → Verify
- 无确认门控，线性流程
- Verify `onResult`: `failed → Fix`，`passed → COMPLETE`

### full-review.yml
4 步完整审查：Plan → Code Review → Implement → Security Scan
- Plan + Code Review + Security Scan: `confirmRequired: true`
- Code Review `onResult`: `needs_changes → Implement`，`passed → Security Scan`
- Security Scan `onResult`: `issues_found → Implement`，`clean → COMPLETE`

---

## Superpowers Skills 位置

**路径**：`D:\Projects\claude-code\.claude\skills\superpowers-*`

| Skill | 文件 | 用途 |
|-------|------|------|
| `superpowers-tdd` | `superpowers-tdd/` | Red Test → Green Test 循环 |
| `superpowers-writing-plans` | `superpowers-writing-plans/` | Plan 阶段 |
| `superpowers-code-review` | `superpowers-code-review/` | Code Review |
| `superpowers-subagent-driven-development` | `subagent-driven-development/` | subagent 调度 |
| `superpowers-systematic-debugging` | `systematic-debugging/` | 根因分析 |
| `superpowers-brainstorming` | `brainstorming/` | 设计阶段 |

---

## Claude Code 项目结构要点

- **入口**：`src/entrypoints/cli.tsx` — 快速路径分支（`--version` / `--dump-system-prompt` / `remote-control` 等）
- **Dev mode**：`bun run dev` 通过 `scripts/dev.ts` 注入 `MACRO.*` defines
- **Build**：输出 `dist/cli.js` + chunk files，构建后自动替换 `import.meta.require`
- **Feature flags**：`feature('FLAG_NAME')` 从 `bun:bundle` 导入，dev 全开，build 默认 19 个
- **包**：`packages/@ant/ink/`（不是 `src/ink/`）
- **MACRO defines**：集中在 `scripts/defines.ts`