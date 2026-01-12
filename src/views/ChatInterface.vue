<template>
  <div class="chat-container">
    <!-- Left Panel: Digital Human -->
    <div class="digital-human-section">
      <div class="digital-human-container">
        <div id="digital-human-canvas" class="canvas-placeholder">
          <div class="placeholder-content">
            <span class="pulse-icon">🎓</span>
            <p>数字人正在初始化...</p>
            <p style="font-size: 12px; margin-top: 5px; opacity: 0.7;">请稍候片刻</p>
          </div>
        </div>
        <!-- 错误提示 -->
        <div v-if="digitalHumanError" class="error-overlay">
          <div class="error-content">
            <span class="error-icon">⚠️</span>
            <p>{{ digitalHumanError }}</p>
          </div>
        </div>
        <div class="status-bar">
          <span class="status-dot" :class="{ online: !digitalHumanError, offline: digitalHumanError }"></span>
          {{ digitalHumanError ? '小云离线' : '小云正在线' }}
        </div>
      </div>
    </div>

    <!-- Right Panel: Chat Box -->
    <div class="chat-section">
      <!-- Quick Access Bubbles -->
      <div class="quick-bubbles">
        <button
          class="bubble-btn special"
          @click="startInterview"
          :disabled="isLoading"
        >
          🎓 开启 AI 导师陪练 (全场景评测)
        </button>
        <button
          v-for="item in hotTopics"
          :key="item"
          class="bubble-btn"
          @click="userInput = item; sendMessage()"
        >
          {{ item }}
        </button>
      </div>

      <!-- Chat Box -->
      <div class="chat-box">
        <div class="messages" ref="messagesContainer">
          <div v-for="(msg, index) in messages" :key="index" :class="['message', msg.role]">
            <!-- Assistant: avatar on left, content on right -->
            <template v-if="msg.role === 'assistant'">
              <div class="avatar">🎓</div>
              <div class="content" v-html="msg.content"></div>
            </template>

            <!-- User: content on left, avatar on right -->
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
            v-model="userInput"
            @keyup.enter="sendMessage"
            type="text"
            placeholder="请输入你的问题，例如：如何申请奖学金？"
            :disabled="isLoading"
          />
          <button @click="sendMessage" :disabled="isLoading || !userInput.trim()">发送</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, nextTick, onMounted, onUnmounted, markRaw } from 'vue'
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
let digitalHumanInstance = null // Use a plain variable to avoid Vue proxy issues
const isSpeaking = ref(false) // 跟踪语音播报状态
const speakQueue = ref([]) // 语音播报队列
const digitalHumanError = ref('') // 数字人错误信息
let typewriterTimer = null // 打字机定时器
let fullTextBuffer = '' // 完整文本缓冲区

const messages = ref([
  {
    role: 'assistant',
    content: md.render('你好！我是你的校园百事通 **小云** 🎓.\n有什么校园生活或学习上的问题，尽管问我吧！'),
    isHtml: true
  }
])

const hotTopics = [
  '新生入学流程是怎样的?',
  '图书馆几点闭馆?',
  '如何申请国家励志奖学金?',
  '校医院在什么位置?'
]

// 开始面试模拟
const startInterview = () => {
  if (isLoading.value) return
  userInput.value = "我想开始 AI 导师模拟练习"
  sendMessage()
}

// 语音播报队列处理函数
const processSpeakQueue = () => {
  if (isSpeaking.value || speakQueue.value.length === 0) return

  const text = speakQueue.value.shift()
  if (digitalHumanInstance && text) {
    isSpeaking.value = true
    digitalHumanInstance.speak(text, true, true)

    // 临时解决方案: 使用定时器估算播报时长
    // 假设每个字符播报需要150ms (中文语速约为每分钟200字)
    const estimatedDuration = Math.max(text.length * 150, 2000) // 最少2秒

    setTimeout(() => {
      isSpeaking.value = false
      // 切换到待机互动状态
      if (digitalHumanInstance && typeof digitalHumanInstance.interactiveidle === 'function') {
        digitalHumanInstance.interactiveidle()
      }
      // 处理队列中的下一个播报
      processSpeakQueue()
    }, estimatedDuration)
  }
}

// 添加到播报队列
const addToSpeakQueue = (text) => {
  if (!text || !digitalHumanInstance) {
    return
  }

  speakQueue.value.push(text)
  processSpeakQueue()
}

