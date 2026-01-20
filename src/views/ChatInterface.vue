<template>
  <div class="chat-container">
    <!-- Left Panel: Digital Human -->
    <div class="digital-human-section">
      <DigitalHuman ref="digitalHumanRef" />
    </div>

    <!-- Right Panel: Chat -->
    <div class="chat-section">
      <QuickBubbles
        :topics="hotTopics"
        :disabled="isLoading"
        @interview="startInterview"
        @select="handleQuickSelect"
      />
      <ChatBox
        ref="chatBoxRef"
        :messages="messages"
        :is-loading="isLoading"
        @send="sendMessage"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, nextTick } from 'vue'
import MarkdownIt from 'markdown-it'
import DigitalHuman from '../components/DigitalHuman.vue'
import ChatBox from '../components/ChatBox.vue'
import QuickBubbles from '../components/QuickBubbles.vue'
import { sendChatMessage } from '../services/api'

// Constants
const TYPEWRITER_SPEED = 180
const MAX_SPEECH_LENGTH = 200

const md = new MarkdownIt({ html: false, linkify: true, typographer: true })

// Refs
const digitalHumanRef = ref(null)
const chatBoxRef = ref(null)
const isLoading = ref(false)
let typewriterTimer = null

// State
const messages = ref([
  {
    role: 'assistant',
    content: md.render('你好！我是你的校园百事通小云，有什么问题尽管问我吧！')
  }
])

const hotTopics = [
  '新生入学流程是怎样的?',
  '图书馆几点闭馆?',
  '如何申请国家励志奖学金?',
  '校医院在什么位置?'
]

// Methods
const startInterview = () => {
  if (isLoading.value) return
  sendMessage("我想开始 AI 导师模拟练习")
}

const handleQuickSelect = (topic) => {
  if (isLoading.value) return
  sendMessage(topic)
}

const scrollToBottom = () => {
  nextTick(() => chatBoxRef.value?.scrollToBottom())
}

// 打字机效果
const typewriterEffect = (messageIndex, fullText) => {
  return new Promise((resolve) => {
    if (typewriterTimer) clearInterval(typewriterTimer)

    let currentIndex = 0
    typewriterTimer = setInterval(() => {
      if (currentIndex <= fullText.length) {
        messages.value[messageIndex].content = md.render(fullText.substring(0, currentIndex))
        scrollToBottom()
        currentIndex++
      } else {
        clearInterval(typewriterTimer)
        typewriterTimer = null
        resolve()
      }
    }, TYPEWRITER_SPEED)
  })
}

// 文本分段
const splitTextForSpeech = (text) => {
  const segments = []
  const sentences = text.split(/([。!?!?\n]+)/)
  let currentSegment = ''

  for (const sentence of sentences) {
    if (!sentence.trim()) continue
    if (currentSegment.length + sentence.length <= MAX_SPEECH_LENGTH) {
      currentSegment += sentence
    } else {
      if (currentSegment) segments.push(currentSegment.trim())
      currentSegment = sentence
    }
  }
  if (currentSegment.trim()) segments.push(currentSegment.trim())

  return segments.length > 0 ? segments : [text]
}

const sendMessage = async (text) => {
  if (!text.trim() || isLoading.value) return

  messages.value.push({ role: 'user', content: text })
  isLoading.value = true
  scrollToBottom()

  // 数字人切换到倾听状态
  digitalHumanRef.value?.listen()

  try {
    const history = messages.value.slice(-11, -1).map(m => ({
      role: m.role,
      content: m.content.replace(/<[^>]*>?/gm, '')
    }))

    const response = await sendChatMessage(text, history)
    const reader = response.body.getReader()
    const decoder = new TextDecoder()

    let rawContent = ''
    let buffer = ''
    let hasStartedReceiving = false
    let assistantMessageIndex = -1
    let currentAgent = null
    let currentSources = []
    let currentTrace = []

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop()

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.substring(6))

            // 处理 Agent 路由信息
            if (data.type === 'routing') {
              currentAgent = {
                type: data.agent,
                confidence: data.confidence
              }
            }

            // 处理 RAG 检索来源
            else if (data.type === 'sources') {
              currentSources = data.sources || []
            }

            // 多 Agent 编排过程（可选）
            else if (data.type === 'trace') {
              currentTrace.push({
                step: data.step,
                content: data.content
              })
            }

            else if (data.type === 'text') {
              if (!hasStartedReceiving) {
                digitalHumanRef.value?.think()
                hasStartedReceiving = true
              }
              rawContent += data.content

            } else if (data.type === 'done') {
              isLoading.value = false

              if (assistantMessageIndex === -1) {
                assistantMessageIndex = messages.value.push({
                  role: 'assistant',
                  content: '',
                  agent: currentAgent,
                  sources: currentSources,
                  trace: currentTrace
                }) - 1
              }

              if (rawContent) {
                const speechText = rawContent
                  .replace(/[#*`_\[\]]/g, '')
                  .replace(/\n{3,}/g, '\n\n')
                  .trim()

                // 启动打字机效果
                typewriterEffect(assistantMessageIndex, rawContent)

                // 启动语音播报
                if (speechText.length > MAX_SPEECH_LENGTH) {
                  splitTextForSpeech(speechText).forEach(segment => {
                    digitalHumanRef.value?.speak(segment)
                  })
                } else {
                  digitalHumanRef.value?.speak(speechText)
                }
              }
            }
          } catch (e) {
            console.error('Error parsing SSE:', e)
          }
        }
      }
    }
  } catch (error) {
    console.error('Request Error:', error)
    isLoading.value = false
    messages.value.push({
      role: 'assistant',
      content: '抱歉，连接服务器失败。'
    })
  } finally {
    isLoading.value = false
    scrollToBottom()
  }
}
</script>

<style scoped>
.chat-container {
  display: flex;
  flex-direction: row;
  gap: 20px;
  height: 100%;
  width: 100%;
}

.digital-human-section {
  width: 35%;
  height: 100%;
  flex-shrink: 0;
}

.chat-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: 0;
  overflow: hidden;
}
</style>
