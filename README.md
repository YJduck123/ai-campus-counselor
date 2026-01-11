# 🎓 AI 校园百事通 (AI Campus Counselor)

> **你的 24 小时智能校园向导，基于 GLM-4 大模型与 RAG 检索增强技术。**

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Vue](https://img.shields.io/badge/Frontend-Vue.js_3-42b883.svg)
![Node](https://img.shields.io/badge/Backend-Node.js-339933.svg)
![GLM-4](https://img.shields.io/badge/AI-GLM--4-purple.svg)

## 📖 项目简介

**AI 校园百事通** 是一款专为高校师生打造的智能咨询助手。它摒弃了传统校园官网枯燥的搜索体验，采用由 **GLM-4** 驱动的生成式 AI，结合 **Firecrawl** 实时联网检索能力，为用户提供有温度、有逻辑、事实准确的校园生活指引。

无论是新生入学报到、奖学金申请流程，还是图书馆闭馆时间查询，**“小云”学姐** 都能通过流式对话，实时为你答疑解惑。

## ✨ 核心功能 (Key Features)

- **🧠 深度语义理解**：基于 **GLM-4** 大模型，能够理解复杂的口语化提问，识别用户意图。
- **🔍 实时 RAG 检索**：集成 **Firecrawl** 搜索引擎，实时抓取学校官网/教务处数据，确保回答的时效性和准确性（拒绝 AI 幻觉）。
- **⚡ 流式极速响应**：采用 **Server-Sent Events (SSE)** 技术，实现打字机式的流式回复，零等待交互体验。
- **🎨 Markdown 富文本渲染**：支持渲染列表、加粗、链接等格式，让复杂的办事流程（如“第一步、第二步...”）一目了然。
- **👩‍🏫 数字人形象交互**：集成数字人形象展示（静态/动态），配合呼吸动画，提供更有亲和力的交互界面。
- **💬 拟人化人设**：内置“热心学姐”系统人设，拒绝冷冰冰的机器回复，提供情绪价值与引导式回答。

## 🛠️ 技术栈 (Tech Stack)

### 前端 (Frontend)
- **Framework**: Vue 3 (Vite)
- **Styling**: CSS3 (Modern Flexbox/Grid), Responsive Design
- **Markdown**: `markdown-it` (实时渲染 AI 回复)
- **Communication**: Native `fetch` API (Stream Reader)

### 后端 (Backend)
- **Runtime**: Node.js
- **Server**: Express.js
- **AI Integration**: 智谱 AI (BigModel) API
- **Search Engine**: Firecrawl API (用于 RAG 上下文增强)

## 🚀 快速开始 (Quick Start)

### 环境要求
- Node.js >= 18.0.0
- npm 或 yarn

### 1. 克隆项目
```bash
git clone https://github.com/your-username/ai-campus-counselor.git
cd ai-campus-counselor
```

### 2. 后端配置与启动
进入后端目录，安装依赖并配置环境变量。

```bash
cd backend
npm install

# 创建 .env 文件并填入你的 API Key
# GLM_API_KEY=你的智谱API_Key
# FIRECRAWL_API_KEY=你的Firecrawl_Key (可选，用于搜索增强)
```

启动后端服务：
```bash
node server.js
# 服务将在 http://localhost:3000 启动
```

### 3. 前端启动
新建一个终端窗口，进入项目根目录启动前端。

```bash
# 回到项目根目录
cd .. 
npm install
npm run dev
# 访问 http://localhost:5173
```

## 💡 AI Prompt 设计 (System Persona)

为了让 AI 更像一位真实的学姐，我们精心设计了系统提示词（System Prompt）：

```markdown
你叫“小云”，是大学里的AI校园向导，也是一位热心、幽默且知识渊博的学长/学姐。
你的目标是帮助同学解决校园生活、学习、办事流程中的各种问题。

## 回复风格要求：
1. **亲切自然**：使用口语化的表达，适当使用 Emoji (🎓, 🏫, ✨) 增加亲和力。
2. **结构清晰**：对于复杂的办事流程（如入学报到），必须使用 Markdown 格式（列表、加粗）说明。
3. **循循善诱**：如果用户的问题比较模糊，引导性地询问具体方向。
4. **基于事实**：优先根据提供的 [RAG 上下文] 回答。
```

## 📂 目录结构

```
AI_Campus_Counselor/
├── backend/                # 后端服务
│   ├── server.js           # Express 服务器 & SSE 流式逻辑
│   ├── package.json
│   └── .env                # 配置文件 (API Keys)
├── src/                    # 前端源码
│   ├── views/
│   │   └── ChatInterface.vue # 核心聊天组件 (Markdown渲染/流式接收)
│   ├── App.vue             # 主布局
│   ├── main.js             # 入口文件
│   └── style.css           # 全局样式
├── index.html
├── package.json
└── README.md
```

## 🤝 贡献与支持

如果你觉得这个项目对你有帮助，欢迎给一个 ⭐️ Star！

如有问题，请提交 Issue 或联系开发者。

---
*Built with ❤️ by Claude Code & Vue.js*
