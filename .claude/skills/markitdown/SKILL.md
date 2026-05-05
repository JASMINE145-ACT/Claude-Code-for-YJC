---
name: markitdown
description: "将 PDF / CSV / Excel 文件转换为 Markdown 格式，支持大文件分批读取与分析，支持落库（SQLite / PostgreSQL）。触发于用户说「PDF 转 Markdown」「转换 CSV」「转换 Excel」「把 PDF 变成 Markdown」「落库」「导入数据库」等场景。"
---

# 文件转 Markdown + 落库（MarkItDown）

## 触发条件

- 用户提到"PDF 转 Markdown"、"转换 CSV"、"转换 Excel"
- 用户提供文件路径（.pdf / .csv / .xlsx / .xls），要求转换或落库
- 用户说"用 markitdown"、"大文件分批处理"、"导入数据库"、"落库"

---

## 环境变量（可选）

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `GLM_VISION_MODEL` | `glm-4.6v` | 扫描件 PDF 备选模型 |
| `GLM_VISION_API_KEY` | — | GLM-4V API Key |
| `GLM_VISION_BASE_URL` | `https://open.bigmodel.cn/api/paas/v4` | API 地址 |
| `DATABASE_URL` | — | 落库目标，格式 `sqlite:///path.db` 或 `postgresql://...` |

---

## 安装依赖

```bash
pip install markitdown pandas openpyxl pymupdf httpx sqlalchemy psycopg2-binary tabulate
```

---

## 核心原则

| 文件类型 | 大文件判断 | 分批策略 |
|----------|------------|---------|
| PDF | > 20 页 | 每批 10 页（可配置），逐批提取 + 逐批写文件 |
| Excel | 单 Sheet > 1000 行 | 每批 500 行，逐批追加 |
| CSV | > 1000 行 | 每批 500 行，用 `chunksize` 流式读取 |

**落库默认目标**：`DATABASE_URL` 环境变量指定的数据库；未配置时用同目录下 `output.db`（SQLite）。

---

## 执行流程

### 阶段 0：识别需求

询问用户（或根据上下文判断）：
- 只要 Markdown 文件？
- 只要落库？
- 两者都要？

### 阶段 1：依赖检查

```python
def check_deps():
    missing = []
    try: import markitdown
    except ImportError: missing.append("markitdown")
    try: import pandas
    except ImportError: missing.append("pandas")
    try: import openpyxl
    except ImportError: missing.append("openpyxl")
    if missing:
        print(f"缺少依赖，请先运行: pip install {' '.join(missing)}")
        return False
    return True
```

### 阶段 2：PDF 处理（大文件批处理）

