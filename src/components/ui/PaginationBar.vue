<template>
  <div class="pagination-bar">
    <div class="pagination-info">
      <span class="pagination-count">
        {{ startItem }}-{{ endItem }} sur {{ totalItems }}
      </span>
      <div class="pagination-per-page">
        <label>Afficher</label>
        <select :value="perPage" class="per-page-select" @change="$emit('update:perPage', Number($event.target.value))">
          <option v-for="opt in perPageOptions" :key="opt" :value="opt">{{ opt }}</option>
        </select>
      </div>
    </div>
    <div class="pagination-nav" v-if="totalPages > 1">
      <button class="icon-btn" :disabled="currentPage === 1" @click="$emit('update:currentPage', 1)" title="Première page">
        <ChevronsLeft :size="16" />
      </button>
      <button class="icon-btn" :disabled="currentPage === 1" @click="$emit('update:currentPage', currentPage - 1)" title="Page précédente">
        <ChevronLeft :size="16" />
      </button>
      <span class="page-indicator">{{ currentPage }} / {{ totalPages }}</span>
      <button class="icon-btn" :disabled="currentPage === totalPages" @click="$emit('update:currentPage', currentPage + 1)" title="Page suivante">
        <ChevronRight :size="16" />
      </button>
      <button class="icon-btn" :disabled="currentPage === totalPages" @click="$emit('update:currentPage', totalPages)" title="Dernière page">
        <ChevronsRight :size="16" />
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-vue-next'

const props = defineProps({
  currentPage: { type: Number, required: true },
  perPage: { type: Number, default: 20 },
  totalItems: { type: Number, required: true },
})

defineEmits(['update:currentPage', 'update:perPage'])

const perPageOptions = [10, 20, 30, 50, 100]

const totalPages = computed(() => Math.max(1, Math.ceil(props.totalItems / props.perPage)))
const startItem = computed(() => props.totalItems === 0 ? 0 : (props.currentPage - 1) * props.perPage + 1)
const endItem = computed(() => Math.min(props.currentPage * props.perPage, props.totalItems))
</script>

<style scoped>
.pagination-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  gap: 16px;
  flex-wrap: wrap;
}
.pagination-info {
  display: flex;
  align-items: center;
  gap: 16px;
}
.pagination-count {
  font-size: 13px;
  color: var(--tx3);
  white-space: nowrap;
}
.pagination-per-page {
  display: flex;
  align-items: center;
  gap: 6px;
}
.pagination-per-page label {
  font-size: 12px;
  color: var(--tx3);
  white-space: nowrap;
}
.per-page-select {
  padding: 4px 8px;
  border: 1px solid var(--brd);
  border-radius: 6px;
  font-size: 12px;
  color: var(--tx);
  background: #fff;
  cursor: pointer;
  outline: none;
}
.per-page-select:focus {
  border-color: var(--pr);
}
.pagination-nav {
  display: flex;
  align-items: center;
  gap: 4px;
}
.page-indicator {
  font-size: 13px;
  font-weight: 500;
  color: var(--tx2);
  min-width: 60px;
  text-align: center;
}
</style>
