<template>
  <div class="app-layout">
    <AppSidebar :collapsed="sidebarCollapsed" @toggle-collapse="sidebarCollapsed = !sidebarCollapsed" />
    <div class="main-area" :class="{ collapsed: sidebarCollapsed }">
      <AppHeader @toggle-sidebar="sidebarCollapsed = !sidebarCollapsed" />
      <main class="main-content">
        <RouterView />
      </main>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { RouterView } from 'vue-router'
import AppSidebar from './AppSidebar.vue'
import AppHeader from './AppHeader.vue'

const sidebarCollapsed = ref(false)
</script>

<style scoped>
.app-layout {
  display: flex;
  min-height: 100vh;
  background: var(--bg);
}
.main-area {
  flex: 1;
  margin-left: 260px;
  transition: margin-left 0.3s cubic-bezier(.4,0,.2,1);
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}
.main-area.collapsed {
  margin-left: 72px;
}
.main-content {
  flex: 1;
  padding: 24px 32px 32px;
  overflow-y: auto;
}

@media (max-width: 1024px) {
  .main-area {
    margin-left: 0;
  }
  .main-content {
    padding: 16px;
  }
}
</style>
