# Google Maps MCP Server

Google Maps API 的 MCP 服务器实现，提供地点搜索、地理编码、路线规划等功能。

## 快速开始

### 1. 获取 Google Maps API Key

1. 访问 [Google Cloud Console](https://console.cloud.google.com/)
2. 创建新项目或选择现有项目
3. 启用以下 API：
   - Maps JavaScript API
   - Places API
   - Geocoding API
   - Directions API
4. 创建 API Key：
   - 导航到 "APIs & Services" > "Credentials"
   - 点击 "Create Credentials" > "API Key"
   - 保存 API Key

### 2. 安装依赖

```powershell
cd mcp_servers/google_maps
pip install -r requirements.txt
```

或使用安装脚本：

```powershell
.\setup.ps1
```

### 3. 配置 Cursor

编辑 `c:\Users\你的用户名\.cursor\mcp.json`，确保包含：

```json
{
  "mcpServers": {
    "Google Maps": {
      "command": "python",
      "args": [
        "D:/Projects/agent-jk/mcp_servers/google_maps/server.py"
      ],
      "env": {
        "GOOGLE_MAPS_API_KEY": "你的_API_KEY"
      }
    }
  }
}
```

### 4. 重启 Cursor

重启 Cursor 使配置生效。

## 可用工具

### 1. `search_places`
搜索地点（餐厅、商店、地标等）

**参数**:
- `query` (必需): 搜索关键词，例如 "bakery in Los Angeles"
- `location` (可选): 位置，例如 "34.0522,-118.2437" 或 "Los Angeles, CA"
- `radius` (可选): 搜索半径（米），默认 5000

**示例**:
```
搜索 "bakery in Los Angeles"
```

### 2. `get_place_details`
获取地点详细信息

**参数**:
- `place_id` (必需): Google Places place_id

### 3. `geocode`
地理编码：将地址转换为坐标

**参数**:
- `address` (必需): 地址，例如 "1600 Amphitheatre Parkway, Mountain View, CA"

### 4. `reverse_geocode`
反向地理编码：将坐标转换为地址

**参数**:
- `lat` (必需): 纬度
- `lng` (必需): 经度

### 5. `get_directions`
获取路线规划

**参数**:
- `origin` (必需): 起点
- `destination` (必需): 终点
- `mode` (可选): 交通方式 (driving/walking/bicycling/transit)

### 6. `get_distance_matrix`
计算多个地点之间的距离和时间

**参数**:
- `origins` (必需): 起点列表
- `destinations` (必需): 终点列表
- `mode` (可选): 交通方式

## 使用示例

### 示例 1: 搜索面包店

```
用户: "在洛杉矶搜索面包店"
→ 调用 search_places(query="bakery in Los Angeles")
→ 返回地点列表
```

### 示例 2: 获取路线

```
用户: "从洛杉矶到旧金山怎么走？"
→ 调用 get_directions(origin="Los Angeles", destination="San Francisco")
→ 返回路线、距离、时间
```

### 示例 3: 地理编码

```
用户: "1600 Amphitheatre Parkway 的坐标是什么？"
→ 调用 geocode(address="1600 Amphitheatre Parkway, Mountain View, CA")
→ 返回坐标
```

## 成本说明

Google Maps API 按使用量计费：
- Places API: $17/1000 次请求
- Geocoding API: $5/1000 次请求
- Directions API: $5/1000 次请求

**好消息**: Google 提供每月 $200 免费额度，通常足够个人和小型项目使用。

## 故障排除

### MCP 服务器未显示

1. 检查 `mcp.json` 格式是否正确
2. 确认 API Key 已配置
3. 重启 Cursor

### API Key 错误

1. 确认 API Key 正确
2. 检查 API 是否已启用
3. 验证 API Key 限制设置

### 连接超时

1. 检查网络连接
2. 验证 API Key 是否有效
3. 检查 Google Cloud 项目状态

## 与 .cursorrule 集成

根据 `analysis/.cursorrule` 的规则：

- **MCP 优先**: 优先使用 MCP 工具
- **超时处理**: 如果 MCP 调用超过 30 秒，自动切换到 Python 脚本
- **备用方案**: 如果 MCP 失败，使用 `googlemaps` Python 库直接调用 API

## 相关资源

- [Google Maps Platform 文档](https://developers.google.com/maps)
- [Google Maps Python Client](https://github.com/googlemaps/google-maps-services-python)
- [MCP 协议文档](https://modelcontextprotocol.io/)


