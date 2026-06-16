<template>
  <div class="roles-page">
    <!-- Header -->
    <div class="page-header">
      <div class="page-header-text">
        <h1>Rôles & Permissions</h1>
        <p>Configurez les accès de chaque rôle aux modules de l'application</p>
      </div>
    </div>

    <!-- Legend -->
    <div class="card legend-card">
      <div class="legend-title">Niveaux d'accès</div>
      <div class="legend-items">
        <div v-for="level in PERMISSION_LEVELS" :key="level.value" class="legend-item">
          <span class="perm-badge" :style="{ background: level.color + '18', color: level.color, borderColor: level.color + '30' }">
            {{ level.label }}
          </span>
          <span class="legend-desc">{{ level.description }}</span>
        </div>
      </div>
    </div>

    <!-- Role selector (mobile/tablet) -->
    <div class="role-selector-mobile">
      <label class="role-selector-label">Rôle :</label>
      <select v-model="selectedRole" class="input">
        <option v-for="(role, key) in roles" :key="key" :value="key">
          {{ role.label }}
        </option>
      </select>
    </div>

    <!-- Matrix desktop -->
    <div class="card matrix-card">
      <div class="table-wrap">
        <table class="table matrix-table">
          <thead>
            <tr>
              <th class="module-col">Module</th>
              <th
                v-for="(role, key) in roles"
                :key="key"
                class="role-col"
                :class="{ 'role-active': selectedRole === key }"
                @click="selectedRole = key"
              >
                <div class="role-header">
                  <span class="role-name">{{ role.label }}</span>
                  <span class="role-desc">{{ role.description }}</span>
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="mod in APP_MODULES" :key="mod.key">
              <td class="module-cell">
                <div class="module-info">
                  <component :is="getIcon(mod.icon)" :size="16" class="module-icon" />
                  <div>
                    <div class="module-name">{{ mod.label }}</div>
                    <div class="module-desc">{{ mod.description }}</div>
                  </div>
                </div>
              </td>
              <td
                v-for="(role, roleKey) in roles"
                :key="roleKey"
                class="perm-cell"
                :class="{ 'role-active': selectedRole === roleKey }"
              >
                <select
                  v-if="role.editable !== false && isDirecteur"
                  class="perm-select"
                  :value="role.permissions[mod.key] || 'none'"
                  :style="getSelectStyle(role.permissions[mod.key] || 'none')"
                  @change="onPermChange(roleKey, mod.key, $event.target.value)"
                >
                  <option v-for="level in PERMISSION_LEVELS" :key="level.value" :value="level.value">
                    {{ level.label }}
                  </option>
                </select>
                <span
                  v-else
                  class="perm-badge"
                  :style="getBadgeStyle(role.permissions[mod.key] || 'none')"
                >
                  {{ getPermLabel(role.permissions[mod.key] || 'none') }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Mobile: single role detail -->
    <div class="card mobile-role-card">
      <div class="mobile-role-header">
        <div>
          <h3>{{ roles[selectedRole]?.label }}</h3>
          <p class="mobile-role-desc">{{ roles[selectedRole]?.description }}</p>
        </div>
        <button
          v-if="roles[selectedRole]?.editable !== false && isDirecteur"
          class="btn btn-sm btn-outline"
          @click="resetSelectedRole"
        >
          <RotateCcw :size="14" />
          <span>Réinitialiser</span>
        </button>
      </div>
      <div class="mobile-perm-list">
        <div v-for="mod in APP_MODULES" :key="mod.key" class="mobile-perm-row">
          <div class="module-info">
            <component :is="getIcon(mod.icon)" :size="16" class="module-icon" />
            <span class="module-name">{{ mod.label }}</span>
          </div>
          <select
            v-if="roles[selectedRole]?.editable !== false && isDirecteur"
            class="perm-select"
            :value="roles[selectedRole]?.permissions[mod.key] || 'none'"
            :style="getSelectStyle(roles[selectedRole]?.permissions[mod.key] || 'none')"
            @change="onPermChange(selectedRole, mod.key, $event.target.value)"
          >
            <option v-for="level in PERMISSION_LEVELS" :key="level.value" :value="level.value">
              {{ level.label }}
            </option>
          </select>
          <span
            v-else
            class="perm-badge"
            :style="getBadgeStyle(roles[selectedRole]?.permissions[mod.key] || 'none')"
          >
            {{ getPermLabel(roles[selectedRole]?.permissions[mod.key] || 'none') }}
          </span>
        </div>
      </div>
    </div>

    <!-- Reset buttons -->
    <div v-if="isDirecteur" class="reset-section card">
      <div class="reset-info">
        <ShieldAlert :size="18" style="color: var(--gold); flex-shrink: 0;" />
        <div>
          <strong>Réinitialisation</strong>
          <p>Remettre un rôle à ses permissions par défaut. Le rôle Directeur ne peut pas être modifié.</p>
        </div>
      </div>
      <div class="reset-buttons">
        <button
          v-for="(role, key) in roles"
          :key="key"
          :disabled="role.editable === false"
          class="btn btn-sm"
          :class="role.editable === false ? 'btn-disabled' : 'btn-outline'"
          @click="handleReset(key)"
        >
          {{ role.label }}
        </button>
      </div>
    </div>

    <!-- Info for non-directeur -->
    <div v-if="!isDirecteur" class="info-banner card">
      <Info :size="18" style="color: var(--pr); flex-shrink: 0;" />
      <p>Seul le directeur peut modifier les permissions des rôles. Vous consultez cette page en lecture seule.</p>
    </div>

    <!-- Sticky Save Bar -->
    <div v-if="dirty && isDirecteur" class="save-bar">
      <div class="save-bar-content">
        <span class="save-message">Modifications non enregistrées</span>
        <div class="save-buttons">
          <button class="btn btn-sm btn-outline" @click="handleCancel">
            Annuler
          </button>
          <button class="btn btn-sm btn-primary" @click="handleSave">
            Enregistrer
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { usePermissionsStore, APP_MODULES, PERMISSION_LEVELS } from '../stores/permissions'
import { useAuthStore } from '../stores/auth'
import {
  LayoutDashboard, Users, Briefcase, BookOpen, FileText,
  CalendarCheck, Clock, Shield, CreditCard, BarChart3,
  Upload, Settings, ShieldCheck, RotateCcw, ShieldAlert, Info
} from 'lucide-vue-next'

const permissionsStore = usePermissionsStore()
const authStore = useAuthStore()

const roles = computed(() => permissionsStore.roles)
const selectedRole = ref('')
const dirty = ref(false)

const isDirecteur = computed(() => {
  const role = authStore.userProfile?.role
  return role === 'directeur' || role === 'admin'
})

const iconMap = {
  LayoutDashboard, Briefcase, Users, BookOpen, FileText,
  CalendarCheck, Clock, Shield, CreditCard, BarChart3,
  Upload, Settings, ShieldCheck
}

const getIcon = (iconName) => iconMap[iconName] || Shield

const getPermLevel = (value) => PERMISSION_LEVELS.find(l => l.value === value)

const getPermLabel = (value) => getPermLevel(value)?.label || 'Aucun'

const getBadgeStyle = (value) => {
  const level = getPermLevel(value)
  if (!level) return {}
  return {
    background: level.color + '18',
    color: level.color,
    borderColor: level.color + '30'
  }
}

const getSelectStyle = (value) => {
  const level = getPermLevel(value)
  if (!level) return {}
  return {
    background: level.color + '12',
    color: level.color,
    borderColor: level.color + '40'
  }
}

const onPermChange = (roleKey, moduleKey, value) => {
  permissionsStore.updatePermission(roleKey, moduleKey, value)
  dirty.value = true
}

const handleReset = (roleKey) => {
  if (confirm(`Remettre le r\u00f4le "${roles.value[roleKey]?.label}" \u00e0 ses permissions par d\u00e9faut ?`)) {
    permissionsStore.resetRole(roleKey)
  }
}

const resetSelectedRole = () => {
  handleReset(selectedRole.value)
}

const handleSave = () => {
  dirty.value = false
}

const handleCancel = () => {
  // Reload roles from store to discard changes
  permissionsStore.loadRoles()
  dirty.value = false
}

onMounted(() => {
  permissionsStore.loadRoles()
})
</script>

<style scoped>
.roles-page {
  padding: 0;
}

/* Legend */
.legend-card {
  margin-bottom: 24px;
  padding: 16px 20px;
}
.legend-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--tx2);
  margin-bottom: 10px;
}
.legend-items {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
}
.legend-item {
  display: flex;
  align-items: center;
  gap: 8px;
}
.legend-desc {
  font-size: 12px;
  color: var(--tx3);
}

