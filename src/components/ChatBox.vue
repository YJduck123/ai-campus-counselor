<template>
  <div class="chat-box">
    <div class="messages" ref="messagesContainer">
      <div v-for="(msg, index) in messages" :key="index" :class="['message', msg.role]">
        <template v-if="msg.role === 'assistant'">
          <div class="avatar">🎓</div>
          <div class="content" v-html="msg.content"></div>
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
</style>
