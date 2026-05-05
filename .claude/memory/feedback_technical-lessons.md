---
name: technical lessons from PN-MPa and Excel-Neon upload
description: Key technical decisions and failure patterns from 2026-04-23 implementations
type: feedback
---

## PN→MPa 双向扩展：字段匹配层优于 LLM 兜底

**规则**: PN↔MPa 转换应该在 `wanding_fuzzy_matcher.py` 的 `_apply_pressure_expansion()` 做，不只靠 LLM 提示词兜底。

**Why:** 用户明确说"应该在字段匹配层做，不该只靠 LLM 提示词兜底"。LLM 选型是最后一层，有随机性；字段匹配层命中才能保证召回率。

**How to apply:** 未来如果需要规格标准化（尺寸/压力/材质等），优先考虑在 `wanding_fuzzy_matcher.py` 的 `match_fuzzy_candidates()` 或 `match_fuzzy()` 里做扩展，而不是加到 `_BUSINESS_KNOWLEDGE` 内嵌常量或 LLM 提示里。

---

## PN→MPa 双向扩展实现要点

1. **浮点格式化必须做**：`f"{value:.2f}".rstrip('0').rstrip('.')` — 防止 `1.2500000000002`
2. **负前瞻替代 `\b`**：`(\d+(?:\.\d+)?)\s*MPA(?![\da-zA-Z])` — 因为 `\b` 在汉字后不匹配（如 `1.6MPa热水管`）
3. **预扫描去重**：先扫描已存在的 PN/MPa 值，再决定是否追加等价形式，避免 `PN12.5 1.25MPa PN12.5 1.25MPa PN12.5`
4. **`None` 输入保护**：`if not (keywords or "").strip(): return ""`

---

## Excel→Neon COPY 上传教训

**规则**: COPY 时 `FORMAT TEXT` 而非 `FORMAT CSV`，`DELIMITER E'\\t'`，`NULL ''` 显式声明。

**Why:** `FORMAT CSV` 对 tab 分隔符和空值的处理行为与预期不符；空串不会自动变 NULL。实际测试发现 `FORMAT TEXT` 可以正确处理。

**How to apply:** 未来用 `psycopg2.copy_expert()` 做批量导入时，统一用：
```python
copy_sql = "COPY {tbl} ({cols}) FROM STDIN WITH (FORMAT TEXT, DELIMITER E'\\t', NULL '')"
```

---

## Excel 列→Neon 列映射用位置索引

**规则**: 用 0-based 列索引位置映射，不依赖列名字符串匹配（中文列名在 psycopg2 显示为乱码）。

**Why:** `information_schema.columns` 返回的中文列名在 Python 输出显示为乱码，但实际表结构正常。直接用 `EXCEL_INDEX_TO_NEON_COL = {0: "NO", 1: "Material", ...}` 位置映射最可靠。

**How to apply:** Excel 第 20 列为 null 必须映射到 Neon `col_20`（占位不错位）。跳过会导致后续列全部错位 1 位。

---

## 时区敏感的日期计算必须显式指定时区

**规则**: `datetime.now()` 必须指定 `tzinfo`，不能依赖服务器本地时区。与 APScheduler `CronTrigger(timezone='...')` 配合使用时尤其要注意。

**Why:** `resolve_week_range()` 使用 `datetime.now()`（无时区），当服务器时区与 APScheduler timezone 不一致时，周边界计算会差一天。实际场景：Render 容器 UTC 时间 01:xx 时执行 cron（上海 09:xx），但 `datetime.now()` 用 UTC 计算出错。

**How to apply:** 日期时间计算涉及调度/报告时，统一用 `datetime.now(timezone(timedelta(hours=8)))`（UTC+8）或显式 `ZoneInfo("Asia/Shanghai")`，不要用 naive datetime。

**规则**: 上传时遇到类型不匹配的行（如 Material 含字符串代码）应该跳过并记录数量，不中断整个流程。

