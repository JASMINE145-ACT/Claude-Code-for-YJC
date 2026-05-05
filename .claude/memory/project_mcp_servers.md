---
name: MCP server Python venv setup
description: Python MCP servers go in mcp_servers/ with deps in .venv
type: project
---

Python-based MCP servers are stored in `mcp_servers/<name>/` directories. Dependencies are installed into the `.venv` virtual environment (not system Python). The Google Maps MCP server was successfully set up this way on 2026-04-17.

**Why:** The Claude Code project is a Bun/Node.js TypeScript project, but MCP servers are Python tools that need their own virtual environment.

**How to apply:** When user asks to add/test a Python-based MCP server — copy to `mcp_servers/`, install with `.venv/Scripts/pip.exe install -r requirements.txt`, and test with the venv's Python.

## Published MCP Servers

The user has published two MCP servers to their GitHub fork:
- `mcp_servers/claude-runner/` — Claude Runner MCP service (Node.js)
- `mcp_servers/google_maps/` — Google Maps API integration (Python)

## GitHub Publication (2026-05-05)

The user pushed a customized fork of Claude Code Best V5 to:
`https://github.com/JASMINE145-ACT/Claude-Code-for-YJC`

**Excluded from upload:** model/api related files, `.env` (API keys), `.mcp.json` (local Chrome MCP config), `.venv/` (Python virtual env), `ppt-master/` (embedded git repo), junk files (`=0.x.x`)

**VPN/代理配置文档 (2026-05-05)：** 已创建 `docs/vpn-proxy-guide.md`，记录 Git/npm/bun/pip/curl/Claude Code 走代理的方式和常见问题。