```python
import fitz  # PyMuPDF
from pathlib import Path

PDF_BATCH_SIZE = 10  # 每批处理页数，可根据内存调整

def convert_pdf_batched(input_path: str, output_md: str | None = None) -> dict:
    """
    分批提取 PDF 文本，每批写入 .md 文件（追加模式）。
    返回 {output_path, total_pages, batches, char_count}
    """
    input_p = Path(input_path)
    out_path = output_md or str(input_p.parent / f"{input_p.stem}.md")
    Path(out_path).parent.mkdir(parents=True, exist_ok=True)

    doc = fitz.open(input_path)
    total_pages = len(doc)
    total_batches = (total_pages + PDF_BATCH_SIZE - 1) // PDF_BATCH_SIZE
    total_chars = 0

    # 清空或新建输出文件
    Path(out_path).write_text(f"# {input_p.stem}\n\n", encoding="utf-8")

    for batch_idx in range(total_batches):
        start_page = batch_idx * PDF_BATCH_SIZE
        end_page = min(start_page + PDF_BATCH_SIZE, total_pages)
        print(f"  处理第 {batch_idx + 1}/{total_batches} 批（第 {start_page+1}–{end_page} 页）...")

        batch_parts = []
        for page_num in range(start_page, end_page):
            page = doc[page_num]
            text = page.get_text("text").strip()
            if text:
                batch_parts.append(f"### 第 {page_num + 1} 页\n\n{text}")

        if batch_parts:
            chunk = "\n\n".join(batch_parts) + "\n\n"
            with open(out_path, "a", encoding="utf-8") as f:
                f.write(chunk)
            total_chars += len(chunk)

    doc.close()
    return {
        "output_path": out_path,
        "total_pages": total_pages,
        "batches": total_batches,
        "char_count": total_chars,
    }


def convert_pdf_glm_batched(input_path: str, output_md: str | None = None) -> dict:
    """
    扫描件 PDF：每批渲染为图片 → GLM-4V 识别 → 追加写入 .md。
    仅在 MarkItDown 效果极差且配置了 GLM_VISION_API_KEY 时使用。
    """
    import os, base64, httpx
    api_key = os.getenv("GLM_VISION_API_KEY")
    if not api_key:
        raise RuntimeError("扫描件 PDF 需要配置 GLM_VISION_API_KEY 环境变量")

    model = os.getenv("GLM_VISION_MODEL", "glm-4.6v")
    base_url = os.getenv("GLM_VISION_BASE_URL", "https://open.bigmodel.cn/api/paas/v4")

    input_p = Path(input_path)
    out_path = output_md or str(input_p.parent / f"{input_p.stem}.md")
    Path(out_path).parent.mkdir(parents=True, exist_ok=True)

    doc = fitz.open(input_path)
    total_pages = len(doc)
    total_batches = (total_pages + PDF_BATCH_SIZE - 1) // PDF_BATCH_SIZE

    Path(out_path).write_text(f"# {input_p.stem}（扫描件 OCR）\n\n", encoding="utf-8")

    for batch_idx in range(total_batches):
        start_page = batch_idx * PDF_BATCH_SIZE
        end_page = min(start_page + PDF_BATCH_SIZE, total_pages)
        print(f"  GLM-4V 识别第 {batch_idx + 1}/{total_batches} 批（第 {start_page+1}–{end_page} 页）...")

        batch_parts = []
        for page_num in range(start_page, end_page):
            page = doc[page_num]
            pix = page.get_pixmap(dpi=200)
            img_bytes = pix.tobytes("png")
            encoded = base64.b64encode(img_bytes).decode("utf-8")

            payload = {
                "model": model,
                "messages": [{
                    "role": "user",
                    "content": [
                        {"type": "image_url", "image_url": {"url": f"data:image/png;base64,{encoded}"}},
                        {"type": "text", "text": "请提取这张 PDF 页面中的所有文字，保持原有结构，以 Markdown 格式输出。"},
                    ],
                }],
                "max_tokens": 8192,
            }
            resp = httpx.post(
                f"{base_url}/chat/completions",
                headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
                json=payload,
                timeout=120,
            )
            resp.raise_for_status()
            text = resp.json()["choices"][0]["message"]["content"]
            batch_parts.append(f"### 第 {page_num + 1} 页\n\n{text}")

        if batch_parts:
            with open(out_path, "a", encoding="utf-8") as f:
                f.write("\n\n".join(batch_parts) + "\n\n")

    doc.close()
    return {"output_path": out_path, "total_pages": total_pages, "batches": total_batches}
```

**PDF 转换入口（自动选择策略）**：

```python
def convert_pdf(input_path: str, output_md: str | None = None) -> dict:
    """优先 MarkItDown 文本提取；内容为空时降级为 PyMuPDF 批量提取；仍为空时降级 GLM-4V。"""
    from markitdown import MarkItDown

    # 尝试 MarkItDown
    try:
        converter = MarkItDown(enable_plugins=False)
        result = converter.convert(input_path)
        content = (result.text_content or "").strip()
        if content:
            input_p = Path(input_path)
            out_path = output_md or str(input_p.parent / f"{input_p.stem}.md")
            Path(out_path).parent.mkdir(parents=True, exist_ok=True)
            Path(out_path).write_text(content, encoding="utf-8")
            return {"output_path": out_path, "method": "markitdown", "char_count": len(content)}
    except Exception as e:
        print(f"MarkItDown 转换失败: {e}，降级为 PyMuPDF 批处理")

    # 降级：PyMuPDF 分批
    try:
        result = convert_pdf_batched(input_path, output_md)
        result["method"] = "pymupdf_batch"
        return result
    except Exception as e:
        print(f"PyMuPDF 批处理失败: {e}，尝试 GLM-4V")

    # 最终降级：GLM-4V（仅扫描件）
    result = convert_pdf_glm_batched(input_path, output_md)
    result["method"] = "glm_vision"
    return result
```

