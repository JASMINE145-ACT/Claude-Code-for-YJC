# Google Maps MCP 安装指南

## 方案选择

### 方案 1: Google Grounding Lite MCP（推荐 - 官方）
- ✅ Google 官方支持
- ✅ 可靠性高
- ✅ 支持地点搜索、路线规划等工具
- ⚠️ 需要 Google Cloud 项目和 API Key

### 方案 2: Cablate MCP-Google-Map（开源）
- ✅ 功能丰富（geocoding, places, directions）
- ✅ 可本地部署
- ✅ 开源可定制
- ⚠️ 需要 Google Maps API Key
- ⚠️ 仅支持 HTTP transport（不支持 stdio）

## 前置要求

1. **Google Cloud 项目**
   - 访问 [Google Cloud Console](https://console.cloud.google.com/)
   - 创建新项目或选择现有项目
   - 启用计费（Google Maps API 需要）

2. **启用 Google Maps API**
   - Maps JavaScript API
   - Places API
   - Geocoding API
   - Directions API
   - Distance Matrix API（如需要）

3. **创建 API Key**
   - 在 Google Cloud Console 中创建 API Key
   - 设置 API Key 限制（推荐：仅允许特定 API）
   - 保存 API Key（稍后使用）

## 安装步骤

### 方案 1: Google Grounding Lite MCP（推荐）

#### 步骤 1: 获取访问凭证

1. 访问 [Google Grounding Lite 文档](https://developers.google.com/maps/ai/grounding-lite)
2. 按照文档获取访问凭证

#### 步骤 2: 配置 Cursor MCP

编辑 `c:\Users\m1774\.cursor\mcp.json`，添加：

```json
{
  "mcpServers": {
    "Google Maps": {
      "url": "https://maps.googleapis.com/maps/api/...",
      "headers": {
        "X-Goog-Api-Key": "YOUR_API_KEY"
      }
    }
  }
}
```

**注意**: Google Grounding Lite 的具体配置方式请参考官方文档。

### 方案 2: Cablate MCP-Google-Map（本地部署）

#### 步骤 1: 安装 Node.js 和 npm

确保已安装 Node.js（v18+）：
```bash
node --version
npm --version
```

#### 步骤 2: 安装 MCP 服务器

```bash
npm install -g @cablate/mcp-google-map
```

或使用 npx（无需全局安装）：
```bash
# 无需全局安装，直接使用 npx
```

#### 步骤 3: 启动 MCP 服务器

**方式 A: 使用环境变量**
```bash
# Windows PowerShell
$env:GOOGLE_MAPS_API_KEY="你的_API_KEY"
$env:MCP_SERVER_PORT="3000"
npx @cablate/mcp-google-map
```

**方式 B: 使用命令行参数**
```bash
npx @cablate/mcp-google-map --port 3000 --apikey "你的_API_KEY"
```

#### 步骤 4: 配置 Cursor

编辑 `c:\Users\m1774\.cursor\mcp.json`，添加：

```json
{
  "mcpServers": {
    "Google Maps": {
      "transport": "http",
      "url": "http://localhost:3000/mcp",
      "headers": {
        "X-Google-Maps-API-Key": "你的_API_KEY"
      }
    }
  }
  }
}
```

**重要**: Cablate MCP 仅支持 HTTP transport，不支持 stdio 模式。

#### 步骤 5: 重启 Cursor

重启 Cursor 使配置生效。

## 方案 3: 创建本地 Python MCP 服务器（最灵活）

如果你想完全控制，可以创建一个本地 Python MCP 服务器。

### 创建服务器

```bash
cd mcp_servers
mkdir google_maps
cd google_maps
```

### 安装依赖

```bash
pip install googlemaps mcp
```

### 创建 server.py

（见下方代码文件）

## 验证安装

重启 Cursor 后，你应该能看到 "Google Maps" MCP 服务器已启用。

测试工具：
- `search_places` - 搜索地点
- `get_place_details` - 获取地点详情
- `geocode` - 地理编码
- `reverse_geocode` - 反向地理编码
- `get_directions` - 获取路线

## 故障排除

1. **MCP 服务器未显示**
   - 检查 `mcp.json` 格式是否正确
   - 确认服务器正在运行（方案 2）
   - 重启 Cursor

2. **API Key 错误**
   - 确认 API Key 正确
   - 检查 API 是否已启用
   - 验证 API Key 限制设置

3. **连接超时**
   - 检查服务器是否在运行（方案 2）
   - 验证 URL 和端口是否正确
   - 检查防火墙设置

## 成本说明

Google Maps API 使用按量计费：
- Places API: $17/1000 次请求
- Geocoding API: $5/1000 次请求
- Directions API: $5/1000 次请求

Google 提供每月 $200 免费额度，通常足够个人使用。


