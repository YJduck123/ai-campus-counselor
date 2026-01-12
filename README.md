# 🎓 AI 校园百事通 (AI Campus Counselor)

> **新一代 AI 导师：一个会陪你学习、练习与成长的数字人老师。**
> 
> 🏆 **参赛赛道**：AI 实时交互教育 —— 把学习从“看内容”升级为“实时对话与陪练”。

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Vue](https://img.shields.io/badge/Frontend-Vue.js_3-42b883.svg)
![Node](https://img.shields.io/badge/Backend-Node.js-339933.svg)
![GLM-4](https://img.shields.io/badge/AI-GLM--4-purple.svg)
![Digital Human](https://img.shields.io/badge/Avatar-Xmov_SDK-orange.svg)

## 📖 项目简介 (Introduction)

**AI 校园百事通** 是一款专为高校场景打造的智能教育与服务终端。区别于传统的 FAQ 列表或纯文本聊天机器人，本项目深度融合了 **GLM-4 大模型**、**星云 (Xmov) 3D 数字人** 与 **RAG 检索增强技术**，旨在为学生提供一个“有身体、有温度、有智慧”的 **AI 伴学导师**。

它不仅能作为**“百事通”**解答校园生活琐事（如办事流程、奖学金申请），更能化身为**“专业导师”**，在面试模拟、口语陪练、学科考核等场景下，提供沉浸式的 **1 对 1 实时陪练与评测反馈**，真正实现“教-练-评”的教育闭环。

## 🛠️ 技术栈 (Tech Stack)

### 前端 (Frontend)
- **Framework**: Vue 3 + Vite
- **Styling**: Modern CSS3 (Flexbox/Grid), Responsive Design
- **Markdown**: `markdown-it` (实时流式渲染)
- **Digital Human**: Xmov Embodied Driver SDK (3D 数字人驱动)

### 后端 (Backend)
- **Runtime**: Node.js
- **Server**: Express.js
- **Communication**: Server-Sent Events (SSE) 流式传输
- **AI Core**: 智谱 AI (GLM-4)
- **Search Engine**: Firecrawl API (实时联网检索)

## 📂 项目结构 (Project Structure)

```
AI_Campus_Counselor/
├── backend/                # 后端服务
│   ├── server.js           # 核心业务逻辑 (AI 接口代理、流式处理、RAG 检索)
│   ├── package.json
│   └── .env                # 配置文件 (API Keys)
├── src/                    # 前端源码
│   ├── views/
│   │   └── ChatInterface.vue # 核心交互组件 (数字人容器、聊天逻辑、语音队列)
│   ├── App.vue             # 主布局
│   ├── main.js             # 入口文件
│   └── style.css           # 全局样式
├── index.html              # HTML 入口 (包含 Xmov SDK 引用)
├── package.json
└── README.md
```

## 🚀 快速开始 (Quick Start)

### 1. 环境准备
确保您的本地环境已安装：
- Node.js >= 18.0.0
- npm 或 yarn

### 2. 克隆项目
```bash
git clone https://github.com/YJduck123/ai-campus-counselor.git
cd ai-campus-counselor
```

### 3. 后端配置与启动
进入后端目录，安装依赖并配置环境变量。

```bash
cd backend
npm install
```

创建 `.env` 文件并填入必要的 API Key：
```env
# 智谱 AI (必填，用于核心对话逻辑)
GLM_API_KEY=your_glm_api_key_here

# 魔珐星云数字人 (Xmov)
XMOV_APP_ID=your_xmov_app_id_here
XMOV_APP_SECRET=your_xmov_app_secret_here

# Firecrawl (选填，用于校园知识联网搜索)
FIRECRAWL_API_KEY=your_firecrawl_api_key_here

# 端口配置
PORT=3000
```

启动后端服务：
```bash
npm run dev
# 服务将在 http://localhost:3000 启动
```

### 4. 前端启动
新建一个终端窗口，回到项目根目录启动前端。

```bash
# 回到根目录
cd ..
npm install
npm run dev
# 访问 http://localhost:5173 即可体验
```

## ✨ 核心功能 (Core Features)

### 1. 🎓 全场景 AI 导师陪练 (All-Scenario AI Tutor)
这是本项目的核心教育功能，点击 **“开启 AI 导师陪练”** 即可触发。
- **面试模拟**：支持学生会招新、大厂求职等场景。AI 会主动提问、追问，并根据 STAR 法则评估用户的回答。
- **实时评测反馈**：区别于普通聊天，AI 导师在每一轮对话中都会先给出 **【评测建议】**，指出语法错误、逻辑漏洞或表达亮点，再进行下一轮引导。
- **口语/学科陪练**：支持英语口语对练（纠正发音与语法）及特定学科知识点考核。

### 2. 🔍 智能校园咨询 (Campus Guide RAG)
- **实时联网**：集成 Firecrawl，能实时抓取学校官网的最新通知和公示（如“2025年奖学金评选细则”），拒绝过时信息。
- **结构化输出**：针对复杂的办事流程（如新生报到、户口迁移），AI 会自动整理为清晰的 Markdown 列表。

### 3. 👤 3D 数字人多模态交互 (Multimodal Avatar)
- **音画同步**：前端集成 TTS 与 3D 渲染，AI 的文字回复会实时转化为语音，并驱动数字人嘴型，实现“面对面”交流感。
- **状态切换**：数字人具备“倾听”、“思考”、“讲解”等多种状态，配合呼吸动画，极大地增强了陪伴感。

## 💡 AI Prompt 设计 (System Persona)

我们为 AI 设计了动态切换的 System Prompt，使其能根据用户需求在“学姐”与“导师”之间无缝切换：

```javascript
// 模式 1：校园咨询 (默认)
// 风格：亲切、幽默、使用 Emoji
"你叫“小云”，是大学里的AI校园向导..."

// 模式 2：AI 导师陪练 (触发关键词："开始面试"、"练习")
// 风格：专业、引导性强、包含评测环节
"作为一名专业的“AI 导师”，根据用户指定的场景进行 1 对 1 的模拟练习..."
"用户回答后，必须先给出【评测建议】...然后抛出下一个问题..."
```

## 🔌 API 接口 (API Reference)

### 对话接口
- **Endpoint**: `POST /api/chat`
- **Content-Type**: `application/json`
- **Body**:
  ```json
  {
    "message": "用户输入的内容",
    "history": [
      {"role": "user", "content": "..."},
      {"role": "assistant", "content": "..."}
    ]
  }
  ```
- **Response**: `text/event-stream` (SSE 流式响应)

## ❓ 常见问题 (FAQ)

**Q: 数字人为什么没有声音？**
A: 浏览器通常限制自动播放音频。请先点击页面上的任意按钮（如“开启 AI 导师陪练”），与页面产生交互后，语音功能即可正常工作。

**Q: 为什么显示“数字人初始化中”？**
A: 数字人资源加载需要一定时间（取决于网速），通常在 5-10 秒内完成。如果长时间无反应，请检查控制台是否有网络报错。

## 📄 开源协议 (License)

本项目采用 [MIT License](LICENSE) 开源协议。

## 🙏 致谢 (Acknowledgements)

- **Xmov (星云)**: 提供强大的 3D 数字人 SDK 支持。
- **Zhipu AI (智谱)**: 提供 GLM-4 大模型 API 支持。
- **Firecrawl**: 提供高效的 Web 搜索与抓取能力。

---
*Built with ❤️ by Claude Code & Vue.js*