**Why:** 19 行 Material 非数字是数据质量问题，不是上传脚本的问题。中断会导致已处理的 4969 行也丢失。

**How to apply:** 在批量导入时加 `try: float(val)` 过滤，统计 skipped 数量，最终报告时输出。

---

## 用户偏好：精准手术刀式改动，抵制大而全

**规则**: 用户明确偏好精准的、局部的小改动，不接受引入新框架、新状态管理模式或跨模块破坏性改动的大而全方案。

**Why:** 2026-04-24 审查 `library-schema-sync-design.md` 和 `reports-wow-chart-predict.md` 时确认：两个 doc 都是精确手术刀式改动，用户确认"符合前端风格和类型，不是大改"后可直接实施。周报三项增强的实施结果（6轮迭代收口）也证明小步快跑更有效。

**How to apply:** 未来提案前先自问"这是最小改动吗"，避免引入不必要抽象或跨模块耦合。向用户展示方案时，优先说明改动范围和风格一致性，而非功能丰富度。

---

## 探索项目代码库：先确认入口和技术栈

**规则**: 探索项目机制时，优先找到核心入口文件（如 session.py / agent.py），确认实际技术栈，再深入局部模块。

**Why:** 2026-04-28 探索 agent-jk 项目的 memory 上下文机制时，直接深入 `backend/tools/inventory/lib/memory/`（TypeScript 实现），但项目实际是 Python FastAPI，真正的会话上下文在 `backend/agent/session.py`。探索了半天写出的文档完全偏离了项目实际，浪费了工作量。

**How to apply:** 未来探索项目机制时，第一步找入口（如 `session.py`、`agent.py`、`main.py`），确认语言/框架栈，再去局部目录深入。可以通过 `ls backend/` 粗略了解结构，不要看到 `memory` 目录名就径直深入。

---

## 批量 vs 单一查询对比：快速定位问题路径

**规则**: 当同一数据在批量查询和单一查询表现不一致时，优先对比两条路径的实现差异，能快速缩小根因范围。

**Why:** 用户提供了 batch 查询返回"待确认"但 single 查询能查到 114 件库存的反例，直接排除了"产品编码不存在"的可能，指向批量查询路径的静默失败问题。实际定位到 `get_items_by_codes` 并发调用时异常被静默吞噬。

**How to apply:** 遇到 batch 行为异常时：
1. 先找 batch 和 single 的公共调用层（如 `match_price_and_get_inventory`）
2. 再找 batch 专用路径（如 `get_inventory_by_code_batch` / `_execute_match_quotation_batch`）
3. 对比两者在异常处理、默认值、状态标记上的差异
4. 单一查询成功 = 基本查询逻辑正确，问题在批量包装层

---

## 静默失败 + 零值默认值 = 问题难定位

**规则**: 异常被 catch 后只打 debug 日志、同时把结果设为默认值（0.0），会导致调用方无法区分"真零"和"查不到"。

**Why:** `match_and_inventory.py:302-309` 的库存查询逻辑：`except Exception as e: logger.debug(...)` 只打 debug 日志，返回的 `available_qty = 0.0`。调用方看到的是"库存为 0"，无法知道是"真的没库存"还是"查询失败/编码不存在"。

**How to apply:** 涉及外部 API 调用的地方，如果失败和成功返回相同默认值，**必须**在返回值中增加状态字段（`inventory_status` / `query_success` / `found` 等），或者用 `None` 而非 `0` 表示未知。不能只靠日志区分（调用方不读日志）。

---

## 结果表达层结构化优于 LLM 自由发挥（2026-04-30 已实施）

**规则**: 当批量查询 API 返回数据正常，但 LLM 生成表格时丢字段，根因在"结果表达层"约束不够强，需要结构化强制约束。

**Why:** 批量库存查询中，API 实际返回了 8/8 items 全部 found，但 LLM 生成的表格出现"待确认"。用户分析后确认：不是 API 问题，是结果表达层（工具返回给 LLM 的文本）不够结构化，给了 LLM 改写空间。

