# Drag Leave Bug Fix — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the drag-and-drop hint "松开以上传 Excel/PDF" not disappearing after mouse release.

**Architecture:** The drag state is controlled by `composeDragOver` prop. `onComposeDragOver` sets it true, `onComposeDragLeave` sets it false. The bug is that `handleDragLeave` skips calling `onComposeDragLeave` when `relatedTarget === null` (which happens on mouse release).

**Tech Stack:** Lit/web component TS, Vitest

---

## File Map

- **Modify:** `control-ui/src/ui/views/chat.ts` (bug location + drop overlay rendering)
- **Test:** `control-ui/src/ui/views/chat.test.ts` (existing test file)
- **i18n:** `control-ui/src/i18n/locales/zh-CN.ts` (drop hint text — read-only reference)

---

### Task 1: Write failing test

**Files:**
- Test: `control-ui/src/ui/views/chat.test.ts`

- [ ] **Step 1: Add drag-leave test**

In `chat.test.ts`, add a test that verifies drag state clears when mouse is released:

```typescript
it("clears composeDragOver on dragleave with null relatedTarget (mouse release)", () => {
  const onComposeDragOver = vi.fn();
  const onComposeDragLeave = vi.fn();
  const container = document.createElement("div");
  render(
    renderChat(
      createProps({
        composeDragOver: true,
        onComposeDragOver,
        onComposeDragLeave,
      }),
    ),
    container,
  );

  // Simulate dragleave with null relatedTarget (mouse release scenario)
  const section = container.querySelector("section.chat") as HTMLElement;
  const dragLeaveEvent = new DragEvent("dragleave", {
    bubbles: true,
    relatedTarget: null,
  });
  Object.defineProperty(dragLeaveEvent, "currentTarget", { value: section });

  section.dispatchEvent(dragLeaveEvent);

  expect(onComposeDragLeave).toHaveBeenCalled();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd control-ui && bun run test src/ui/views/chat.test.ts --grep "clears composeDragOver" -v`
Expected: FAIL — `onComposeDragLeave` was not called

---

### Task 2: Fix handleDragLeave

**Files:**
- Modify: `control-ui/src/ui/views/chat.ts:474-480`

- [ ] **Step 3: Remove the null-guard that blocks dragLeave on mouse release**

Replace L474-480:

```typescript
// BEFORE (buggy):
const handleDragLeave = (e: DragEvent) => {
  const el = e.currentTarget as HTMLElement;
  const next = e.relatedTarget as Node | null;
  if (next == null) return;           // ← BUG: blocks mouse-release case
  if (el.contains(next)) return;
  props.onComposeDragLeave?.();
};

// AFTER (fixed):
const handleDragLeave = (e: DragEvent) => {
  const el = e.currentTarget as HTMLElement;
  const next = e.relatedTarget as Node | null;
  // Only skip if relatedTarget is inside the current element (drag moved within)
  if (next != null && el.contains(next)) return;
  props.onComposeDragLeave?.();
};
```

**Explanation:**
- `relatedTarget === null` now proceeds to call `onComposeDragLeave` — fixes mouse release
- `relatedTarget !== null && el.contains(next)` still prevents false leave when dragging within children
- When user drops a file, `handleDrop` already calls `onComposeDragLeave` (L484), so drop is unaffected

- [ ] **Step 4: Run test to verify it passes**

Run: `cd control-ui && bun run test src/ui/views/chat.test.ts --grep "clears composeDragOver" -v`
Expected: PASS

- [ ] **Step 5: Run full chat test suite**

Run: `cd control-ui && bun run test src/ui/views/chat.test.ts -v`
Expected: all PASS (no regression)

---

### Task 3: Verify edge cases manually

- [ ] **Step 6: Verify no regression on drag-enter then drag-leave within element**

Confirm existing drag behavior still works — when dragging within the same element, `onComposeDragLeave` should NOT fire spuriously. The existing `el.contains(next)` check handles this.

---

## Summary

| Step | Action | Expected |
|------|--------|----------|
| 1 | Write failing test | FAIL (dragLeave not called on release) |
| 2 | Run test | FAIL confirmed |
| 3 | Fix handleDragLeave | Code changed |
| 4 | Run test | PASS |
| 5 | Full suite | all PASS |