// 打字机效果函数
const typewriterEffect = (messageIndex, fullText, speed = 50) => {
  return new Promise((resolve) => {
    // 清除之前的定时器
    if (typewriterTimer) {
      clearInterval(typewriterTimer)
    }

    let currentIndex = 0
    const textLength = fullText.length

    typewriterTimer = setInterval(() => {
      if (currentIndex <= textLength) {
        const partialText = fullText.substring(0, currentIndex)
        messages.value[messageIndex].content = md.render(partialText)
        scrollToBottom()
        currentIndex++
      } else {
        clearInterval(typewriterTimer)
        typewriterTimer = null
        resolve()
      }
    }, speed)
  })
}

// 错误处理函数
const handleDigitalHumanError = (error) => {
  console.error('数字人错误:', error)

  const errorMessages = {
    10001: '数字人容器不存在',
    10002: '数字人连接失败',
    40001: '音频解码错误',
    50001: '数字人离线',
    50004: '网络连接断开'
  }

  const errorCode = error?.code || error?.message
  digitalHumanError.value = errorMessages[errorCode] || '数字人加载失败'
}

// Initialize Digital Human SDK
const initDigitalHuman = () => {
  let attempts = 0
  const maxAttempts = 20

  const checkAndInit = async () => {
    if (typeof XmovAvatar !== 'undefined') {
      try {
        await nextTick()

        const containerElement = document.getElementById('digital-human-canvas')
        if (!containerElement) {
          console.error('Container element not found')
          return
        }

        // 不要修改容器内容，让SDK自己管理
        containerElement.style.display = 'block'
        containerElement.style.background = '#2a2a2a'

        // 从后端动态获取配置
        let config = { appId: '', appSecret: '' }
        try {
          const res = await axios.get('/api/config/xmov')
          config = res.data
          console.log('Successfully fetched Xmov config from backend')
        } catch (err) {
          console.error('Failed to fetch Xmov config:', err)
          // 如果获取失败，可以根据需要决定是否继续或报错
        }

        const instance = new XmovAvatar({
          containerId: '#digital-human-canvas',
          appId: config.appId,
          appSecret: config.appSecret,
          gatewayServer: 'https://nebula-agent.xingyun3d.com/user/v1/ttsa/session',
          hardwareAcceleration: 'prefer-software', // 改为软件解码，避免编解码器配置错误
          scale: 0.35, // 调整缩放比例，让全身显示
          enableLogger: true,

          // 语音状态变化回调
          onVoiceStateChange: (status) => {
            console.log('SDK [语音状态 onVoiceStateChange]:', status)
            if (status === 'end') {
              // 语音播报结束
              isSpeaking.value = false
              // 切换到待机互动状态
              if (digitalHumanInstance) {
                digitalHumanInstance.interactiveidle()
              }
              // 处理队列中的下一个播报
              processSpeakQueue()
            }
          },

          // 状态变化回调
          onStateChange: (state) => {
            console.log('SDK [状态变化 onStateChange]:', state)
          },

          // SDK状态变化
          onStatusChange: (status) => {
            console.log('SDK [SDK状态 onStatusChange]:', status)
          },

          // 消息回调
          onMessage: (msg) => {
            console.log('SDK [消息 onMessage]:', JSON.stringify(msg))
            // 处理错误码10005（房间限流）
            if (msg && msg.code === 10005) {
              digitalHumanError.value = '数字人服务正在初始化中，请稍候30秒后刷新页面'
            }
          },

          // Widget事件
          onWidgetEvent: (data) => {
            console.log('SDK [Widget事件 onWidgetEvent]:', data)
          },

          // 网络信息
          onNetworkInfo: (networkInfo) => {
            // console.log('SDK [网络信息 onNetworkInfo]:', networkInfo)
          },

          // 错误回调
          onError: (err) => {
            console.error('SDK [错误 onError]:', err)
            // 如果是房间限流错误(10005)，提示用户等待
            if (err.code === 10005) {
              digitalHumanError.value = '数字人服务正在初始化中，请稍候30秒后刷新页面'
            } else {
              handleDigitalHumanError(err)
            }
          }
        })

        // Initialize the SDK with timeout
        const initTimeout = setTimeout(() => {
          console.warn('SDK init timeout after 30 seconds, forcing start...')
          if (instance && typeof instance.start === 'function') {
            instance.start().then(() => {
              console.log('SDK started after timeout')
            }).catch(err => {
              console.error('Failed to start SDK after timeout:', err)
              handleDigitalHumanError(err)
            })
          }
        }, 30000)

        instance.init({
          onDownloadProgress: (progress) => {
            // 只记录日志，不修改DOM
            if (progress.percent && progress.percent % 10 === 0) {
              console.log('Resource Loading Progress:', progress.percent + '%')
            }
          }
        }).then(() => {
          clearTimeout(initTimeout)
          console.log('SDK Init Completed.')

          // 打印资源包配置
          if (instance.resourceManager && instance.resourceManager.resource_pack) {
             console.log('Resource Pack Config:', JSON.stringify(instance.resourceManager.resource_pack))
          } else {
             console.warn('Resource Pack is empty or undefined!')
          }

          // 不调用start()，直接触发speak()让SDK自动启动
          console.log('SDK Init Completed, triggering speak to start rendering...')

          // 清除placeholder，让canvas显示
          const placeholder = containerElement.querySelector('.placeholder-content')
          if (placeholder) {
            placeholder.remove()
            console.log('Placeholder removed, canvas should be visible now')
          }

          // 立即触发初始欢迎语，让SDK通过speak()自动启动
          setTimeout(() => {
            if (digitalHumanInstance && typeof digitalHumanInstance.speak === 'function') {
              console.log('Triggering initial speak wakeup...')
              addToSpeakQueue("你好！我是你的校园百事通小云，有什么校园生活或学习上的问题，尽管问我吧！")
            }
          }, 500)
        }).catch(err => {
          clearTimeout(initTimeout)
          console.error('SDK Init or Start Failed:', err)
          handleDigitalHumanError(err)
        })

        // Use markRaw to prevent Vue from proxying the SDK instance
        digitalHumanInstance = markRaw(instance)

        // Expose to window for debugging
        window.digital_human = digitalHumanInstance

        console.log('Digital Human SDK instance created')

      } catch (e) {
        console.error('Digital Human Init Error:', e)
      }
    } else {
      attempts++
      if (attempts < maxAttempts) {
        setTimeout(checkAndInit, 500)
      } else {
        console.error('Xingyun3D SDK failed to load after 10 seconds.')
      }
    }
  }

  checkAndInit()
}

