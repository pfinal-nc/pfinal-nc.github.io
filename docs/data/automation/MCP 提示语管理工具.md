---
title: 【重磅工具】一键管理AI提示词，让效率翻倍！
date: 2025-06-05 10:14:02
tags:
  - 工具
description: 提示语管理工具
author: PFinal南丞
keywords: 
  - MCP提示语管理
  - AI提示词管理工具
  - Prompt模板管理
  - MCP协议应用
  - AI编程助手
  - 提示词工程
  - Prompt Engineering
  - Cursor编辑器
  - Windsurf工具
  - AI开发效率工具
---

# 【重磅工具】一键管理AI提示词，让效率翻倍！

在逛 Github 的时候 发现了一个 好玩的项目 **mcp-prompt-server** 一个 基于 MCP 协议的 提示语管理工具.

## 项目介绍

这是一个基于Model Context Protocol (MCP)的服务器，用于根据用户任务需求提供预设的prompt模板，帮助Cline/Cursor/Windsurf...更高效地执行各种任务。服务器将预设的prompt作为工具(tools)返回，以便在Cursor和Windsurf等编辑器中更好地使用。

## 功能
- 提供预设的prompt模板，可用于代码审查、API文档生成、代码重构等任务
- 将所有prompt模板作为MCP工具(tools)提供，而非MCP prompts格式
- 支持动态参数替换，使prompt模板更加灵活
- 允许开发者自由添加和修改prompt模板
- 提供工具API，可重新加载prompt和查询可用prompt
- 专为Cursor和Windsurf等编辑器优化，提供更好的集成体验

## 目录结构

```shell

mcp-prompt-server/
├── package.json
├── src/
│   ├── index.js                # 服务器主入口
│   └── prompts/                # 所有Prompt模板目录
│       ├── gen_summarize.yaml
│       ├── ...                # 更多Prompt模板
└── README.md

```

### 安装和使用
1. 克隆仓库
```shell
git clone  https://github.com/joeseesun/mcp-prompt-server.git
```

2. 安装依赖
```shell
npm install
```
3. 启动服务器

```shell
npm start

```

OK 至此MCP 服务器就启动了. 接下来要 配置 Cursor 等编辑器. 以 **Trae** 为例.

MCP 配置 Json:

```json
{
  "mcpServers": {
    "prompt-server": {
      "command": "node",
      "args": [
        "/Users/pfinal/mcp/mcp-prompt-server/src/index.js"
      ],
    }
  }
}
```

使用如下所示:

