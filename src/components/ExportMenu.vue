<template>
  <div ref="rootEl" class="xexport">
    <button
      type="button"
      class="xexport-trigger"
      :class="{ 'is-open': open }"
      :disabled="disabled"
      aria-haspopup="menu"
      :aria-expanded="open ? 'true' : 'false'"
      @click="toggle"
    >
      <svg class="xexport-ico" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v10" /><path d="M8 9l4 4 4-4" /><path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" /></svg>
      <span class="xexport-label">{{ label }}</span>
      <svg class="xexport-chev" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6" /></svg>
    </button>

    <transition name="xexport-fade">
      <div v-if="open" class="xexport-menu" :class="align === 'left' ? 'is-left' : 'is-right'" role="menu">
        <button type="button" class="xexport-item" role="menuitem" @click="pick('excel')">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18" /><path d="M3 15h18" /><path d="M9 3v18" /><path d="M15 3v18" /></svg>
          <span>Excel (.xlsx)</span>
        </button>
        <button type="button" class="xexport-item" role="menuitem" @click="pick('pdf')">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /><path d="M9 13h6" /><path d="M9 17h4" /></svg>
          <span>PDF (.pdf)</span>
        </button>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'

const props = defineProps({
  excel: { type: Function, default: null },
  pdf: { type: Function, default: null },
  disabled: { type: Boolean, default: false },
  label: { type: String, default: 'Exporter' },
  align: { type: String, default: 'right' }
})

const open = ref(false)
const rootEl = ref(null)

function toggle() {
  if (props.disabled) return
  open.value = !open.value
}

function close() {
  open.value = false
}

function pick(kind) {
  const fn = kind === 'excel' ? props.excel : props.pdf
  close()
  if (typeof fn === 'function') fn()
}

function onDocClick(e) {
  if (!open.value) return
  if (rootEl.value && !rootEl.value.contains(e.target)) close()
}

function onKey(e) {
  if (e.key === 'Escape' && open.value) close()
}

onMounted(() => {
  document.addEventListener('click', onDocClick)
  document.addEventListener('keydown', onKey)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', onDocClick)
  document.removeEventListener('keydown', onKey)
})
</script>

<style scoped>
.xexport {
  position: relative;
  display: inline-flex;
}

.xexport-trigger {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 12px;
  font-family: 'Poppins', sans-serif;
  font-size: 14px;
  font-weight: 500;
  line-height: 1;
  color: var(--tx, #1f2937);
  background: var(--card, #fff);
  border: 1px solid var(--divider, #e2e5ea);
  border-radius: 9px;
  cursor: pointer;
  transition: background .15s ease, border-color .15s ease;
}

.xexport-trigger:hover:not(:disabled) {
  background: rgba(0, 0, 0, .04);
}

.xexport-trigger:disabled {
  opacity: .5;
  cursor: not-allowed;
}

.xexport-trigger.is-open {
  border-color: var(--pr, #2563eb);
}

.xexport-ico {
  flex: 0 0 auto;
  color: var(--tx2, #4b5563);
}

.xexport-chev {
  flex: 0 0 auto;
  color: var(--tx3, #6b7280);
  transition: transform .18s ease;
}

.xexport-trigger.is-open .xexport-chev {
  transform: rotate(180deg);
}

.xexport-menu {
  position: absolute;
  top: calc(100% + 6px);
  min-width: 176px;
  padding: 6px;
  background: #fff;
  border: 1px solid var(--divider, #e2e5ea);
  border-radius: 11px;
  box-shadow: 0 8px 24px rgba(16, 24, 40, .12), 0 2px 6px rgba(16, 24, 40, .06);
  z-index: 60;
}

.xexport-menu.is-right {
  right: 0;
}

.xexport-menu.is-left {
  left: 0;
}

.xexport-item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 9px 10px;
  font-family: 'Poppins', sans-serif;
  font-size: 13.5px;
  color: var(--tx, #1f2937);
  text-align: left;
  background: transparent;
  border: none;
  border-radius: 8px;
  cursor: pointer;
}

.xexport-item + .xexport-item {
  margin-top: 2px;
}

.xexport-item:hover {
  background: rgba(0, 0, 0, .05);
}

.xexport-item svg {
  flex: 0 0 auto;
  color: var(--tx3, #6b7280);
}

.xexport-fade-enter-active,
.xexport-fade-leave-active {
  transition: opacity .14s ease, transform .14s ease;
}

.xexport-fade-enter-from,
.xexport-fade-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
