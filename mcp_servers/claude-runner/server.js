#!/usr/bin/env node
"use strict";

/**
 * Claude Runner MCP Server
 *
 * Wraps Claude Code CLI as MCP tools so Cursor (or any MCP client)
 * can dispatch coding tasks to Claude Code and get results back.
 *
 * Tool: claude_code_run(prompt, cwd?, timeout_ms?)
 */

const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");

const SDK = path.join(__dirname, "node_modules/@modelcontextprotocol/sdk/dist/cjs");
const { Server } = require(path.join(SDK, "server/index.js"));
const { StdioServerTransport } = require(path.join(SDK, "server/stdio.js"));
const { CallToolRequestSchema, ListToolsRequestSchema } = require(path.join(SDK, "types.js"));

// ── Config ────────────────────────────────────────────────────────────────────

const PROJECT_ROOT = path.resolve(__dirname, "../..");
const CLI_PATH = path.join(PROJECT_ROOT, "dist", "cli-node.js");

// Git Bash path (Windows requirement). Falls back to env var, then common paths.
function resolveGitBash() {
  if (process.env.CLAUDE_CODE_GIT_BASH_PATH) {
    return process.env.CLAUDE_CODE_GIT_BASH_PATH;
  }
  const candidates = [
    "D:/Git/usr/bin/bash.exe",
    "C:/Program Files/Git/bin/bash.exe",
    "C:/Git/bin/bash.exe",
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

const GIT_BASH = resolveGitBash();
const DEFAULT_CWD = PROJECT_ROOT;
const DEFAULT_TIMEOUT_MS = 120_000; // 2 minutes

// ── Core runner ───────────────────────────────────────────────────────────────

/**
 * Spawn Claude Code in pipe mode (-p), feed prompt via stdin, collect stdout.
 * Returns the text output when Claude Code exits.
 */
function runClaudeCode(prompt, { cwd = DEFAULT_CWD, timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(CLI_PATH)) {
      return reject(new Error(
        `Claude Code CLI not found at ${CLI_PATH}. Run 'bun run build' in ${PROJECT_ROOT} first.`
      ));
    }

    const env = { ...process.env };
    if (GIT_BASH) {
      env.CLAUDE_CODE_GIT_BASH_PATH = GIT_BASH;
    }
    // Suppress ANSI colors
    env.NO_COLOR = "1";
    env.FORCE_COLOR = "0";
    env.TERM = "dumb";

    const child = spawn("node", [CLI_PATH, "-p"], {
      cwd: fs.existsSync(cwd) ? cwd : DEFAULT_CWD,
      env,
      stdio: ["pipe", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (d) => { stdout += d.toString(); });
    child.stderr.on("data", (d) => { stderr += d.toString(); });

    const timer = setTimeout(() => {
      child.kill("SIGTERM");
      reject(new Error(
        `Claude Code timed out after ${timeoutMs}ms. ` +
        `Partial output: ${stdout.slice(0, 500) || "(none)"}`
      ));
    }, timeoutMs);

    child.on("close", (code) => {
      clearTimeout(timer);
      const out = stdout.trim();
      if (out) {
        resolve(out);
      } else if (code === 0) {
        resolve("(Claude Code completed with no output)");
      } else {
        reject(new Error(
          `Claude Code exited with code ${code}.\nstderr: ${stderr.trim().slice(0, 500)}`
        ));
      }
    });

    child.on("error", (err) => {
      clearTimeout(timer);
      reject(new Error(`Failed to spawn Claude Code: ${err.message}`));
    });

    child.stdin.write(prompt);
    child.stdin.end();
  });
}

// ── Tool definitions ──────────────────────────────────────────────────────────

const TOOLS = [
  {
    name: "claude_code_run",
    description: [
      "Run a coding task using Claude Code (AI coding agent) in pipe mode.",
      "Claude Code can read files, write code, run commands, fix bugs, explain code, and more.",
      "The task executes in the specified working directory — Claude Code can see and modify files there.",
      "Use this when you need a capable AI coding agent to handle a sub-task autonomously.",
      "Returns Claude Code's complete text output when the task finishes.",
    ].join(" "),
    inputSchema: {
      type: "object",
      properties: {
        prompt: {
          type: "string",
          description: [
            "The task or instruction for Claude Code to execute.",
            "Be specific: include file paths, expected behavior, constraints.",
            "Example: 'In ./src/utils.ts, add a debounce helper function with TypeScript types and a JSDoc comment.'",
          ].join(" "),
        },
        cwd: {
          type: "string",
          description: [
            "Absolute path to the working directory for the task.",
            "Claude Code will read/write files relative to this directory.",
            "Defaults to the claude-code project root if omitted.",
            "Example: 'D:/Projects/my-app'",
          ].join(" "),
        },
        timeout_ms: {
          type: "number",
          description: [
            "Maximum execution time in milliseconds.",
            "Default: 120000 (2 minutes). Increase for complex multi-file tasks.",
            "Max recommended: 300000 (5 minutes).",
          ].join(" "),
        },
      },
      required: ["prompt"],
    },
  },
  {
    name: "claude_code_check",
    description: "Check if Claude Code CLI is installed and ready to use. Returns status and configuration info.",
    inputSchema: {
      type: "object",
      properties: {},
      required: [],
    },
  },
];

// ── MCP Server ────────────────────────────────────────────────────────────────

async function main() {
  const server = new Server(
    { name: "claude-runner", version: "1.0.0" },
    { capabilities: { tools: {} } },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    // ── claude_code_check ────────────────────────────────────────────────────
    if (name === "claude_code_check") {
      const cliExists = fs.existsSync(CLI_PATH);
      const info = [
        `CLI path: ${CLI_PATH} — ${cliExists ? "✓ found" : "✗ not found (run bun run build)"}`,
        `Git Bash: ${GIT_BASH || "✗ not found (set CLAUDE_CODE_GIT_BASH_PATH)"}`,
        `Default cwd: ${DEFAULT_CWD}`,
        `API key: ${process.env.ANTHROPIC_API_KEY ? "✓ set" : "✗ not set (set ANTHROPIC_API_KEY)"}`,
      ].join("\n");

      return { content: [{ type: "text", text: info }] };
    }

    // ── claude_code_run ──────────────────────────────────────────────────────
    if (name === "claude_code_run") {
      const prompt = args?.prompt;
      if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
        return {
          content: [{ type: "text", text: "Error: prompt is required and must be a non-empty string." }],
          isError: true,
        };
      }

      const cwd = typeof args?.cwd === "string" && args.cwd.trim() ? args.cwd.trim() : DEFAULT_CWD;
      const timeoutMs = typeof args?.timeout_ms === "number" && args.timeout_ms > 0
        ? Math.min(args.timeout_ms, 600_000) // cap at 10 min
        : DEFAULT_TIMEOUT_MS;

      try {
        const result = await runClaudeCode(prompt, { cwd, timeoutMs });
        return { content: [{ type: "text", text: result }] };
      } catch (err) {
        return {
          content: [{ type: "text", text: `Claude Code error: ${err.message}` }],
          isError: true,
        };
      }
    }

    return {
      content: [{ type: "text", text: `Unknown tool: ${name}` }],
      isError: true,
    };
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  process.stderr.write(`[claude-runner] Fatal: ${err.message}\n`);
  process.exit(1);
});
