# Google Maps MCP 快速安装指南

## 🚀 5 步完成安装

### 步骤 1: 获取 Google Maps API Key（5 分钟）

1. 访问 https://console.cloud.google.com/
2. 创建新项目或选择现有项目
3. 启用以下 API：
   - 搜索 "Places API" → 启用
   - 搜索 "Geocoding API" → 启用
   - 搜索 "Directions API" → 启用
4. 创建 API Key：
   - 导航到 "APIs & Services" > "Credentials"
   - 点击 "Create Credentials" > "API Key"
   - **复制并保存 API Key**（稍后需要）

### 步骤 2: 安装依赖（1 分钟）

打开 PowerShell，运行：

```powershell
cd D:\Projects\agent-jk\mcp_servers\google_maps
pip install -r requirements.txt
```

或使用自动安装脚本：

```powershell
.\setup.ps1
```

### 步骤 3: 配置 API Key（1 分钟）

编辑 `c:\Users\m1774\.cursor\mcp.json`，找到 `"Google Maps"` 配置，将 `YOUR_API_KEY_HERE` 替换为你的实际 API Key：

```json
{
  "mcpServers": {
    "Google Maps": {
      "command": "python",
      "args": [
        "D:/Projects/agent-jk/mcp_servers/google_maps/server.py"
      ],
      "env": {
        "GOOGLE_MAPS_API_KEY": "你的实际_API_KEY"
      }
    }
  }
}
```

### 步骤 4: 重启 Cursor

完全关闭并重新打开 Cursor。

### 步骤 5: 验证安装

在 Cursor 中，你应该能看到 "Google Maps" MCP 服务器已启用。

## ✅ 测试

尝试在 Cursor 中提问：

```
"搜索洛杉矶的面包店"
"从洛杉矶到旧金山怎么走？"
"1600 Amphitheatre Parkway 的坐标是什么？"
```

## 💰 成本

- Google 提供 **每月 $200 免费额度**
- 通常足够个人使用
- 超出后按量计费（Places API: $17/1000 次）

## ❌ 常见问题

### Q: MCP 服务器未显示？
A: 
1. 检查 `mcp.json` 格式是否正确（JSON 格式）
2. 确认 API Key 已正确配置
3. 重启 Cursor

### Q: API Key 错误？
A:
1. 确认 API Key 已复制完整（没有多余空格）
2. 检查 API 是否已启用
3. 验证 Google Cloud 项目状态

### Q: 工具调用失败？
A:
1. 检查网络连接
2. 验证 API Key 是否有效
3. 查看 Cursor 的 MCP 日志

## 📚 更多信息

查看 `README.md` 了解详细功能和使用示例。


