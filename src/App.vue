<template>
  <div id="app">
    <header class="app-header">
      <div class="header-content">
        <span class="logo">🎓</span>
        <div>
          <h1>AI 校园百事通</h1>
          <p>Your 24/7 Smart Campus Assistant</p>
        </div>
      </div>
    </header>
    <main>
      <router-view></router-view>
    </main>
  </div>
</template>

<script setup>
</script>

<style>
/* App-wide layout tweaks */
#app {
  display: flex;
  flex-direction: column;
  height: 100vh;
}

.app-header {
  background-color: var(--card-bg);
  padding: 1rem 2rem;
  box-shadow: 0 2px 8px rgba(0,0,0,0.05);
  z-index: 10;
}

.header-content {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  gap: 15px;
}

.logo {
  font-size: 2.5rem;
}

.app-header h1 {
  color: var(--primary-color);
  font-size: 1.5rem;
}

.app-header p {
  margin: 0;
  color: var(--text-secondary);
  font-size: 0.85rem;
}

main {
  flex: 1;
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
  height: calc(100vh - 90px); /* Adjust based on header height */
  overflow: hidden;
}
</style>