**已实施方案**（参考 match_quotation SSE push + compact 机制）：

1. **工具层**（`inventory_agent_tools.py`）：
   - 新增 `_build_inventory_single_formatted_response(item, code)` — 单个 Markdown 表格
   - 新增 `_build_inventory_batch_formatted_response(items_with_status)` — 批量 Markdown 表格（逐编号强约束）
   - `_execute_get_inventory_by_code` 返回结构化 JSON 含 `formatted_response` + `compact` + `data`
   - `_execute_get_inventory_by_code_batch` 同上，并调用 `push_event("tool_render", ...)` 推送 SSE

2. **拦截层**（`extension.py`）：
   - 新增 `_handle_inventory_single_obs` — 解析双层 JSON（外层 wrapper + 内层 result），推送 SSE，返回 compact
   - 新增 `_handle_inventory_batch_obs` — 同上，从 `data.stats` 提取统计信息
   - `on_after_tool` 新增 `get_inventory_by_code` / `get_inventory_by_code_batch` 分支

3. **Compact 格式**：
   - 单个：`[已渲染到前端] 物料编号 {code} 库存：{qty}，可售：{av}。`
   - 批量：`[已渲染到前端] 批量库存查询 {n} 个编号：found={found}, not_found={not_found}。库存数据已渲染到前端卡片，禁止重复描述表格内容。`

**How to apply:** 涉及批量数据展示的工具，除了返回原始数据，还应生成强约束 Markdown 表格 + 推送 `tool_render` SSE + 返回带 `[已渲染到前端]` 标记的紧凑摘要。

---

## Skill Defer 的第一轮决策风险

**规则**: 按需加载（deferred skill）架构中，LLM 第一轮决策时看不见完整技能约束，可能做出需要完整知识才能做出的判断，导致工具调错或轮次增加。

**Why:** Skill Defer 把完整技能文档从 system prompt 移到工具执行后的追加。如果 LLM 在第一轮就做出了依赖约束的决策（如"禁止泛化词"），工具执行后 skill 才追加，第二轮才发现第一轮调错 → 本可一轮完成的对话变成两轮。

**How to apply:** 评估 Skill Defer 是否值得时，重点看：工具内部是否能容忍模糊参数（如果工具层能做品类澄清，第一轮调错也无妨），以及实际场景中需要约束的决策占比多少。如果工具层足够健壮，这个风险可以忽略。

---

## Bug 修复根因分析模式（2026-04-30）

**规则**: 流式交互 bug 的根因往往在前端状态机时序，而非渲染层本身。修复时应优先调整状态切换顺序，而非在渲染层打补丁。

**Why:** Bug2（闪烁与重建）根因是 `state=final` 时先清 stream 再 push 消息，时间差导致空白。修复方案是调换操作顺序（先 push 再清），而不是加延迟或加遮罩。

**How to apply:** 遇到流式/状态相关的 UI bug，先找状态切换的处理函数（如 `handleChatEvent`），检查操作顺序是否有时间差，再看渲染层能否弥补。

---

## Bug1根因验证：callback 时机清零是正确方案

**规则**: `on_tool_calls_ready` 是清除跨步骤累积中间文本的正确时机——LLM 决定调用工具之前的 token 都是中间推理，不是最终回复。

**Why:** 用户提供的修复方案（`on_tool_calls_ready` 时清零 accumulated）经过 codex 分析确认是正确的。某些模型（如 GLM）会在调用工具前先输出"1"或序号，这是模型采样行为，不是错误——在工具调用决策点清零 accumulated 可以干净地剥离这部分中间文本，同时不影响最终答案（`result["answer"]` 取的是最后一 step 的干净答案）。

**How to apply:** 未来遇到类似的"流式输出包含最终答案之外的噪声 token"问题时，优先考虑在语义清晰的时机（如 tool_call 决策点）做清理，而不是在后端聚合层面打补丁。