---

### 阶段 3：Excel / CSV 处理（大文件分批 + 表头保留）

```python
import pandas as pd
from pathlib import Path

EXCEL_BATCH_SIZE = 500   # 每批行数（不含表头）
CSV_CHUNK_SIZE = 500     # CSV 流式读取每块行数


def _df_to_md_table(df: pd.DataFrame, title: str | None = None) -> str:
    """DataFrame → Markdown 表格字符串（正确保留列名，中文友好）。"""
    lines = []
    if title:
        lines.append(f"## {title}\n")
    # 表头行
    lines.append("| " + " | ".join(str(c) for c in df.columns) + " |")
    lines.append("| " + " | ".join(["---"] * len(df.columns)) + " |")
    # 数据行
    for _, row in df.iterrows():
        cells = []
        for v in row:
            s = str(v) if v is not None and str(v) not in ("nan", "None", "NaT") else ""
            s = s.replace("|", "\\|")  # 转义单元格内的竖线
            cells.append(s)
        lines.append("| " + " | ".join(cells) + " |")
    return "\n".join(lines)


def convert_excel_batched(input_path: str, output_md: str | None = None) -> dict:
    """
    Excel 分批处理：
    - 每个 Sheet 单独处理
    - 单 Sheet > EXCEL_BATCH_SIZE 行时逐批写入（追加模式）
    - 列名使用实际表头（header=0）
    返回 {output_path, sheets, total_rows, batches}
    """
    input_p = Path(input_path)
    out_path = output_md or str(input_p.parent / f"{input_p.stem}.md")
    Path(out_path).parent.mkdir(parents=True, exist_ok=True)
    Path(out_path).write_text(f"# {input_p.stem}\n\n", encoding="utf-8")

    xl = pd.ExcelFile(input_path, engine="openpyxl")
    total_rows = 0
    total_batches = 0

    for sheet_name in xl.sheet_names:
        print(f"  处理 Sheet: {sheet_name} ...")
        df = pd.read_excel(input_path, sheet_name=sheet_name, engine="openpyxl", header=0)
        df.columns = [str(c).strip() for c in df.columns]  # 清理列名空白
        rows = len(df)
        total_rows += rows

        if rows <= EXCEL_BATCH_SIZE:
            # 小 Sheet 一次性写入
            md = _df_to_md_table(df, title=sheet_name)
            with open(out_path, "a", encoding="utf-8") as f:
                f.write(md + "\n\n")
            total_batches += 1
        else:
            # 大 Sheet 分批写入
            n_batches = (rows + EXCEL_BATCH_SIZE - 1) // EXCEL_BATCH_SIZE
            for batch_idx in range(n_batches):
                start = batch_idx * EXCEL_BATCH_SIZE
                end = min(start + EXCEL_BATCH_SIZE, rows)
                title = f"{sheet_name}（第 {batch_idx+1}/{n_batches} 批，行 {start+1}–{end}）"
                print(f"    批次 {batch_idx+1}/{n_batches}（行 {start+1}–{end}）")
                md = _df_to_md_table(df.iloc[start:end], title=title)
                with open(out_path, "a", encoding="utf-8") as f:
                    f.write(md + "\n\n")
                total_batches += 1

    return {
        "output_path": out_path,
        "sheets": xl.sheet_names,
        "total_rows": total_rows,
        "batches": total_batches,
    }


def convert_csv_batched(input_path: str, output_md: str | None = None) -> dict:
    """
    CSV 流式分批处理（chunksize），避免大文件全量读入内存。
    返回 {output_path, total_rows, batches}
    """
    input_p = Path(input_path)
    out_path = output_md or str(input_p.parent / f"{input_p.stem}.md")
    Path(out_path).parent.mkdir(parents=True, exist_ok=True)
    Path(out_path).write_text(f"# {input_p.stem}\n\n", encoding="utf-8")

    total_rows = 0
    batch_idx = 0

    for chunk in pd.read_csv(input_path, chunksize=CSV_CHUNK_SIZE):
        start = total_rows + 1
        end = total_rows + len(chunk)
        title = f"CSV 数据（第 {batch_idx+1} 批，行 {start}–{end}）" if batch_idx > 0 or len(chunk) == CSV_CHUNK_SIZE else None
        print(f"  CSV 批次 {batch_idx+1}（行 {start}–{end}）...")
        md = _df_to_md_table(chunk, title=title)
        with open(out_path, "a", encoding="utf-8") as f:
            f.write(md + "\n\n")
        total_rows += len(chunk)
        batch_idx += 1

    return {"output_path": out_path, "total_rows": total_rows, "batches": batch_idx}
```

