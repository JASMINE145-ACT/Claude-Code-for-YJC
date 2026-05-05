---
name: trellis-update-hint
description: 代码修改后主动询问是否更新 trellis
type: feedback
---

**规则**：每次完成代码修改后，主动询问用户"是否更新 trellis？"（y/n），根据回答决定是否记录变更。

**Why**: trellis 文档容易与代码不同步，需要用户确认后才更新，避免不必要的文档刷新。

**How to apply**: 在每次 Edit/Write 完成后的回复末尾加上简短询问"是否更新 trellis？(y/n)"