// 组件挂载
onMounted(() => {
  initDigitalHuman()
  // 新增：页面关闭或刷新前强制销毁，释放服务端房间
  window.addEventListener('beforeunload', cleanupDigitalHuman)
})

// 组件卸载
onUnmounted(() => {
  // 清理打字机定时器
  if (typewriterTimer) {
    clearInterval(typewriterTimer)
    typewriterTimer = null
  }

  // 开发环境下不销毁SDK，避免热重载时重复初始化
  if (import.meta.env.PROD) {
    cleanupDigitalHuman()
  } else {
    console.log('Development mode: skipping SDK cleanup on unmount (HMR)')
  }
  window.removeEventListener('beforeunload', cleanupDigitalHuman)
})

const cleanupDigitalHuman = () => {
  if (digitalHumanInstance) {
    console.log('正在清理数字人资源并关闭会话...')
    try {
      digitalHumanInstance.destroy()
      digitalHumanInstance = null
      window.digital_human = null
    } catch (e) {
      console.error('销毁数字人实例失败:', e)
    }
  }
}

const sendMessage = async () => {
  if (!userInput.value.trim() || isLoading.value) return

  const text = userInput.value
  messages.value.push({ role: 'user', content: text, isHtml: false })
  userInput.value = ''
  isLoading.value = true

  // 清空之前的文本缓冲区
  fullTextBuffer = ''

  scrollToBottom()

  // 数字人切换到倾听状态
  if (digitalHumanInstance && typeof digitalHumanInstance.listen === 'function') {
    digitalHumanInstance.listen()
  }

  try {
    // 准备发送给后端的历史记录（转换为 API 要求的格式）
    // 只取最近的 10 条，避免 token 过长
    const history = messages.value.slice(-11, -1).map(m => ({
      role: m.role,
      content: m.content.replace(/<[^>]*>?/gm, '') // 去除可能存在的 HTML 标签
    }))

    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        message: text,
        history: history
      })
    })

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let rawContent = ''
    let assistantMessageIndex = -1
    let buffer = ''
    let hasStartedReceiving = false

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      const chunk = decoder.decode(value, { stream: true })
      buffer += chunk

      const lines = buffer.split('\n')
      buffer = lines.pop()

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.substring(6))

            if (data.type === 'text') {
              // 第一次收到内容时,切换数字人到思考状态
              if (!hasStartedReceiving && digitalHumanInstance && typeof digitalHumanInstance.think === 'function') {
                digitalHumanInstance.think()
                hasStartedReceiving = true
              }

              // 累积原始文本，但不立即显示
              rawContent += data.content
              fullTextBuffer = rawContent

            } else if (data.type === 'done') {
              isLoading.value = false

              // 创建消息占位符
              if (assistantMessageIndex === -1) {
                assistantMessageIndex = messages.value.push({
                  role: 'assistant',
                  content: '',
                  isHtml: true
                }) - 1
              }

              // 处理完整回复文本
              if (rawContent) {
                // 去除 Markdown 符号用于语音播报
                const speechText = rawContent
                  .replace(/[#*`_\[\]]/g, '')
                  .replace(/\n{3,}/g, '\n\n')
                  .trim()

                console.log('AI回复完成,准备同步显示和播报')

                // 同时启动打字机效果和语音播报
                const typewriterSpeed = 180 // 每个字符180ms

                // 启动打字机效果
                typewriterEffect(assistantMessageIndex, rawContent, typewriterSpeed)

                // 同时启动语音播报
                if (speechText.length > 200) {
                  const segments = splitTextForSpeech(speechText)
                  console.log('分段数量:', segments.length)
                  segments.forEach(segment => addToSpeakQueue(segment))
                } else {
                  addToSpeakQueue(speechText)
                }
              }
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

// 文本分段函数 - 将长文本按句子分段
const splitTextForSpeech = (text) => {
  const segments = []
  const maxLength = 200

  // 按句号、问号、感叹号分割
  const sentences = text.split(/([。!?!?\n]+)/)
  let currentSegment = ''

  for (let i = 0; i < sentences.length; i++) {
    const sentence = sentences[i]
    if (!sentence.trim()) continue

    if (currentSegment.length + sentence.length <= maxLength) {
      currentSegment += sentence
    } else {
      if (currentSegment) {
        segments.push(currentSegment.trim())
      }
      currentSegment = sentence
    }
  }

  if (currentSegment.trim()) {
    segments.push(currentSegment.trim())
  }

  return segments.length > 0 ? segments : [text]
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
  flex-direction: row;
  gap: 20px;
  height: 100%;
  width: 100%;
}

/* Left Section: Digital Human */
.digital-human-section {
  width: 35%;
  height: 100%;
  flex-shrink: 0;
}

.digital-human-container {
  width: 100%;
  height: 100%;
  background: #1a1a1a;
  border-radius: 12px;
  border: 1px solid rgba(225, 228, 232, 0.3);
  overflow: hidden;
  position: relative;
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.08);
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 让canvas保持原始宽高比，完整显示并居中 */
.digital-human-container :deep(canvas) {
  max-width: 100%;
  max-height: 100%;
  width: auto !important;
  height: auto !important;
  display: block;
  object-fit: contain;
  position: absolute !important;
  left: 50% !important;
  top: 50% !important;
  transform: translate(-50%, -50%) !important;
}

#digital-human-canvas {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Right Section: Chat */
.chat-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: 0;
  overflow: hidden;
}

/* Quick Access Bubbles */
.quick-bubbles {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  padding: 0;
}

.bubble-btn {
  padding: 10px 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 24px;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
  white-space: nowrap;
}

.bubble-btn.special {
  background: linear-gradient(135deg, #f6d365 0%, #fda085 100%);
  font-weight: bold;
  box-shadow: 0 4px 12px rgba(253, 160, 133, 0.4);
}

.bubble-btn.special:hover {
  background: linear-gradient(135deg, #f7d775 0%, #fdb095 100%);
}

.bubble-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(102, 126, 234, 0.4);
}

.bubble-btn:active {
  transform: translateY(0);
}

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

.canvas-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background-image: radial-gradient(#d0e3ff 1px, transparent 1px);
  background-size: 20px 20px;
}

.placeholder-content {
  text-align: center;
  color: #8fa1b3;
}

.pulse-icon {
  font-size: 48px;
  display: block;
  margin-bottom: 10px;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0% { transform: scale(0.95); opacity: 0.8; }
  50% { transform: scale(1.05); opacity: 1; }
  100% { transform: scale(0.95); opacity: 0.8; }
}

.status-bar {
  position: absolute;
  bottom: 0;
  width: 100%;
  padding: 8px 15px;
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(4px);
  font-size: 0.8rem;
  color: #666;
  border-top: 1px solid #f0f2f5;
  display: flex;
  align-items: center;
  gap: 6px;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.status-dot.online {
  background: #44cf7c;
  box-shadow: 0 0 0 2px rgba(68, 207, 124, 0.2);
}

.status-dot.offline {
  background: #ff6b6b;
  box-shadow: 0 0 0 2px rgba(255, 107, 107, 0.2);
}

/* 错误提示覆盖层 */
.error-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
  animation: fadeIn 0.3s ease-in;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.error-content {
  text-align: center;
  padding: 20px;
}

.error-icon {
  font-size: 48px;
  display: block;
  margin-bottom: 12px;
  animation: shake 0.5s ease-in-out;
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-10px); }
  75% { transform: translateX(10px); }
}

.error-content p {
  color: #ff6b6b;
  font-size: 0.9rem;
  font-weight: 500;
  margin: 0;
}
</style>