---

### 阶段 4：落库（SQLite / PostgreSQL）

#### 4.1 通用落库入口

```python
import os
import sqlalchemy as sa
from sqlalchemy import text, inspect

def get_db_engine(db_url: str | None = None):
    """
    获取 SQLAlchemy Engine。
    优先级：传入参数 > DATABASE_URL 环境变量 > 同目录 output.db（SQLite）。
    """
    url = db_url or os.getenv("DATABASE_URL") or "sqlite:///output.db"
    return sa.create_engine(url, echo=False)


def _safe_table_name(name: str) -> str:
    """将文件名/Sheet 名转为合法 SQL 表名（小写，非字母数字转下划线）。"""
    import re
    s = re.sub(r"[^\w]", "_", name.strip(), flags=re.ASCII)
    s = re.sub(r"_+", "_", s).strip("_").lower()
    if not s or s[0].isdigit():
        s = "t_" + s
    return s[:60]
```

#### 4.2 Excel / CSV 落库

```python
def ingest_excel_to_db(input_path: str, db_url: str | None = None, if_exists: str = "replace") -> dict:
    """
    将 Excel 每个 Sheet 写入数据库同名表（大文件分批 INSERT）。
    if_exists: 'replace'（覆盖）| 'append'（追加）| 'fail'（已存在则报错）
    返回 {tables: {sheet_name: row_count}}
    """
    engine = get_db_engine(db_url)
    xl = pd.ExcelFile(input_path, engine="openpyxl")
    result = {}

    for sheet_name in xl.sheet_names:
        table_name = _safe_table_name(sheet_name)
        print(f"  落库 Sheet '{sheet_name}' → 表 '{table_name}' ...")

        df = pd.read_excel(input_path, sheet_name=sheet_name, engine="openpyxl", header=0)
        df.columns = [str(c).strip() for c in df.columns]

        # 清理数据类型（避免 pandas nullable 类型写入失败）
        df = df.where(pd.notna(df), None)

        rows = len(df)

        if rows <= EXCEL_BATCH_SIZE:
            df.to_sql(table_name, engine, if_exists=if_exists, index=False)
            print(f"    写入 {rows} 行")
        else:
            # 分批 INSERT，首批用 if_exists，后续批次全用 append
            n_batches = (rows + EXCEL_BATCH_SIZE - 1) // EXCEL_BATCH_SIZE
            for batch_idx in range(n_batches):
                start = batch_idx * EXCEL_BATCH_SIZE
                end = min(start + EXCEL_BATCH_SIZE, rows)
                batch_if_exists = if_exists if batch_idx == 0 else "append"
                df.iloc[start:end].to_sql(table_name, engine, if_exists=batch_if_exists, index=False)
                print(f"    批次 {batch_idx+1}/{n_batches}：行 {start+1}–{end} 写入完成")

        result[sheet_name] = rows

    return {"tables": result}


def ingest_csv_to_db(input_path: str, db_url: str | None = None, if_exists: str = "replace") -> dict:
    """
    将 CSV 分批流式写入数据库表（表名 = 文件名去扩展名）。
    返回 {table: str, total_rows: int}
    """
    engine = get_db_engine(db_url)
    table_name = _safe_table_name(Path(input_path).stem)
    print(f"  落库 CSV → 表 '{table_name}' ...")

    total_rows = 0
    batch_idx = 0

    for chunk in pd.read_csv(input_path, chunksize=CSV_CHUNK_SIZE):
        chunk = chunk.where(pd.notna(chunk), None)
        batch_if_exists = if_exists if batch_idx == 0 else "append"
        chunk.to_sql(table_name, engine, if_exists=batch_if_exists, index=False)
        total_rows += len(chunk)
        batch_idx += 1
        print(f"    批次 {batch_idx}：累计写入 {total_rows} 行")

    return {"table": table_name, "total_rows": total_rows}
```

