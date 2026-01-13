<template>
  <div class="quick-bubbles">
    <button
      class="bubble-btn special"
      @click="$emit('interview')"
      :disabled="disabled"
    >
      🎓 开启 AI 导师陪练 (全场景评测)
    </button>
    <button
      v-for="item in topics"
      :key="item"
      class="bubble-btn"
      @click="$emit('select', item)"
      :disabled="disabled"
    >
      {{ item }}
    </button>
  </div>
</template>

<script setup>
defineProps({
  topics: { type: Array, required: true },
  disabled: { type: Boolean, default: false }
})

defineEmits(['interview', 'select'])
</script>

<style scoped>
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

.bubble-btn.special:hover:not(:disabled) {
  background: linear-gradient(135deg, #f7d775 0%, #fdb095 100%);
}

.bubble-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(102, 126, 234, 0.4);
}

.bubble-btn:active:not(:disabled) {
  transform: translateY(0);
}

.bubble-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
