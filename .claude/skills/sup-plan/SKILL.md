---
description: Restate requirements, assess risks, and create step-by-step implementation plan. WAIT for user CONFIRM before touching any code.
---

# Plan Command

This command invokes the **planner** agent to create a comprehensive implementation plan before writing any code.

## What This Command Does

1. **Restate Requirements** - Clarify what needs to be built
2. **Identify Risks** - Surface potential issues and blockers
3. **Create Step Plan** - Break down implementation into phases
4. **Wait for Confirmation** - MUST receive user approval before proceeding

## When to Use

Use `/plan` when:
- Starting a new feature
- Making significant architectural changes
- Working on complex refactoring
- Multiple files/components will be affected
- Requirements are unclear or ambiguous

## How It Works

The planner agent will:

1. **Analyze the request** and restate requirements in clear terms
2. **Break down into phases** with specific, actionable steps
3. **Identify dependencies** between components
4. **Assess risks** and potential blockers
5. **Estimate complexity** (High/Medium/Low)
6. **Present the plan** and WAIT for your explicit confirmation

## Output: plan.md

After planning is confirmed, the agent MUST generate a `plan.md` file in the **target project's root directory** (the project being modified).

### plan.md Structure

```markdown
# Plan: [Title]

## Background

## Priority Matrix

| 阶段 | 特性 | 优先级 | 依赖关系 | 风险等级 |
|------|------|--------|----------|----------|

## Implementation Phases

### Phase 1: [Name]
### Phase 2: [Name]
...

## Implementation Order & Dependency Diagram

## Risk Summary

## Key Files List

## Confirmation Checklist
```

### Generation Rules

- **File path**: `{targetProject}/plan.md` (e.g., `D:/Projects/my-app/plan.md`)
- **Always generate** after user confirms "yes/proceed"
- **Overwrite existing** if plan.md already exists (user has confirmed)
- **Markdown format** required, use tables for clarity
- Do NOT output code during planning phase — code only after plan confirmed

## Integration with Other Commands

After planning:
- Use `/tdd` to implement with test-driven development
- Use `/build-fix` if build errors occur
- Use `/code-review` to review completed implementation

## Related Agents

This command invokes the `planner` agent provided by ECC.

For manual installs, the source file lives at:
`agents/planner.md`
