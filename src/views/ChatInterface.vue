<template>
  <div class="chat-container">
    <!-- Left Panel: Chat History -->
    <div class="chat-box">
      <div class="messages" ref="messagesContainer">
        <div v-for="(msg, index) in messages" :key="index" :class="['message', msg.role]">
          <div class="avatar" v-if="msg.role === 'assistant'">🎓</div>
          
          <!-- Render HTML if isHtml is true (Assistant), otherwise text (User) -->
          <div v-if="msg.isHtml" class="content" v-html="msg.content"></div>
          <div v-else class="content">{{ msg.content }}</div>
          
          <div class="avatar" v-if="msg.role === 'user'">👤</div>
        </div>
        <div v-if="isLoading" class="message assistant">
          <div class="avatar">🎓</div>
          <div class="content typing">正在思考...</div>
        </div>
      </div>
      
      <div class="input-area">
        <input 
          v-model="userInput" 
          @keyup.enter="sendMessage" 
          type="text" 
          placeholder="请输入你的问题，例如：如何申请奖学金？" 
          :disabled="isLoading"
        />
        <button @click="sendMessage" :disabled="isLoading || !userInput.trim()">发送</button>
      </div>
    </div>

    <!-- Right Panel: Info & Shortcuts -->
    <div class="info-panel">
      <section class="info-section">
        <h3>🔥 热门咨询</h3>
        <ul>
          <li v-for="item in hotTopics" :key="item" @click="userInput = item">{{ item }}</li>
        </ul>
      </section>

      <section class="info-section">
        <h3>📋 快速办事流程</h3>
        <ul>
          <li @click="userInput = '新生入学报到流程'">新生入学报到</li>
          <li @click="userInput = '如何补办学生证'">补办学生证</li>
          <li @click="userInput = '户口迁移办理指南'">户口迁移办理</li>
          <li @click="userInput = '学费缴纳方式说明'">学费缴纳方式</li>
        </ul>
      </section>
    </div>
  </div>
</template>

<script setup>
import { ref, nextTick } from 'vue'
import axios from 'axios'
import MarkdownIt from 'markdown-it'

const md = new MarkdownIt({
  html: false,
  linkify: true,
  typographer: true
})

const userInput = ref('')
const isLoading = ref(false)
const messagesContainer = ref(null)

const messages = ref([
  { 
    role: 'assistant', 
    content: md.render('你好！我是你的校园百事通 **小云** 🎓。\n有什么校园生活或学习上的问题，尽管问我吧！'),
    isHtml: true
  }
])

const hotTopics = [
  '新生入学流程是怎样的?',
  '图书馆几点闭馆?',
  '如何申请国家励志奖学金?',
  '校医院在什么位置?'
]

const sendMessage = async () => {
  if (!userInput.value.trim() || isLoading.value) return
  
  const text = userInput.value
  messages.value.push({ role: 'user', content: text, isHtml: false })
  userInput.value = ''
  isLoading.value = true
  
  scrollToBottom()

  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ message: text })
    })

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let rawContent = ''
    let assistantMessageIndex = -1
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) {
        // Process any remaining buffer
        if (buffer) {
           // Handle potential remaining data logic if necessary, 
           // but usually SSE ends with double newline so buffer might be empty or just newline
        }
        break
      }

      const chunk = decoder.decode(value, { stream: true })
      buffer += chunk
      
      const lines = buffer.split('\n')
      // Keep the last part in buffer as it might be incomplete
      buffer = lines.pop()
      
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.substring(6))
            
            if (data.type === 'text') {
              // If this is the first chunk, create the message bubble and hide loading
              if (assistantMessageIndex === -1) {
                isLoading.value = false
                assistantMessageIndex = messages.value.push({ 
                  role: 'assistant', 
                  content: '', 
                  isHtml: true 
                }) - 1
              }
              
              rawContent += data.content
              // Render Markdown in real-time
              messages.value[assistantMessageIndex].content = md.render(rawContent)
              scrollToBottom()
            } else if (data.type === 'done') {
              // Stream finished
              isLoading.value = false
            } else if (data.type === 'error') {
              console.error('Stream Error:', data.content)
            }
          } catch (e) {
            console.error('Error parsing SSE data:', e)
          }
        }
      }
    }
    
  } catch (error) {
    console.error('Fetch Error:', error)
    isLoading.value = false
    messages.value.push({ 
      role: 'assistant', 
      content: '抱歉，连接服务器失败。',
      isHtml: false
    })
  } finally {
    isLoading.value = false
    scrollToBottom()
  }
}

