#!/usr/bin/env python3
"""
Google Maps MCP Server
使用 Google Maps API 提供地点搜索、地理编码、路线规划等功能
"""

import os
import sys
import json
from pathlib import Path
from typing import Any, Dict, List, Optional
from mcp.server import Server
from mcp.types import Tool, TextContent
import googlemaps
from datetime import datetime

# 配置标准输出编码为 UTF-8（避免 Windows GBK 编码错误）
if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8')

# 尝试加载 .env 文件
try:
    from dotenv import load_dotenv
    # 查找项目根目录的 .env 文件
    project_root = Path(__file__).parent.parent.parent
    env_path = project_root / ".env"
    if env_path.exists():
        load_dotenv(env_path)
    else:
        # 也尝试当前目录
        load_dotenv()
except ImportError:
    # 如果没有 python-dotenv，只使用环境变量
    pass
except Exception:
    # 忽略任何加载错误
    pass

# 初始化 Google Maps 客户端
GOOGLE_MAPS_API_KEY = os.getenv("GOOGLE_MAPS_API_KEY")
if not GOOGLE_MAPS_API_KEY:
    raise ValueError(
        "GOOGLE_MAPS_API_KEY not found. Please set it in .env file or environment variables."
    )

gmaps = googlemaps.Client(key=GOOGLE_MAPS_API_KEY)

# 创建 MCP 服务器
app = Server("google-maps")


@app.list_tools()
async def list_tools() -> List[Tool]:
    """列出所有可用工具"""
    return [
        Tool(
            name="search_places",
            description="搜索地点（餐厅、商店、地标等）",
            inputSchema={
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "搜索关键词，例如：'bakery in Los Angeles'"
                    },
                    "location": {
                        "type": "string",
                        "description": "位置（可选），例如：'34.0522,-118.2437' 或 'Los Angeles, CA'"
                    },
                    "radius": {
                        "type": "integer",
                        "description": "搜索半径（米），默认 5000"
                    }
                },
                "required": ["query"]
            }
        ),
        Tool(
            name="get_place_details",
            description="获取地点详细信息",
            inputSchema={
                "type": "object",
                "properties": {
                    "place_id": {
                        "type": "string",
                        "description": "Google Places place_id"
                    }
                },
                "required": ["place_id"]
            }
        ),
        Tool(
            name="geocode",
            description="地理编码：将地址转换为坐标",
            inputSchema={
                "type": "object",
                "properties": {
                    "address": {
                        "type": "string",
                        "description": "地址，例如：'1600 Amphitheatre Parkway, Mountain View, CA'"
                    }
                },
                "required": ["address"]
            }
        ),
        Tool(
            name="reverse_geocode",
            description="反向地理编码：将坐标转换为地址",
            inputSchema={
                "type": "object",
                "properties": {
                    "lat": {
                        "type": "number",
                        "description": "纬度"
                    },
                    "lng": {
                        "type": "number",
                        "description": "经度"
                    }
                },
                "required": ["lat", "lng"]
            }
        ),
        Tool(
            name="get_directions",
            description="获取路线规划",
            inputSchema={
                "type": "object",
                "properties": {
                    "origin": {
                        "type": "string",
                        "description": "起点，可以是地址或坐标"
                    },
                    "destination": {
                        "type": "string",
                        "description": "终点，可以是地址或坐标"
                    },
                    "mode": {
                        "type": "string",
                        "enum": ["driving", "walking", "bicycling", "transit"],
                        "description": "交通方式，默认 driving"
                    }
                },
                "required": ["origin", "destination"]
            }
        ),
        Tool(
            name="get_distance_matrix",
            description="计算多个地点之间的距离和时间",
            inputSchema={
                "type": "object",
                "properties": {
                    "origins": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "起点列表"
                    },
                    "destinations": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "终点列表"
                    },
                    "mode": {
                        "type": "string",
                        "enum": ["driving", "walking", "bicycling", "transit"],
                        "description": "交通方式，默认 driving"
                    }
                },
                "required": ["origins", "destinations"]
            }
        )
    ]