![](https://raw.githubusercontent.com/pfinal-nc/iGallery/master/blog/202506051054992.png)

![](https://raw.githubusercontent.com/pfinal-nc/iGallery/master/blog/202506051058281.png)



###  改造 MCP Server 

由于 还是习惯性的 Alfred 中快速使用 Prompt 所以 我在 MCP Server 的代码进行了改造  代码如下所示:

```javascript
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import YAML from 'yaml';
import { z } from 'zod';
import express from 'express';
import http from 'http';
import { WebSocketServer } from 'ws';

// 获取当前文件的目录路径
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 预设prompts的目录路径
const PROMPTS_DIR = path.join(__dirname, 'prompts');

// 存储所有加载的prompts
let loadedPrompts = [];

/**
 * 从prompts目录加载所有预设的prompt
 */
async function loadPrompts() {
  try {
    // 确保prompts目录存在
    await fs.ensureDir(PROMPTS_DIR);
    
    // 读取prompts目录中的所有文件
    const files = await fs.readdir(PROMPTS_DIR);
    
    // 过滤出YAML和JSON文件
    const promptFiles = files.filter(file => 
      file.endsWith('.yaml') || file.endsWith('.yml') || file.endsWith('.json')
    );
    
    // 加载每个prompt文件
    const prompts = [];
    for (const file of promptFiles) {
      const filePath = path.join(PROMPTS_DIR, file);
      const content = await fs.readFile(filePath, 'utf8');
      
      let prompt;
      if (file.endsWith('.json')) {
        prompt = JSON.parse(content);
      } else {
        // 假设其他文件是YAML格式
        prompt = YAML.parse(content);
      }
      
      // 确保prompt有name字段
      if (!prompt.name) {
        console.warn(`Warning: Prompt in ${file} is missing a name field. Skipping.`);
        continue;
      }
      
      prompts.push(prompt);
    }
    
    loadedPrompts = prompts;
    console.log(`Loaded ${prompts.length} prompts from ${PROMPTS_DIR}`);
    return prompts;
  } catch (error) {
    console.error('Error loading prompts:', error);
    return [];
  }
}


// 创建WebSocket到Stdio的适配器
class WsToStdioAdapter {
  constructor(server) {
    console.log('WsToStdioAdapter: Initializing...'); 
    this.server = server;
    this.transport = new StdioServerTransport();
    this.pending = new Map();
    this.onmessage = null;
    this.onclose = null;
    this.onerror = null;
  }

  // 实现必要的传输接口方法
  async start() {
    console.log('WsToStdioAdapter: Starting transport');
    // 这个方法是必需的，但可以是空实现
  }

  async send(message) {
    console.log('WsToStdioAdapter: Sending message:', message);
    // 将消息发送到客户端
    return message;
  }

  async close() {
    console.log('WsToStdioAdapter: Closing transport');
    // 关闭传输
    if (this.onclose) {
      this.onclose();
    }
  }

  async handleMessage(message) {
    try {
      console.log('WsToStdioAdapter: Handling incoming WebSocket message:', message);
      let msgObj = typeof message === 'string' ? JSON.parse(message) : message;
      console.log('WsToStdioAdapter: Parsed message object:', msgObj);
      
      // 如果有onmessage处理函数，调用它
      if (this.onmessage) {
        this.onmessage(msgObj);
      }
      
      // 处理消息并返回响应
      // 这里应该调用实际的MCP处理逻辑
      return {
        jsonrpc: '2.0',
        result: {
          content: [
            {
              type: 'text',
              text: `处理了请求: ${msgObj.name}`
            }
          ]
        },
        id: msgObj.id
      };
    } catch (error) {
      console.error('WsToStdioAdapter: Error handling message:', error);
      if (this.onerror) {
        this.onerror(error);
      }
      return {
        jsonrpc: '2.0',
        error: {
          code: -32000,
          message: error.message
        },
        id: message.id
      };
    }
  }
}

/**
 * 启动MCP服务器
 */
async function startServer() {
  // 加载所有预设的prompts
  await loadPrompts();
  
  // 创建MCP服务器
  const server = new McpServer({
    name: "mcp-prompt-server",
    version: "1.0.0"
  });
  
  // 为每个预设的prompt创建一个工具
  loadedPrompts.forEach(prompt => {
    // 构建工具的输入schema
    const schemaObj = {};
    
    if (prompt.arguments && Array.isArray(prompt.arguments)) {
      prompt.arguments.forEach(arg => {
        // 默认所有参数都是字符串类型
        schemaObj[arg.name] = z.string().describe(arg.description || `参数: ${arg.name}`);
      });
    }
    
    // 注册工具
    server.tool(
      prompt.name,
      schemaObj,
      async (args) => {
        // 处理prompt内容
        let promptText = '';
        
        if (prompt.messages && Array.isArray(prompt.messages)) {
          // 只处理用户消息
          const userMessages = prompt.messages.filter(msg => msg.role === 'user');
          
          for (const message of userMessages) {
            if (message.content && typeof message.content.text === 'string') {
              let text = message.content.text;
              
              // 替换所有 {{arg}} 格式的参数
              for (const [key, value] of Object.entries(args)) {
                text = text.replace(new RegExp(`{{${key}}}`, 'g'), value);
              }
              
              promptText += text + '\n\n';
            }
          }
        }
        
        // 返回处理后的prompt内容
        return {
          content: [
            {
              type: "text",
              text: promptText.trim()
            }
          ]
        };
      },
      {
        description: prompt.description || `Prompt: ${prompt.name}`
      }
    );
  });
  
  // 添加管理工具 - 重新加载prompts
  server.tool(
    "reload_prompts",
    {},
    async () => {
      await loadPrompts();
      return {
        content: [
          {
            type: "text",
            text: `成功重新加载了 ${loadedPrompts.length} 个prompts。`
          }
        ]
      };
    },
    {
      description: "重新加载所有预设的prompts"
    }
  );
  
  // 添加管理工具 - 获取prompt名称列表
  server.tool(
    "get_prompt_names",
    {},
    async () => {
      const promptNames = loadedPrompts.map(p => p.name);
      return {
        content: [
          {
            type: "text",
            text: `可用的prompts (${promptNames.length}):\n${promptNames.join('\n')}`
          }
        ]
      };
    },
    {
      description: "获取所有可用的prompt名称"
    }
  );
  
  // 创建stdio传输层
  // stdio 模式
  if (process.env.MCP_MODE === 'stdio' || !process.env.MCP_MODE) {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.log('MCP Prompt Server running in stdio mode...');
  }
  // WebSocket 模式
  if (process.env.MCP_MODE === 'ws' || process.env.MCP_MODE === 'both') {
    console.log('Starting WebSocket server mode...');
    const app = express();
    const httpServer = http.createServer(app);
    const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
    
    wss.on('connection', (socket) => {
      console.log('New WebSocket connection established');
      
      // 处理接收到的消息
      socket.on('message', async (data) => {
        try {
          const message = JSON.parse(data.toString());
          // console.log('Received WebSocket message:', message);
          
          // 直接处理请求并发送响应
          if (message.name === 'get_prompt_names') {
            const promptNames = loadedPrompts.map(p => p.name);
            const response = {
              jsonrpc: '2.0',
              result: {
                content: [
                  {
                    type: 'text',
                    text: `可用的prompts (${promptNames.length}):\n${promptNames.join('\n')}`
                  }
                ]
              },
              id: message.id
            };
            // console.log('Sending response:', response);
            socket.send(JSON.stringify(response));
          } else {
            // 查找对应的prompt
            const promptName = message.name;
            const prompt = loadedPrompts.find(p => p.name === promptName);
            
            if (!prompt) {
              // 如果找不到对应的prompt，返回错误
              const errorResponse = {
                jsonrpc: '2.0',
                error: {
                  code: -32601,
                  message: `未找到名为 "${promptName}" 的prompt`
                },
                id: message.id
              };
              socket.send(JSON.stringify(errorResponse));
              return;
            }
            
            try {
              // 处理prompt内容
              let promptText = '';
              
              if (prompt.messages && Array.isArray(prompt.messages)) {
                // 只处理用户消息
                const userMessages = prompt.messages.filter(msg => msg.role === 'user');
                
                for (const userMsg of userMessages) {
                  if (userMsg.content && typeof userMsg.content.text === 'string') {
                    let text = userMsg.content.text;
                    
                    // 替换所有 {{arg}} 格式的参数
                    for (const [key, value] of Object.entries(message.arguments || {})) {
                      text = text.replace(new RegExp(`{{${key}}}`, 'g'), value);
                    }
                    
                    promptText += text + '\n\n';
                  }
                }
              }
              
              // 返回处理后的prompt内容
              const response = {
                jsonrpc: '2.0',
                result: {
                  content: [
                    {
                      type: "text",
                      text: promptText.trim()
                    }
                  ]
                },
                id: message.id
              };
              // console.log('Sending prompt response:', response);
              socket.send(JSON.stringify(response));
            } catch (error) {
              console.error('Error processing prompt:', error);
              const errorResponse = {
                jsonrpc: '2.0',
                error: {
                  code: -32000,
                  message: `处理prompt时出错: ${error.message}`
                },
                id: message.id
              };
              socket.send(JSON.stringify(errorResponse));
            }
          }
        } catch (error) {
          console.error('Error processing WebSocket message:', error);
          socket.send(JSON.stringify({
            jsonrpc: '2.0',
            error: {
              code: -32700,
              message: 'Parse error: ' + error.message
            }
          }));
        }
      });

      socket.on('error', (error) => {
        console.error('WebSocket error:', error);
      });

      socket.on('close', () => {
        console.log('WebSocket connection closed');
      });
    });

    httpServer.listen(5050, () => {
      console.log('MCP Prompt Server running in WebSocket mode on port 5050...');
    });
  }
}

// 启动服务器
startServer().catch(error => {
  console.error('Failed to start server:', error);
  process.exit(1);
});

```

让整个 **Server ** 不仅仅支持 Stdio 模式 还支持 WebSocket 模式. 这样 就可以在 **Trae** 中 同时使用这两种模式了.

于是启动变成了:

```shell
MCP_MODE=both node start

```

然后 使用 Python 写了一个 **Client** 代码如下:

```python
#!/usr/bin/env python3
import websocket
import json
import time
import threading
import sys
import os
import argparse
from urllib.parse import quote

# 全局变量存储结果
result_text = ""
error_text = ""
connection_closed = threading.Event()

# Prompt参数配置
PROMPT_CONFIGS = {
    "api_documentation": {
        "description": "生成API文档",
        "params": [
            {"name": "language", "type": "text", "required": True, "default": "python", "description": "编程语言"},
            {"name": "code", "type": "text", "required": True, "default": "def example():\n    pass", "description": "要生成文档的代码"},
            {"name": "format", "type": "text", "required": True, "default": "markdown", "description": "文档格式"}
        ]
    },
    "code_review": {
        "description": "代码审查",
        "params": [
            {"name": "language", "type": "text", "required": True, "default": "python", "description": "编程语言"},
            {"name": "code", "type": "text", "required": True, "default": "def example():\n    pass", "description": "要审查的代码"}
        ]
    },
    "project_architecture": {
        "description": "项目架构设计",
        "params": [
            {"name": "project_type", "type": "text", "required": True, "default": "Web应用", "description": "项目类型"},
            {"name": "technologies", "type": "text", "required": True, "default": "PHP", "description": "技术栈"},
            {"name": "features", "type": "text", "required": True, "default": "博客系统，用户管理，内容管理", "description": "主要功能"}
        ]
    },
    "test_case_generator": {
        "description": "测试用例生成",
        "params": [
            {"name": "language", "type": "text", "required": True, "default": "python", "description": "编程语言"},
            {"name": "code", "type": "text", "required": True, "default": "def example():\n    pass", "description": "要测试的代码"},
            {"name": "test_framework", "type": "text", "required": True, "default": "pytest", "description": "测试框架"}
        ]
    },
    "writing_assistant": {
        "description": "写作助手",
        "params": [
            {"name": "draft", "type": "text", "required": True, "default": "这是一篇草稿...", "description": "草稿内容"},
            {"name": "platform", "type": "text", "required": False, "default": "公众号", "description": "目标平台"}
        ]
    },
    "prompt_template_generator": {
        "description": "生成新的prompt模板",
        "params": [
            {"name": "prompt_name", "type": "text", "required": True, "default": "my_prompt", "description": "新prompt的名称"},
            {"name": "prompt_description", "type": "text", "required": True, "default": "这是一个新的prompt", "description": "prompt描述"},
            {"name": "task_type", "type": "text", "required": True, "default": "代码生成", "description": "任务类型"}
        ]
    },
    "code_refactoring": {
        "description": "代码重构",
        "params": [
            {"name": "language", "type": "text", "required": True, "default": "python", "description": "编程语言"},
            {"name": "code", "type": "text", "required": True, "default": "def example():\n    pass", "description": "要重构的代码"},
            {"name": "focus_areas", "type": "text", "required": False, "default": "可读性，性能", "description": "重点关注的重构领域"}
        ]
    },
    "build_mcp_server": {
        "description": "创建MCP服务器",
        "params": []
    }
}

def on_message(ws, message):
    global result_text, error_text
    # 尝试解析JSON响应
    try:
        response = json.loads(message)

        # 检查是否有结果内容
        if 'result' in response and 'content' in response['result']:
            for item in response['result']['content']:
                if item['type'] == 'text':
                    result_text = item['text']
        elif 'error' in response:
            error_text = response['error']['message']
    except Exception as e:
        error_text = f"解析响应时出错: {e}"

    # 标记连接已关闭，可以继续处理
    connection_closed.set()
    ws.close()

def on_error(ws, error):
    global error_text
    error_text = f"发生错误: {error}"
    connection_closed.set()
    ws.close()

def on_close(ws, close_status_code, close_msg):
    connection_closed.set()

def on_open(ws, prompt_name, args):
    def run():
        # 构建请求
        request = {
            "jsonrpc": "2.0",
            "name": prompt_name,
            "arguments": args,
            "id": str(int(time.time() * 1000))
        }

        ws.send(json.dumps(request))

    # 在新线程中运行，避免阻塞
    threading.Thread(target=run).start()

def get_available_prompts(query=""):
    """获取所有可用的prompts，用于Alfred工作流展示"""
    global result_text, error_text
    connection_closed.clear()
    result_text = ""
    error_text = ""

    # 禁用详细日志
    websocket.enableTrace(False)

    ws_url = "ws://localhost:5050/ws"
    ws = websocket.WebSocketApp(ws_url,
                              on_open=lambda ws: on_open(ws, "get_prompt_names", {}),
                              on_message=on_message,
                              on_error=on_error,
                              on_close=on_close)

    # 启动WebSocket连接
    wst = threading.Thread(target=ws.run_forever)
    wst.daemon = True
    wst.start()

    # 等待连接关闭或超时
    connection_closed.wait(timeout=5)

    if error_text:
        return {"items": [{"title": "错误", "subtitle": error_text}]}

    if not result_text:
        return {"items": [{"title": "未收到响应", "subtitle": "服务器未返回任何结果"}]}

    # 解析prompts列表
    prompts = [p for p in result_text.split('\n') if p and not p.startswith('可用的prompts')]

    # 过滤prompts（如果有查询）
    if query:
        prompts = [p for p in prompts if query.lower() in p.lower()]

    # 构建Alfred输出b'nu
    items = []
    for prompt in prompts:
        description = PROMPT_CONFIGS.get(prompt, {}).get("description", "")
        items.append({
            "title": prompt,
            "subtitle": description or f"使用 {prompt} prompt",
            "arg": prompt,
            "variables": {
                "prompt": prompt
            }
        })

    return {"items": items}

def get_prompt_args(prompt_name):
    """获取指定prompt的参数配置，用于Alfred工作流界面展示"""
    # 检查prompt是否存在
    if prompt_name not in PROMPT_CONFIGS:
        return {"items": [{"title": "未知的Prompt", "subtitle": f"找不到 {prompt_name} 的配置"}]}

    # 获取参数配置
    config = PROMPT_CONFIGS[prompt_name]
    params = config.get("params", [])

    if not params:
        # 如果没有参数，直接返回执行选项
        return {
            "items": [{
                "title": f"执行 {prompt_name}",
                "subtitle": "没有需要配置的参数",
                "arg": json.dumps({}),
                "variables": {
                    "args": json.dumps({}),
                    "alfredworkflow": "execute_prompt"
                }
            }]
        }

    # 构建参数输入界面
    items = []
    for param in params:
        items.append({
            "title": param["name"],
            "subtitle": f"{param['description']} ({param['default'] if 'default' in param else '无默认值'})",
            "arg": param["name"],
            "variables": {
                "current_param": param["name"],
                "prompt": prompt_name,
                "alfredworkflow": "input_param"
            }
        })

    # 添加执行选项
    args = {}
    for param in params:
        if "default" in param:
            args[param["name"]] = param["default"]

    items.append({
        "title": "使用默认值执行",
        "subtitle": f"使用默认参数执行 {prompt_name}",
        "arg": json.dumps(args),
        "variables": {
            "args": json.dumps(args),
            "alfredworkflow": "execute_prompt"
        }
    })

    return {"items": items}

def execute_prompt(prompt_name, args_json):
    """执行指定的prompt并返回结果，用于Alfred工作流处理"""
    global result_text, error_text
    connection_closed.clear()
    result_text = ""
    error_text = ""

    try:
        args = json.loads(args_json)
    except json.JSONDecodeError:
        return "参数格式错误：不是有效的JSON"

    # 禁用详细日志
    websocket.enableTrace(False)

    ws_url = "ws://localhost:5050/ws"
    ws = websocket.WebSocketApp(ws_url,
                              on_open=lambda ws: on_open(ws, prompt_name, args),
                              on_message=on_message,
                              on_error=on_error,
                              on_close=on_close)

    # 启动WebSocket连接
    wst = threading.Thread(target=ws.run_forever)
    wst.daemon = True
    wst.start()

    # 等待连接关闭或超时
    connection_closed.wait(timeout=10)

    if error_text:
        return error_text

    return result_text

def main():
    parser = argparse.ArgumentParser(description='Alfred Workflow for MCP Prompt Server')
    parser.add_argument('--list', action='store_true', help='List all available prompts')
    parser.add_argument('--prompt-args', type=str, help='Get arguments for a prompt')
    parser.add_argument('--execute', action='store_true', help='Execute a prompt')
    parser.add_argument('--prompt', type=str, help='Prompt name to execute')
    parser.add_argument('--args', type=str, help='JSON string of arguments for the prompt')
    parser.add_argument('--query', type=str, help='Query string for Alfred')

    args = parser.parse_args()

    # 如果是列出所有prompts
    if args.list:
        result = get_available_prompts (args.query or "")
        print(json.dumps(result))
        return

    # 如果是执行特定prompt (不再使用prompt-args参数)
    if args.prompt:
        # 获取默认参数
        default_args = {}
        if args.prompt in PROMPT_CONFIGS:
            params = PROMPT_CONFIGS[args.prompt].get("params", [])
            for param in params:
                if "default" in param:
                    default_args[param["name"]] = param["default"]

        # 使用提供的参数或默认参数
        args_to_use = args.args if args.args else json.dumps(default_args)
        result = execute_prompt(args.prompt, args_to_use)

        # 返回结果
        if result:
            print(result)
        else:
            print("服务器未返回任何结果")
        return result

    # 如果是查询
    if args.query is not None:
        result = get_available_prompts(args.query)
        print(json.dumps(result))
        return

    # 默认行为：列出所有prompts
    result = get_available_prompts("")
    print(json.dumps(result))



if __name__ == "__main__":
    main()

```

接下来 编排一下 Alfred 的工作流:

![](https://raw.githubusercontent.com/pfinal-nc/iGallery/master/blog/202506051111514.png)


触发关键词: `mpl` 就会看到所有的可用的 Prompt 了:

![](https://raw.githubusercontent.com/pfinal-nc/iGallery/master/blog/202506051112149.png)

点击 某个 Prompt 就会看到这个 Prompt 就能把 Prompt 生成的内容 复制到剪切板中了:
如下图所示的提示语:

```

请为以下项目设计一个合理的架构和目录结构：

项目类型：Web应用
技术栈：Python
框架：Flask
数据库：MySQL
前端框架：Vue.js
主要功能：博客系统，用户管理，内容管理

请提供：
1. 完整的目录结构
2. 主要组件/模块的划分
3. 数据流设计
4. 各组件之间的交互方式
5. 开发和部署建议

请确保架构设计遵循最佳实践，具有良好的可扩展性、可维护性和性能。

```

这里有个小小的问题 就是 `提示语` 中的参数 是可以自定义的. 但是 我现在还没有实现这个功能. 所以 这个功能 还需要 后面再实现.