const scrollToBottom = () => {
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
    }
  })
}
</script>

<style scoped>
.chat-container {
  display: flex;
  gap: 20px;
  height: 100%; /* Ensure it takes full height of the parent */
  width: 100%;
}

.chat-box {
  flex: 2; /* Takes 2/3 of space */
  background: white;
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 4px 6px rgba(0,0,0,0.05);
  border: 1px solid #e1e4e8;
}

.messages {
  flex: 1;
  padding: 20px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 15px;
  background-color: #fafbfc;
}

.message {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  max-width: 85%;
}

.message.assistant {
  align-self: flex-start;
}

.message.user {
  align-self: flex-end;
  flex-direction: row-reverse;
}

.avatar {
  width: 40px;
  height: 40px;
  background: #eef2f5;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  flex-shrink: 0;
  border: 1px solid #e1e4e8;
}

.content {
  padding: 12px 16px;
  border-radius: 12px;
  line-height: 1.6;
  font-size: 0.95rem;
  box-shadow: 0 1px 2px rgba(0,0,0,0.05);
}

/* Markdown Styles inside content */
:deep(.content p) {
  margin: 0.5em 0;
}
:deep(.content p:first-child) {
  margin-top: 0;
}
:deep(.content p:last-child) {
  margin-bottom: 0;
}
:deep(.content ul), :deep(.content ol) {
  margin: 0.5em 0;
  padding-left: 1.2em;
}
:deep(.content li) {
  margin: 0.3em 0;
}
:deep(.content strong) {
  color: #2c3e50;
  font-weight: 700;
}
:deep(.content a) {
  color: #4a90e2;
  text-decoration: none;
}
:deep(.content a:hover) {
  text-decoration: underline;
}

.message.assistant .content {
  background: #ffffff;
  color: #333;
  border-top-left-radius: 2px;
  border: 1px solid #e1e4e8;
}

.message.user .content {
  background: #4a90e2;
  color: white;
  border-top-right-radius: 2px;
}

.input-area {
  padding: 20px;
  background: white;
  border-top: 1px solid #e1e4e8;
  display: flex;
  gap: 12px;
  align-items: center;
}

input {
  flex: 1;
  padding: 12px 16px;
  border: 1px solid #ddd;
  border-radius: 24px;
  outline: none;
  font-size: 1rem;
  transition: border-color 0.2s;
}

input:focus {
  border-color: #4a90e2;
  box-shadow: 0 0 0 2px rgba(74, 144, 226, 0.1);
}

button {
  padding: 10px 24px;
  background: #4a90e2;
  color: white;
  border: none;
  border-radius: 24px;
  cursor: pointer;
  font-weight: 600;
  transition: background 0.2s, transform 0.1s;
}

button:disabled {
  background: #ccc;
  cursor: not-allowed;
}

button:hover:not(:disabled) {
  background: #357abd;
}

button:active:not(:disabled) {
  transform: scale(0.98);
}

.info-panel {
  flex: 1;
  background: white;
  border-radius: 12px;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 30px;
  box-shadow: 0 4px 6px rgba(0,0,0,0.05);
  border: 1px solid #e1e4e8;
  overflow-y: auto;
}

.info-section h3 {
  margin-top: 0;
  margin-bottom: 15px;
  color: #333;
  font-size: 1.1rem;
  padding-bottom: 10px;
  border-bottom: 2px solid #f0f2f5;
  display: flex;
  align-items: center;
}

.info-section ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.info-section li {
  padding: 10px 12px;
  border-bottom: 1px solid #f8f9fa;
  cursor: pointer;
  color: #555;
  transition: all 0.2s;
  border-radius: 6px;
  font-size: 0.95rem;
}

.info-section li:hover {
  color: #4a90e2;
  background-color: #f0f7ff;
  padding-left: 18px;
}
</style>