@app.call_tool()
async def call_tool(name: str, arguments: Dict[str, Any]) -> List[TextContent]:
    """处理工具调用"""
    
    try:
        if name == "search_places":
            query = arguments["query"]
            location = arguments.get("location")
            radius = arguments.get("radius", 5000)
            
            # 构建搜索参数
            search_params = {
                "query": query
            }
            if location:
                search_params["location"] = location
            if radius:
                search_params["radius"] = radius
            
            # 执行搜索
            places_result = gmaps.places(**search_params)
            
            # 格式化结果
            results = []
            for place in places_result.get("results", [])[:10]:  # 限制返回前10个
                results.append({
                    "name": place.get("name"),
                    "place_id": place.get("place_id"),
                    "address": place.get("formatted_address"),
                    "rating": place.get("rating"),
                    "location": place.get("geometry", {}).get("location")
                })
            
            return [TextContent(
                type="text",
                text=f"找到 {len(results)} 个地点：\n\n" + 
                     json.dumps(results, indent=2, ensure_ascii=False)
            )]
        
        elif name == "get_place_details":
            place_id = arguments["place_id"]
            place_details = gmaps.place(place_id=place_id)
            
            result = place_details.get("result", {})
            formatted = {
                "name": result.get("name"),
                "address": result.get("formatted_address"),
                "phone": result.get("formatted_phone_number"),
                "website": result.get("website"),
                "rating": result.get("rating"),
                "reviews": len(result.get("reviews", [])),
                "opening_hours": result.get("opening_hours", {}).get("weekday_text", []),
                "location": result.get("geometry", {}).get("location")
            }
            
            return [TextContent(
                type="text",
                text=json.dumps(formatted, indent=2, ensure_ascii=False)
            )]
        
        elif name == "geocode":
            address = arguments["address"]
            geocode_result = gmaps.geocode(address)
            
            if not geocode_result:
                return [TextContent(type="text", text=f"未找到地址: {address}")]
            
            location = geocode_result[0]["geometry"]["location"]
            formatted = {
                "address": geocode_result[0]["formatted_address"],
                "location": {
                    "lat": location["lat"],
                    "lng": location["lng"]
                }
            }
            
            return [TextContent(
                type="text",
                text=json.dumps(formatted, indent=2, ensure_ascii=False)
            )]
        
        elif name == "reverse_geocode":
            lat = arguments["lat"]
            lng = arguments["lng"]
            reverse_geocode_result = gmaps.reverse_geocode((lat, lng))
            
            if not reverse_geocode_result:
                return [TextContent(type="text", text=f"未找到坐标对应的地址: {lat}, {lng}")]
            
            formatted = {
                "address": reverse_geocode_result[0]["formatted_address"],
                "location": {"lat": lat, "lng": lng}
            }
            
            return [TextContent(
                type="text",
                text=json.dumps(formatted, indent=2, ensure_ascii=False)
            )]
        
        elif name == "get_directions":
            origin = arguments["origin"]
            destination = arguments["destination"]
            mode = arguments.get("mode", "driving")
            
            directions_result = gmaps.directions(
                origin=origin,
                destination=destination,
                mode=mode
            )
            
            if not directions_result:
                return [TextContent(type="text", text="未找到路线")]
            
            route = directions_result[0]
            leg = route["legs"][0]
            
            formatted = {
                "distance": leg["distance"]["text"],
                "duration": leg["duration"]["text"],
                "start_address": leg["start_address"],
                "end_address": leg["end_address"],
                "steps": [
                    {
                        "instruction": step["html_instructions"],
                        "distance": step["distance"]["text"],
                        "duration": step["duration"]["text"]
                    }
                    for step in leg["steps"][:5]  # 只返回前5步
                ]
            }
            
            return [TextContent(
                type="text",
                text=json.dumps(formatted, indent=2, ensure_ascii=False)
            )]
        
        elif name == "get_distance_matrix":
            origins = arguments["origins"]
            destinations = arguments["destinations"]
            mode = arguments.get("mode", "driving")
            
            matrix = gmaps.distance_matrix(
                origins=origins,
                destinations=destinations,
                mode=mode
            )
            
            results = []
            for i, origin in enumerate(origins):
                for j, destination in enumerate(destinations):
                    element = matrix["rows"][i]["elements"][j]
                    if element["status"] == "OK":
                        results.append({
                            "origin": origin,
                            "destination": destination,
                            "distance": element["distance"]["text"],
                            "duration": element["duration"]["text"]
                        })
            
            return [TextContent(
                type="text",
                text=json.dumps(results, indent=2, ensure_ascii=False)
            )]
        
        else:
            return [TextContent(type="text", text=f"未知工具: {name}")]
    
    except Exception as e:
        return [TextContent(type="text", text=f"错误: {str(e)}")]


if __name__ == "__main__":
    import asyncio
    from mcp.server.stdio import stdio_server
    
    async def main():
        async with stdio_server() as (read_stream, write_stream):
            await app.run(read_stream, write_stream, app.create_initialization_options())
    
    asyncio.run(main())

