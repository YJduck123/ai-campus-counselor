# 🎓 AI 校园百事通 (AI Campus Counselor)

> **新一代 AI 导师：一个会陪你学习、练习与成长的数字人老师。**
> **参赛赛道：AI 实时交互教育 —— 把学习从“看内容”升级为“实时对话与陪练”。**

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Vue](https://img.shields.io/badge/Frontend-Vue.js_3-42b883.svg)
![Node](https://img.shields.io/badge/Backend-Node.js-339933.svg)
![GLM-4](https://img.shields.io/badge/AI-GLM--4-purple.svg)
![Digital Human](https://img.shields.io/badge/Avatar-Xmov_SDK-orange.svg)

## 📖 项目简介

**AI 校园百事通** 是一款集“校园导览”与“AI 导师陪练”于一体的智能教育终端。基于 **GLM-4** 大模型、**星云 (Xmov) 3D 数字人技术** 以及 **RAG 检索增强技术**，它不仅能回答校园琐事，更能化身为专业的 AI 导师，在多种教育场景下为学生提供 1 对 1 的交互式陪练。

核心理念：**星云让 AI 拥有“老师的身体与对话能力”，把教育从单纯的知识传递升级为“实时对话、引导思考、反馈评测”的闭环体验。**

## ✨ 核心功能 (Key Features)

- **🎓 全场景 AI 导师陪练 (Tutor Mode)**
    - **面试模拟**：支持学生会招新、名企求职面试模拟，AI 主动提问并控场。
    - **实时评测反馈**：每一轮回答后，AI 都会给出【评测建议】，指出优点与不足，并引导下一步思考。
    - **定制化教学**：支持英语口语对练、学科知识考核、择业顾问等多种教育培训场景。
- **👤 3D 数字人多模态交互**
    - **音画同步**：集成 3D 数字人 SDK，实现实时语音播报 (TTS) 与嘴型同步驱动。
    - **情绪交互**：数字人具备倾听、思考、互动等多种动态，提供沉浸式的陪伴学习感。
- **🔍 智能校园咨询 (RAG Guide)**
    - **事实准确**：集成 Firecrawl 实时联网检索，确保校园政策、流程回答的准确性。
    - **温暖人设**：内置“热心学姐小云”人设，提供有温度的交互体验。
- **🧠 深度语义记忆**
    - 支持完整的上下文对话记忆，实现多轮连续的教学引导与深度交流。

## 🛠️ 技术栈 (Tech Stack)

- **AI 核心**: 智谱 AI (GLM-4) —— 驱动逻辑推理与导师人设。
- **数字人**: 星云 (Xmov) SDK —— 提供 3D 渲染与实时语音同步。
- **检索增强**: Firecrawl API —— 实时获取校园公网知识。
- **前端**: Vue 3 + Vite —— 响应式交互界面。
- **后端**: Node.js (Express) —— 流式 (SSE) 响应处理与历史记录维护。

## 🚀 演示指引 (Demo Workflow)

1. **校园咨询展示**：点击“新生入学流程”，展示 AI 结合实时搜索给出的结构化指引与数字人回复。
2. **AI 导师展示**：点击 **“🎓 开启 AI 导师陪练”**。
    - **场景 A (面试)**：告诉 AI“我想练习面试”，进入 1 对 1 面试实战与实时点评。
    - **场景 B (口语)**：告诉 AI“我想练习英语口语”，进入双语教学模式。
3. **评测报告**：完成练习后，AI 会生成一份【综合素质评估报告】，涵盖评分与改进建议。

---
*Built for the AI Real-time Interactive Education Competition.*
*Built with ❤️ by Claude Code & Vue.js*