/* Permission badge */
.perm-badge {
  display: inline-block;
  padding: 3px 10px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  border: 1px solid;
  white-space: nowrap;
}

/* Matrix */
.matrix-card {
  margin-bottom: 24px;
  overflow: hidden;
}
.matrix-table {
  font-size: 13px;
  border-collapse: separate;
  border-spacing: 0;
}
.matrix-table thead th {
  position: sticky;
  top: 0;
  z-index: 2;
  background: var(--bg);
}
.module-col {
  min-width: 260px;
  position: sticky;
  left: 0;
  z-index: 3;
  background: var(--bg);
  padding-left: 20px;
  padding-right: 24px;
}
.role-col {
  min-width: 130px;
  text-align: center;
  cursor: pointer;
  transition: background 0.15s ease;
  vertical-align: top;
  padding: 12px 10px;
}
.role-col:hover {
  background: var(--pr-bg, rgba(var(--pr-rgb), 0.04));
}
.role-col.role-active {
  background: var(--pr-bg, rgba(var(--pr-rgb), 0.06));
}
.role-header {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.role-name {
  font-weight: 600;
  font-size: 13px;
  color: var(--tx);
}
.role-desc {
  font-size: 10px;
  color: var(--tx3);
  line-height: 1.3;
}
.module-cell {
  position: sticky;
  left: 0;
  background: #fff;
  z-index: 1;
  padding-left: 20px;
  padding-right: 24px;
  padding-top: 10px;
  padding-bottom: 10px;
}
.module-info {
  display: flex;
  align-items: center;
  gap: 12px;
}
.module-icon {
  color: var(--tx3);
  flex-shrink: 0;
}
.module-name {
  font-weight: 500;
  color: var(--tx);
  font-size: 13px;
}
.module-desc {
  font-size: 11px;
  color: var(--tx3);
  line-height: 1.3;
}
.perm-cell {
  text-align: center;
  vertical-align: middle;
  padding: 8px 6px;
}
.perm-cell.role-active {
  background: var(--pr-bg, rgba(var(--pr-rgb), 0.03));
}

/* Permission select dropdown */
.perm-select {
  appearance: none;
  -webkit-appearance: none;
  border: 1px solid;
  border-radius: 6px;
  padding: 3px 8px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  text-align: center;
  outline: none;
  min-width: 80px;
  transition: all 0.15s ease;
}
.perm-select:hover {
  opacity: 0.85;
}
.perm-select:focus {
  box-shadow: 0 0 0 2px rgba(var(--pr-rgb), 0.2);
}

/* Mobile role selector */
.role-selector-mobile {
  display: none;
  margin-bottom: 16px;
  align-items: center;
  gap: 10px;
}
.role-selector-label {
  font-weight: 600;
  font-size: 14px;
  color: var(--tx);
  white-space: nowrap;
}

/* Mobile role card */
.mobile-role-card {
  display: none;
  margin-bottom: 24px;
}
.mobile-role-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
}
.mobile-role-header h3 {
  font-size: 16px;
  font-weight: 600;
  color: var(--tx);
  margin: 0;
}
.mobile-role-desc {
  font-size: 12px;
  color: var(--tx3);
  margin: 2px 0 0;
}
.mobile-perm-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.mobile-perm-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 0;
  border-bottom: 1px solid var(--brd);
}
.mobile-perm-row:last-child {
  border-bottom: none;
}