#### 4.3 PDF 落库（按页存储）

```python
def ingest_pdf_to_db(input_path: str, db_url: str | None = None) -> dict:
    """
    将 PDF 每一页的文本内容存入 pdf_pages 表：
      pdf_pages(id, source_file, page_num, content, created_at)
    大文件分批提取 + 分批 INSERT，不需要先转 Markdown。
    返回 {table, total_pages, total_chars}
    """
    import datetime

    engine = get_db_engine(db_url)
    input_p = Path(input_path)

    # 建表（如不存在）
    with engine.begin() as conn:
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS pdf_pages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                source_file TEXT NOT NULL,
                page_num INTEGER NOT NULL,
                content TEXT,
                created_at TEXT NOT NULL
            )
        """))

    doc = fitz.open(input_path)
    total_pages = len(doc)
    total_chars = 0
    total_batches = (total_pages + PDF_BATCH_SIZE - 1) // PDF_BATCH_SIZE
    source_name = input_p.name

    for batch_idx in range(total_batches):
        start = batch_idx * PDF_BATCH_SIZE
        end = min(start + PDF_BATCH_SIZE, total_pages)
        print(f"  落库第 {batch_idx+1}/{total_batches} 批（第 {start+1}–{end} 页）...")

        rows = []
        for page_num in range(start, end):
            text_content = doc[page_num].get_text("text").strip()
            rows.append({
                "source_file": source_name,
                "page_num": page_num + 1,
                "content": text_content,
                "created_at": datetime.datetime.now().isoformat(),
            })
            total_chars += len(text_content)

        df_batch = pd.DataFrame(rows)
        df_batch.to_sql("pdf_pages", engine, if_exists="append", index=False)

    doc.close()
    return {"table": "pdf_pages", "total_pages": total_pages, "total_chars": total_chars}
```

**PostgreSQL 兼容说明**：`ingest_pdf_to_db` 在 PostgreSQL 下需将建表 DDL 中的 `INTEGER PRIMARY KEY AUTOINCREMENT` 改为 `SERIAL PRIMARY KEY`，或交由 SQLAlchemy 自动推断。建议在 PostgreSQL 场景下改用：

```python
with engine.begin() as conn:
    conn.execute(text("""
        CREATE TABLE IF NOT EXISTS pdf_pages (
            id SERIAL PRIMARY KEY,
            source_file TEXT NOT NULL,
            page_num INTEGER NOT NULL,
            content TEXT,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    """))
```

---

### 阶段 5：统一入口函数

