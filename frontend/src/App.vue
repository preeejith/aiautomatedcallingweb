<script setup>
import { ref } from 'vue'
import ElevenLabsCaller from './components/ElevenLabsCaller.vue'
import ConversationHistory from './components/ConversationHistory.vue'

const currentView = ref('caller')
</script>
<!-- # -->
<template>
  <div class="app-container">
    <nav class="top-nav">
      <div class="nav-brand">AI Agent Dashboard</div>
      <div class="nav-links">
        <button :class="{ active: currentView === 'caller' }" @click="currentView = 'caller'">Make Call</button>
        <button :class="{ active: currentView === 'history' }" @click="currentView = 'history'">Call History</button>
      </div>
    </nav>

    <main class="content">
      <ElevenLabsCaller v-if="currentView === 'caller'" />
      <ConversationHistory v-if="currentView === 'history'" />
    </main>
  </div>
</template>
<!-- /* Remove default Vite styling for full screen apps */ -->
<style>
/* Remove default Vite styling for full screen apps */
body {
  margin: 0;
  padding: 0;
  background: #0a0a0f;
  color: white;
  font-family: 'DM Sans', sans-serif;
}
.app-container {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}
.top-nav {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 2rem;
  background: rgba(255, 255, 255, 0.05);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}
.nav-brand {
  font-family: 'Syne', sans-serif;
  font-weight: 800;
  font-size: 1.2rem;
  color: #fff;
  letter-spacing: -0.5px;
}
.nav-links {
  display: flex;
  gap: 1rem;
}
.nav-links button {
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.5);
  font-size: 0.95rem;
  font-weight: 500;
  cursor: pointer;
  padding: 0.5rem 1rem;
  border-radius: 8px;
  transition: all 0.2s;
}
.nav-links button:hover {
  background: rgba(255, 255, 255, 0.05);
  color: white;
}
.nav-links button.active {
  background: rgba(124, 92, 252, 0.15);
  color: #7c5cfc;
}
.content {
  flex: 1;
  position: relative;
}
</style>
