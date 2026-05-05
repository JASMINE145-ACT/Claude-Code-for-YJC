---
name: feedback_frontend_no_summaries
description: User wants terse responses with no trailing summaries, reads diffs themselves
type: feedback
---

## 用户偏好：简洁回答，不做总结

**Rule:** 用户看完代码变更后，不要在回复末尾再做"总结"。用户说："stop summarizing what you just did at the end of every response, I can read the diff"

**Why:** 用户自己有 Git 视角，能读懂 diff，不需要我重复转述。

**How to apply:** 每条回复直接说结论或下一步，不要加"已完成 X"、"变更包括 Y"等摘要句。

---

## Workflow 执行规范（强制）

**Rule:** 每个 bug fix / feature 必须严格按以下顺序执行：

```
Plan → Red Test → Implement → Code Review → Green Test
```

关键检查点：
- **Red Test 后**：停，等用户确认测试 FAIL（bug 存在）
- **Implement 后**：停，dispatch `superpowers-code-review` 做代码审查
- **Green Test 前**：确保所有 review 通过，再跑测试

**Why:** 之前跳过 Code Review 直接 implement + green test，用户要求强制这个流程以保证代码质量。

**How to apply:** 每个任务完成 Implement 步骤后，必须：
1. 调用 `superpowers-code-review` 审查代码
2. 收到 approved 后才执行 Green Test
3. 禁止跳过 Code Review 直接进入下一阶段