```python
def process_file(
    input_path: str,
    output_md: str | None = None,
    to_db: bool = False,
    db_url: str | None = None,
    if_exists: str = "replace",
) -> dict:
    """
    统一入口：根据文件类型自动选择转换 + 落库策略。

    参数：
        input_path: 输入文件路径
        output_md:  Markdown 输出路径（None = 同目录同名 .md）
        to_db:      是否落库
        db_url:     数据库连接串（None = DATABASE_URL 环境变量 or output.db）
        if_exists:  'replace' | 'append' | 'fail'

    返回 dict，包含 output_path / table / total_rows / total_pages 等字段。
    """
    ext = Path(input_path).suffix.lower()
    result = {}

    if ext == ".pdf":
        print(f"[PDF] 转换：{input_path}")
        md_result = convert_pdf(input_path, output_md)
        result.update(md_result)
        if to_db:
            print(f"[PDF] 落库...")
            db_result = ingest_pdf_to_db(input_path, db_url)
            result.update(db_result)

    elif ext in (".xlsx", ".xls", ".xlsm"):
        print(f"[Excel] 转换：{input_path}")
        md_result = convert_excel_batched(input_path, output_md)
        result.update(md_result)
        if to_db:
            print(f"[Excel] 落库...")
            db_result = ingest_excel_to_db(input_path, db_url, if_exists)
            result.update(db_result)

    elif ext == ".csv":
        print(f"[CSV] 转换：{input_path}")
        md_result = convert_csv_batched(input_path, output_md)
        result.update(md_result)
        if to_db:
            print(f"[CSV] 落库...")
            db_result = ingest_csv_to_db(input_path, db_url, if_exists)
            result.update(db_result)

    else:
        raise ValueError(f"不支持的文件格式: {ext}（支持 .pdf / .xlsx / .xls / .xlsm / .csv）")

    return result
```

---

## 错误处理

| 情况 | 处理方式 |
|------|----------|
| 文件不存在 | `FileNotFoundError`，告知用户检查路径 |
| 不支持格式 | `ValueError`，告知支持格式列表 |
| 依赖未安装 | 打印 `pip install` 命令并终止 |
| PDF 内容为空（扫描件）| 自动降级 PyMuPDF → GLM-4V |
| 数据库连接失败 | 打印详细错误，建议检查 `DATABASE_URL` |
| Excel Sheet 读取失败 | 跳过该 Sheet，继续处理其他 Sheet，最终打印跳过列表 |

---

## 输出格式

### 仅转 Markdown

```
[Excel] 转换：/path/to/data.xlsx
  处理 Sheet: 销售数据 ...
    批次 1/4（行 1–500）
    批次 2/4（行 501–1000）
    ...
[OK] 转换完成
输出文件: /path/to/data.md
Sheet 数: 3 个
总行数: 2847 行
批次数: 8 批
```

### 转 Markdown + 落库

```
[Excel] 转换：/path/to/data.xlsx
  ...
[Excel] 落库...
  落库 Sheet '销售数据' → 表 'xiao_shou_shu_ju' ...
    批次 1/4：行 1–500 写入完成
    ...
[OK] 完成
Markdown: /path/to/data.md
数据库: sqlite:///output.db
写入表: {'销售数据': 2000, '库存': 500, ...}
```

### 仅落库（不生成 Markdown）

```python
result = process_file("/path/to/data.xlsx", to_db=True)
# 或
result = ingest_excel_to_db("/path/to/data.xlsx", db_url="postgresql://...")
```

---

## 注意事项

- **列名**：必须用 `header=0`（实际表头），不用 `header=None`
- **中文列名**：落库时 SQLAlchemy 自动引用，PostgreSQL 安全
- **NaN 清理**：落库前用 `df.where(pd.notna(df), None)` 将 NaN 转 None，避免写入失败
- **大文件内存**：PDF 用页级别批处理；CSV 用 `chunksize` 流式读取；Excel 全量读入单 Sheet 后分批写 DB
- **断点续传**：如需断点续传，在 Excel/CSV 落库时将 `if_exists` 改为 `'append'` 并记录已处理批次
- **PostgreSQL DDL**：`pdf_pages` 建表语句需区分 SQLite（`AUTOINCREMENT`）和 PostgreSQL（`SERIAL`），使用 `DATABASE_URL` 前缀判断
- **多 Sheet 顺序**：Excel 多 Sheet 按 `xl.sheet_names` 顺序逐个处理，每个 Sheet 独立建表
