<template>
  <div class="chat-box">
    <div class="messages" ref="messagesContainer">
      <div v-for="(msg, index) in messages" :key="index" :class="['message', msg.role]">
        <template v-if="msg.role === 'assistant'">
          <div class="avatar">🎓</div>
          <div class="message-wrapper">
            <!-- Agent 类型标签 -->
            <div v-if="msg.agent" class="agent-badge" :class="msg.agent.type">
              <span class="agent-icon">{{ getAgentIcon(msg.agent.type) }}</span>
              <span class="agent-name">{{ getAgentName(msg.agent.type) }}</span>
              <span class="agent-confidence" v-if="msg.agent.confidence">
                {{ Math.round(msg.agent.confidence * 100) }}%
              </span>
            </div>
            <!-- RAG 来源展示 -->
            <div v-if="msg.sources && msg.sources.length > 0" class="rag-sources">
              <span class="sources-icon">📚</span>
              <span class="sources-label">知识库检索：</span>
              <span class="sources-list">
                {{ msg.sources.map(s => s.question || s.title || s.id).slice(0, 3).join('、') }}
              </span>
            </div>
            <!-- Multi-Agent Trace（可选，用于评审/调试） -->
            <details v-if="msg.trace && msg.trace.length > 0" class="agent-trace">
              <summary>多 Agent 推理过程</summary>
              <div class="trace-list">
                <div v-for="(t, ti) in msg.trace" :key="ti" class="trace-item">
                  <div class="trace-step">{{ t.step }}</div>
                  <pre class="trace-content">{{ t.content }}</pre>
                </div>
              </div>
            </details>
            <div class="content" v-html="msg.content"></div>
          </div>
        </template>
        <template v-else>
          <div class="content">{{ msg.content }}</div>
          <div class="avatar">👤</div>
        </template>
      </div>
      <div v-if="isLoading" class="message assistant">
        <div class="avatar">🎓</div>
        <div class="content typing">正在思考...</div>
      </div>
    </div>

    <div class="input-area">
      <input
        v-model="inputText"
        @keyup.enter="handleSend"
        type="text"
        placeholder="请输入你的问题，例如：如何申请奖学金？"
        :disabled="isLoading"
      />
      <button @click="handleSend" :disabled="isLoading || !inputText.trim()">发送</button>
    </div>
  </div>
</template>

<script setup>
import { ref, nextTick } from 'vue'

const props = defineProps({
  messages: { type: Array, required: true },
  isLoading: { type: Boolean, default: false }
})

const emit = defineEmits(['send'])

const inputText = ref('')
const messagesContainer = ref(null)

// Agent 图标映射
const getAgentIcon = (type) => {
  const icons = {
    knowledge: '🎓',
    tutor: '📝',
    general: '💬'
  }
  return icons[type] || '🤖'
}

// Agent 名称映射
const getAgentName = (type) => {
  const names = {
    knowledge: 'RAG 知识助手',
    tutor: '陪练导师',
    general: '闲聊模式'
  }
  return names[type] || 'AI 助手'
}

const handleSend = () => {
  if (!inputText.value.trim() || props.isLoading) return
  emit('send', inputText.value)
  inputText.value = ''
}

// 滚动到底部
const scrollToBottom = () => {
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
    }
  })
}

// 设置输入并发送
const setInputAndSend = (text) => {
  inputText.value = text
  handleSend()
}

defineExpose({ scrollToBottom, setInputAndSend })
</script>

<style scoped>
.chat-box {
  flex: 1;
  background: white;
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 4px 6px rgba(0,0,0,0.05);
  border: 1px solid #e1e4e8;
  min-height: 0;
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

.typing {
  color: #999;
  font-style: italic;
}

/* Message Wrapper */
.message-wrapper {
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-width: 100%;
}

/* Agent Badge 样式 */
.agent-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
  width: fit-content;
}

.agent-badge.knowledge {
  background: linear-gradient(135deg, #e8f5e9, #c8e6c9);
  color: #2e7d32;
  border: 1px solid #a5d6a7;
}

.agent-badge.tutor {
  background: linear-gradient(135deg, #fff3e0, #ffe0b2);
  color: #e65100;
  border: 1px solid #ffcc80;
}

.agent-badge.general {
  background: linear-gradient(135deg, #e3f2fd, #bbdefb);
  color: #1565c0;
  border: 1px solid #90caf9;
}

.agent-icon {
  font-size: 0.85rem;
}

.agent-name {
  font-weight: 600;
}

.agent-confidence {
  background: rgba(255,255,255,0.6);
  padding: 1px 6px;
  border-radius: 8px;
  font-size: 0.7rem;
  font-weight: 700;
}

/* RAG 来源样式 */
.rag-sources {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  background: linear-gradient(135deg, #fce4ec, #f8bbd9);
  border: 1px solid #f48fb1;
  border-radius: 8px;
  font-size: 0.75rem;
  color: #c2185b;
  flex-wrap: wrap;
}

.sources-icon {
  font-size: 0.85rem;
}

.sources-label {
  font-weight: 600;
}

.sources-list {
  color: #880e4f;
  font-weight: 500;
}

/* Multi-Agent Trace */
.agent-trace {
  background: #ffffff;
  border: 1px dashed #d2d9e2;
  border-radius: 8px;
  padding: 8px 10px;
  font-size: 0.75rem;
  color: #51606f;
}

.agent-trace summary {
  cursor: pointer;
  user-select: none;
  font-weight: 700;
  color: #2c3e50;
}

.trace-list {
  margin-top: 8px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.trace-step {
  font-weight: 800;
  text-transform: uppercase;
  font-size: 0.7rem;
  letter-spacing: 0.05em;
  margin-bottom: 4px;
}

.trace-content {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
  background: #f7f9fb;
  border: 1px solid #e6ebf1;
  border-radius: 8px;
  padding: 8px;
  max-height: 240px;
  overflow: auto;
}
</style>
