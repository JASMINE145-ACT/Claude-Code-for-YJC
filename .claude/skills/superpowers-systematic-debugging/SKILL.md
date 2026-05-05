---
name: superpowers-systematic-debugging
description: Use when debugging — find root cause before attempting any fix. Four phases: investigate, analyze, hypothesize, implement. NO FIXES WITHOUT ROOT CAUSE.
---

# Systematic Debugging Overview

This methodology enforces finding the root cause before attempting any fixes, organized into four mandatory phases.

**The Iron Law:** "NO FIXES WITHOUT ROOT CAUSE INVESTIGATION FIRST"

**The Four Phases:**
1. **Root Cause Investigation** — Read errors, reproduce consistently, check recent changes, gather evidence across component boundaries
2. **Pattern Analysis** — Find working examples, compare against references, identify differences
3. **Hypothesis and Testing** — Form one clear theory, test minimally, verify before continuing
4. **Implementation** — Create failing test case first, implement single fix, verify it works

**Key Constraints:**
- Don't skip phases even when under time pressure
- If 3+ fixes have failed, stop and question the architecture
- One variable at a time when testing
- Always create a failing test before fixing (use `superpowers:test-driven-development` skill)

**Supporting techniques:**
- `root-cause-tracing.md` — tracing techniques
- `defense-in-depth.md` — layered defense analysis
- `condition-based-waiting.md` — timing/condition handling