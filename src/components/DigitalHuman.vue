<template>
  <div class="digital-human-container">
    <div id="digital-human-canvas" class="canvas-placeholder">
      <div class="placeholder-content" v-if="!isInitialized">
        <span class="pulse-icon">🎓</span>
        <p>数字人正在初始化...</p>
        <p style="font-size: 12px; margin-top: 5px; opacity: 0.7;">请稍候片刻</p>
      </div>
    </div>
    <!-- 错误提示 -->
    <div v-if="error" class="error-overlay">
      <div class="error-content">
        <span class="error-icon">⚠️</span>
        <p>{{ error }}</p>
      </div>
    </div>
    <div class="status-bar">
      <span class="status-dot" :class="{ online: !error, offline: error }"></span>
      {{ error ? '小云离线' : '小云正在线' }}
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, nextTick, markRaw } from 'vue'
import { getXmovConfig } from '../services/api'

const isInitialized = ref(false)
const error = ref('')
let instance = null
let isSpeaking = false
const speakQueue = []
let isCleaningUp = false

// 错误码映射
const errorMessages = {
  10001: '数字人容器不存在',
  10002: '数字人连接失败',
  10005: '数字人服务正在初始化中，请稍候30秒后刷新页面',
  40001: '音频解码错误',
  50001: '数字人离线',
  50004: '网络连接断开'
}

// 处理错误
const handleError = (err) => {
  console.error('数字人错误:', err)
  const errorCode = err?.code || err?.message
  error.value = errorMessages[errorCode] || '数字人加载失败'
}

// 初始化数字人
const init = async () => {
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

        containerElement.style.display = 'block'
        containerElement.style.background = '#2a2a2a'

        // 获取配置
        let config = { appId: '', appSecret: '' }
        try {
          config = await getXmovConfig()
          console.log('Successfully fetched Xmov config')
        } catch (err) {
          console.error('Failed to fetch Xmov config:', err)
        }

        instance = markRaw(new XmovAvatar({
          containerId: '#digital-human-canvas',
          appId: config.appId,
          appSecret: config.appSecret,
          gatewayServer: 'https://nebula-agent.xingyun3d.com/user/v1/ttsa/session',
          hardwareAcceleration: 'prefer-software',
          scale: 0.35,
          enableLogger: true,
          onVoiceStateChange: (status) => {
            console.log('语音状态:', status)
            if (status === 'end') {
              isSpeaking = false
              if (instance) instance.interactiveidle()
              processSpeakQueue()
            }
          },
          onMessage: (msg) => {
            if (msg && msg.code === 10005) {
              error.value = errorMessages[10005]
            }
          },
          onError: (err) => {
            if (err.code === 10005) {
              error.value = errorMessages[10005]
            } else {
              handleError(err)
            }
          }
        }))

        await instance.init({
          onDownloadProgress: (progress) => {
            if (progress.percent && progress.percent % 10 === 0) {
              console.log('Resource Loading:', progress.percent + '%')
            }
          }
        })

        console.log('SDK Init Completed')
        isInitialized.value = true

        // 初始欢迎语
        setTimeout(() => {
          speak("你好！我是你的校园百事通小云，有什么问题尽管问我吧！")
        }, 500)

        window.digital_human = instance

      } catch (e) {
        console.error('Digital Human Init Error:', e)
        handleError(e)
      }
    } else {
      attempts++
      if (attempts < maxAttempts) {
        setTimeout(checkAndInit, 500)
      } else {
        console.error('Xingyun3D SDK failed to load')
        error.value = 'SDK 加载超时'
      }
    }
  }

  checkAndInit()
}

// 处理语音队列
const processSpeakQueue = () => {
  if (isSpeaking || speakQueue.length === 0) return

  const text = speakQueue.shift()
  if (instance && text) {
    isSpeaking = true
    instance.speak(text, true, true)
  }
}

// 添加到队列并播报
const speak = (text) => {
  if (!text || !instance) return
  speakQueue.push(text)
  processSpeakQueue()
}

// 状态切换方法
const listen = () => instance?.listen?.()
const think = () => instance?.think?.()

// 清理
const cleanup = () => {
  if (isCleaningUp) return
  isCleaningUp = true

  if (instance) {
    try {
      instance.destroy()
      instance = null
      window.digital_human = null
    } catch (e) {
      console.error('销毁数字人实例失败:', e)
    }
  }

  isSpeaking = false
  speakQueue.length = 0
  isInitialized.value = false
  isCleaningUp = false
}

onMounted(() => {
  init()
  window.addEventListener('beforeunload', cleanup)
})

onUnmounted(() => {
  cleanup()
  window.removeEventListener('beforeunload', cleanup)
})

// Vite HMR 下，组件会被替换；需要显式销毁旧实例，避免残留导致重复拉流/刷日志
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    cleanup()
  })
}

// 暴露方法给父组件
defineExpose({ speak, listen, think })
</script>

<style scoped>
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
}

.error-content {
  text-align: center;
  padding: 20px;
}

.error-icon {
  font-size: 48px;
  display: block;
  margin-bottom: 12px;
}

.error-content p {
  color: #ff6b6b;
  font-size: 0.9rem;
  font-weight: 500;
  margin: 0;
}
</style>
