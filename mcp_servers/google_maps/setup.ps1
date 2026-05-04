# Google Maps MCP 安装脚本 (PowerShell)

Write-Host "=== Google Maps MCP 安装脚本 ===" -ForegroundColor Green

# 检查 Python
Write-Host "`n[1/4] 检查 Python..." -ForegroundColor Yellow
$pythonVersion = python --version 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "错误: 未找到 Python，请先安装 Python 3.8+" -ForegroundColor Red
    exit 1
}
Write-Host "✓ Python: $pythonVersion" -ForegroundColor Green

# 安装依赖
Write-Host "`n[2/4] 安装 Python 依赖..." -ForegroundColor Yellow
$requirementsPath = Join-Path $PSScriptRoot "requirements.txt"
if (Test-Path $requirementsPath) {
    pip install -r $requirementsPath
    if ($LASTEXITCODE -ne 0) {
        Write-Host "错误: 依赖安装失败" -ForegroundColor Red
        exit 1
    }
    Write-Host "✓ 依赖安装完成" -ForegroundColor Green
} else {
    Write-Host "警告: 未找到 requirements.txt" -ForegroundColor Yellow
}

# 检查 API Key
Write-Host "`n[3/4] 配置 API Key..." -ForegroundColor Yellow
$apiKey = Read-Host "请输入你的 Google Maps API Key (或按 Enter 稍后配置)"
if ($apiKey) {
    $mcpConfigPath = "$env:USERPROFILE\.cursor\mcp.json"
    if (Test-Path $mcpConfigPath) {
        $config = Get-Content $mcpConfigPath | ConvertFrom-Json
        if ($config.mcpServers."Google Maps") {
            $config.mcpServers."Google Maps".env.GOOGLE_MAPS_API_KEY = $apiKey
            $config | ConvertTo-Json -Depth 10 | Set-Content $mcpConfigPath -Encoding UTF8
            Write-Host "✓ API Key 已配置到 mcp.json" -ForegroundColor Green
        } else {
            Write-Host "警告: mcp.json 中未找到 Google Maps 配置，请手动添加" -ForegroundColor Yellow
        }
    } else {
        Write-Host "警告: 未找到 mcp.json，请手动配置" -ForegroundColor Yellow
    }
} else {
    Write-Host "提示: 请稍后在 mcp.json 中配置 GOOGLE_MAPS_API_KEY" -ForegroundColor Yellow
}

# 验证安装
Write-Host "`n[4/4] 验证安装..." -ForegroundColor Yellow
python -c "import googlemaps; import mcp; print('✓ 所有依赖已安装')" 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "`n=== 安装完成 ===" -ForegroundColor Green
    Write-Host "`n下一步:" -ForegroundColor Cyan
    Write-Host "1. 在 Google Cloud Console 创建 API Key" -ForegroundColor White
    Write-Host "2. 启用以下 API:" -ForegroundColor White
    Write-Host "   - Maps JavaScript API" -ForegroundColor White
    Write-Host "   - Places API" -ForegroundColor White
    Write-Host "   - Geocoding API" -ForegroundColor White
    Write-Host "   - Directions API" -ForegroundColor White
    Write-Host "3. 在 c:\Users\$env:USERNAME\.cursor\mcp.json 中配置 API Key" -ForegroundColor White
    Write-Host "4. 重启 Cursor" -ForegroundColor White
} else {
    Write-Host "错误: 验证失败，请检查错误信息" -ForegroundColor Red
    exit 1
}