/* Reset section */
.reset-section {
  margin-bottom: 24px;
  padding: 16px 20px;
}
.reset-info {
  display: flex;
  gap: 12px;
  margin-bottom: 14px;
}
.reset-info strong {
  font-size: 14px;
  color: var(--tx);
}
.reset-info p {
  font-size: 12px;
  color: var(--tx3);
  margin: 2px 0 0;
}
.reset-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.btn-disabled {
  opacity: 0.4;
  cursor: not-allowed;
  background: var(--bg2);
  color: var(--tx3);
  border: 1px solid var(--brd);
}

/* Info banner */
.info-banner {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 20px;
  background: rgba(var(--pr-rgb), 0.04);
  border: 1px solid rgba(var(--pr-rgb), 0.12);
  margin-bottom: 24px;
}
.info-banner p {
  font-size: 13px;
  color: var(--tx2);
  margin: 0;
}

/* Save bar */
.save-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: var(--bg);
  border-top: 1px solid var(--brd);
  box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.08);
  z-index: 100;
  animation: slideUp 0.3s ease;
}

@keyframes slideUp {
  from {
    transform: translateY(100%);
  }
  to {
    transform: translateY(0);
  }
}

.save-bar-content {
  max-width: 1400px;
  margin: 0 auto;
  padding: 12px 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
}

