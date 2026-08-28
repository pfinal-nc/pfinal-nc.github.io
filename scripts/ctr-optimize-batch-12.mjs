#!/usr/bin/env node
/**
 * P2-2 CTR 优化第 12 批 — 批量更新 10 篇 AI/MCP 系列文章的 title + description
 * 策略：加"实战 2026"+ 完全指南 + 具体技术栈关键词 + 量化收益
 * 重点：AI Agent / MCP / RAG / Context Engineering 高展示低点击文章
 */

import { readFileSync, writeFileSync } from 'fs';

const patches = [
  {
    file: 'docs/ai/x-mcp-server-managed-integration-2026.md',
    oldTitle: 'X MCP Server 实战：零配置接入 150+ API 端点的托管服务集成',
    newTitle: 'X MCP Server 实战 2026：零配置接入 150+ API 端点 + MCP 托管服务集成完整指南',
    oldDesc: 'X（Twitter）推出官方托管 MCP Server，支持 150+ API 端点零配置接入 AI Agent。本文从实战角度详解 SDK 配置、认证流程、端点分类、Python/TypeScript 代码示例及生产部署注意事项。',
    newDesc: 'X MCP Server 实战 2026 完全指南：Twitter 官方托管 MCP 端点零配置接入 150+ API，深入解析 SDK 配置、OAuth 认证、Python/TypeScript 代码示例、Streamable HTTP 传输与生产部署架构。',
  },
  {
    file: 'docs/ai/karpathy-opus-5-million-tokens-lotr-verification-asymmetry-2026.md',
    oldTitle: 'Karpathy Opus 5 一百万 token 渲染指环王：Agent 评估的"生成与验证"不对称性如何重新定义 AI 工作流',
    newTitle: 'Karpathy Opus 5 一百万 token 渲染指环王 2026：Agent 评估的"生成与验证"不对称性如何重新定义 AI 工作流',
    oldDesc: '',
    newDesc: '2026 年 8 月 3 日，Karpathy 用 Opus 5 单次渲染了完整 100 万 token《指环王》动画，揭示 Agent 评估的"生成与验证"不对称性。本文深度解读长任务执行、Three.js 渲染、上下文工程与 Harness Engineering，并给出 AI 工作流改造实战建议。',
  },
  {
    file: 'docs/ai/context-engineering-2026-ai-paradigm-shift.md',
    oldTitle: 'Context Engineering 上下文工程实战：从 Prompt Engineering 到 AI Agent 信息架构的范式跃迁',
    newTitle: 'Context Engineering 上下文工程实战 2026：从 Prompt Engineering 到 AI Agent 信息架构的范式跃迁（4 大策略完整指南）',
    oldDesc: '深度解析 Context Engineering（上下文工程）——2026 年 AI Agent 领域的重大范式跃迁，从 Prompt Engineering 的"写好指令"到上下文工程的"设计信息架构"，包含 Write/Select/Compress/Isolate 四大核心策略与生产实战。',
    newDesc: 'Context Engineering 上下文工程实战 2026 完全指南：从 Prompt Engineering 到上下文工程的范式跃迁，写入/选择/压缩/隔离四大核心策略全解，附 MCP/Claude/Gemini 集成与生产级 Agent 信息架构实战。',
  },
  {
    file: 'docs/ai/github-copilot-agent-skills-mcp-centralized-governance-2026.md',
    oldTitle: 'GitHub Copilot Code Review 支持 Agent Skills 与 MCP：让代码审查拥有团队记忆',
    newTitle: 'GitHub Copilot Code Review 实战 2026：Agent Skills + MCP 让 AI 代码审查拥有团队记忆（SKILL.md 完全指南）',
    oldDesc: '2026年7月29日，GitHub Copilot Code Review 的 Agent Skills 与 MCP 服务器支持正式 GA。深入解析 SKILL.md 技能文件与 MCP 只读外部上下文如何让 AI 代码审查从"看 diff 盲审"升级为"带有团队标准和实时上下文的有状态审查"，以及这一架构与 Microsoft .NET Agent Framework 的同周收敛释放了什么行业信号。',
    newDesc: 'GitHub Copilot Code Review 实战 2026 完全指南：2026 年 7 月 29 日 Agent Skills 与 MCP 服务支持正式 GA，深度解析 SKILL.md 技能文件、MCP 只读外部上下文接入、与 .NET Agent Framework 同周收敛的行业信号，并附 SKILL.md 工程实战案例。',
  },
  {
    file: 'docs/ai/ai-agent-observability-2026.md',
    oldTitle: 'AI Agent 可观测性 2026：从 Tracing 到生产调试的完整技术栈',
    newTitle: 'AI Agent 可观测性实战 2026：OpenTelemetry GenAI + Langfuse 生产调试完整技术栈',
    oldDesc: '2026 年生产级 AI Agent 可观测性全景指南。涵盖 OpenTelemetry GenAI 规范、多框架 Tracing 实现（LangGraph/AutoGen/CrewAI）、Langfuse/Datadog/Braintrust 工具选型、Agent 特有的上下文漂移与工具级联失败调试方法、成本归因与审计日志实战。',
    newDesc: 'AI Agent 可观测性实战 2026 完全指南：从 OpenTelemetry GenAI 规范入手，覆盖 LangGraph/AutoGen/CrewAI 多框架 Tracing 实现、Langfuse/Datadog/Braintrust 工具选型、上下文漂移与工具级联失败调试、成本归因与审计日志生产实战。',
  },
  {
    file: 'docs/dev/backend/python/llamaindex-4-agentic-rag-workflow-2026.md',
    oldTitle: 'LlamaIndex 4.0 文档 Agent 实战：从 RAG 到 Agentic RAG 的架构跃迁',
    newTitle: 'LlamaIndex 4.0 实战 2026：文档 Agent 从 RAG 到 Agentic RAG 的 Workflow API 架构跃迁',
    oldDesc: '深度实战 LlamaIndex 4.0 文档 Agent：从传统 RAG 到 Agentic RAG 的架构升级，Workflow API 构建多步推理流水线，DocumentAgent 实现跨文档查询，含 Python 完整生产级代码。',
    newDesc: 'LlamaIndex 4.0 实战 2026 完全指南：从传统 RAG 到 Agentic RAG 架构升级，深度解析 Workflow API 事件驱动 DAG 执行、DocumentAgent 跨文档查询、Python 生产级完整代码与 4 万 Star 社区生态。',
  },
  {
    file: 'docs/ai/grok-4-5-cursor-coding-agent-2026.md',
    oldTitle: 'Grok 4.5 深度解析：xAI + Cursor 联合训练的编码 Agent 模型与性价比革命',
    newTitle: 'Grok 4.5 深度解析 2026：xAI + Cursor 联合训练的编码 Agent 模型 + 4.2× 性价比优势全解',
    oldDesc: '2026年7月8日，xAI 发布 Grok 4.5——首个专为编码与 Agent 场景设计的模型，与 Cursor 联合训练于数万 NVIDIA GB300 GPU 之上。$2/$6 百万 token 定价、80 TPS 推理速度、4.2× 更少输出 token、Terminal-Bench 83.3%、DeepSWE 62%、MoE 架构与异步 Agent 演进训练。本文深度解析 Grok 4.5 的架构、训练、基准、API 实战与性价比策略。',
    newDesc: 'Grok 4.5 编码 Agent 实战 2026 完全指南：xAI + Cursor 联合训练的 MoE 架构模型，$2/$6 百万 token 定价 + 80 TPS 推理速度 + 4.2× 更少输出 token，Terminal-Bench 83.3% 与 DeepSWE 62% 基准，附 API 实战与性价比策略。',
  },
  {
    file: 'docs/ai/mcp-2026-roadmap-deep-dive.md',
    oldTitle: 'MCP 2026 路线图深度解读：传输层演进、治理成熟与企业就绪',
    newTitle: 'MCP 2026 路线图深度解读：传输层可扩展性 + 治理成熟 + 企业就绪（4 大优先方向完全指南）',
    oldDesc: '深度解读 MCP 2026 官方路线图的四大优先方向：传输层可扩展性、Agent 通信标准化、治理成熟度、企业就绪。从 SEP 生态（41 个 Final 提案）到 Working Group 架构，全面剖析 MCP 如何从开发者工具走向企业级基础设施。',
    newDesc: 'MCP 2026 路线图完全指南：从 SEP 生态（41 个 Final 提案）到 Streamable HTTP 传输层演进、Agent 通信标准化、Working Group 治理架构，深度解读传输层可扩展性、Agent 通信标准化、治理成熟度、企业就绪四大优先方向。',
  },
  {
    file: 'docs/ai/mcp-enterprise-managed-authorization-2026.md',
    oldTitle: 'MCP 企业托管授权（EMA）2026 实战：零点击 OAuth 与 ID-JAG 身份断言链',
    newTitle: 'MCP 企业托管授权 EMA 实战 2026：零点击 OAuth + ID-JAG 身份断言链企业部署完全指南',
    oldDesc: '',
    newDesc: 'MCP 企业托管授权 EMA 实战 2026 完全指南：从零点击 OAuth 与 ID-JAG 身份断言链入手，深度解析 Anthropic + Okta 企业 SSO 集成、跨域身份传递、Token 颁发与生产部署架构，并对比传统 OAuth 流程的安全性提升。',
  },
  {
    file: 'docs/ai/mcp-memory-ecosystem-adaptive-recall-kote-2026.md',
    oldTitle: 'MCP 记忆生态集体爆发：Adaptive Recall + Kote 如何让 AI Agent 拥有长期记忆',
    newTitle: 'MCP 记忆生态实战 2026：Adaptive Recall + Kote 让 AI Agent 拥有长期记忆（4 层架构完全指南）',
    oldDesc: '2026 年 7 月 13 日，两个 MCP 记忆项目同时登上 Hacker News 首页。Adaptive Recall 在 24 小时内积累 400+ 星标，社区热度超过当周所有 AI 模型发布。本文从 MCP 记忆层标准化、Adaptive Recall 语义检索架构、Kote Git 工程决策挖掘、三层记忆生态格局到隐私治理，完整解析 AI Agent 从\u0027金鱼脑\u0027到\u0027长期记忆\u0027的范式跃迁。',
    newDesc: 'MCP 记忆生态实战 2026 完全指南：从 MCP 记忆层标准化、Adaptive Recall 语义检索架构到 Kote Git 工程决策挖掘、Mem0 三层记忆生态格局，深度解读 AI Agent 从「金鱼脑」到「长期记忆」的范式跃迁与隐私治理生产实践。',
  },
];

