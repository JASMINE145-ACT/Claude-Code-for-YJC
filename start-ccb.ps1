$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$configDir = Join-Path $projectRoot ".claude-local"

if (-not (Test-Path -LiteralPath $configDir)) {
  New-Item -ItemType Directory -Path $configDir | Out-Null
}

$env:CLAUDE_CONFIG_DIR = $configDir

Write-Host "CLAUDE_CONFIG_DIR=$env:CLAUDE_CONFIG_DIR"
bun run dev
