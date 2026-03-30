<template>
  <div class="layout">
    <AppSidebar :collapsed="sidebarCollapsed" />
    <div class="layout-main" :class="{ collapsed: sidebarCollapsed }">
      <AppHeader
        @toggle-sidebar="sidebarCollapsed = !sidebarCollapsed"
      />
      <main class="layout-content">
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
.layout {
  display: flex;
  min-height: 100vh;
  background: var(--bg);
}

.layout-main {
  flex: 1;
  margin-left: 240px;
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  transition: margin-left 0.25s ease;
}
.layout-main.collapsed {
  margin-left: 68px;
}

.layout-content {
  flex: 1;
  padding: 0 32px 32px;
  overflow-y: auto;
}

@media (max-width: 1024px) {
  .layout-main {
    margin-left: 0;
  }
  .layout-content {
    padding: 0 16px 16px;
  }
}
</style>