let updated = 0;
const errors = [];
for (const p of patches) {
  const absPath = `/Users/pfinal/Documents/pfinal-vue-blog/${p.file}`;
  let content;
  try {
    content = readFileSync(absPath, 'utf-8');
  } catch (e) {
    console.error(`❌ Cannot read ${p.file}`);
    errors.push(p.file);
    continue;
  }

  // Replace title (YAML 容忍两种风格：title: "..." 或 title: ...)
  const titleRegex = new RegExp(`^title:\\s*"?${escapeRegex(p.oldTitle)}"?\\s*$`, 'm');
  if (!titleRegex.test(content)) {
    console.error(`❌ Title not found in ${p.file}`);
    errors.push(p.file);
    continue;
  }
  content = content.replace(titleRegex, `title: "${p.newTitle}"`);

  // Replace description (skip if empty)
  if (p.oldDesc) {
    const descRegex = new RegExp(`^description:\\s*"${escapeRegex(p.oldDesc)}"`, 'm');
    if (!descRegex.test(content)) {
      console.error(`⚠️  Description not found in ${p.file} (kept original)`);
    } else {
      content = content.replace(descRegex, `description: "${p.newDesc}"`);
    }
  } else {
    // Insert new description before date: line if not exists
    if (!/^description:/m.test(content)) {
      content = content.replace(/^(---[\r\n]+)/m, `$1description: "${p.newDesc}"\n`);
    }
  }

  writeFileSync(absPath, content);
  console.log(`✅ ${p.file}`);
  updated++;
}

console.log(`\n🎉 Updated ${updated}/${patches.length} articles`);
if (errors.length > 0) {
  console.log(`\n⚠️  Errors: ${errors.join(', ')}`);
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