.save-message {
  font-size: 13px;
  font-weight: 500;
  color: var(--tx2);
}

.save-buttons {
  display: flex;
  gap: 8px;
}

/* Responsive */
@media (max-width: 1024px) {
  .matrix-card {
    display: none;
  }
  .role-selector-mobile {
    display: flex;
  }
  .mobile-role-card {
    display: block;
  }

  .save-bar-content {
    flex-direction: column;
    align-items: stretch;
    gap: 10px;
  }

  .save-buttons {
    width: 100%;
  }

  .save-buttons .btn {
    flex: 1;
  }
}

/* ═══ MOBILE (TABLET & PHONE) RESPONSIVENESS ═══ */
@media (max-width: 768px) {
  /* Hide permission matrix on mobile, show simple role list only */
  .matrix-card { display: none; }
  .role-selector-mobile { display: flex; }
  .mobile-role-card { display: block; }

  /* Page layout on mobile */
  .roles-page { padding: 8px; }
  .page-header { flex-direction: column; align-items: flex-start; gap: 12px; }
  .page-header-text h1 { font-size: 24px; margin-bottom: 4px; }

  /* Mobile role list on small screens */
  .role-selector-mobile { flex-direction: column; gap: 12px; }
  .role-select-item { padding: 12px; margin-bottom: 8px; }
  .role-select-item button { width: 100%; text-align: left; font-size: 14px; padding: 12px; }

  /* Mobile role card touch-friendly */
  .mobile-role-card { margin-bottom: 12px; padding: 12px; }
  .mobile-role-header { margin-bottom: 10px; }
  .mobile-role-header h3 { font-size: 15px; margin: 0; }
  .mobile-role-desc { font-size: 11px; }

  /* Permission list on mobile */
  .mobile-perm-list { gap: 6px; }
  .mobile-perm-row { padding: 10px 0; font-size: 13px; min-height: 44px; display: flex; align-items: center; }
  .mobile-perm-row input[type="checkbox"] { width: 18px; height: 18px; cursor: pointer; }

  /* Form inputs touch-friendly */
  .field { margin-bottom: 12px; }
  .input, select { width: 100%; font-size: 16px; min-height: 44px; padding: 12px; }

  /* Reset section on mobile */
  .reset-section { padding: 12px 16px; margin-bottom: 16px; }
  .reset-buttons { flex-direction: column; gap: 8px; }
  .reset-buttons .btn { width: 100%; }

  /* Info banner */
  .info-banner { padding: 12px 16px; gap: 10px; margin-bottom: 16px; font-size: 12px; }
  .info-banner p { font-size: 12px; }

  /* Save bar responsive */
  .save-bar { position: relative; bottom: auto; left: auto; right: auto; margin-top: 16px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
  .save-bar-content { flex-direction: column; align-items: stretch; padding: 12px 16px; gap: 10px; }
  .save-message { font-size: 12px; }
  .save-buttons { width: 100%; flex-direction: column; }
  .save-buttons .btn { width: 100%; min-height: 44px; }

  /* Buttons */
  .btn { min-height: 44px; font-size: 14px; padding: 12px 16px; }
  .btn-sm { min-height: 40px; padding: 8px 12px; font-size: 12px; }
  .btn-disabled { opacity: 0.4; padding: 12px 16px; }

  /* Modal responsiveness (if any) */
  .modal-card { width: 90%; max-width: 100%; }
  .modal-body { padding: 16px; }
}
</style>
