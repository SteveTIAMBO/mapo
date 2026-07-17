<template>
  <div class="sr">
    <div class="sr-intro">
      <h1 class="sr-h1">{{ t('sup.roles.title') }}</h1>
      <p class="sr-sub">{{ t('sup.roles.subtitle') }}</p>
    </div>

    <!-- Légende des niveaux -->
    <div class="sr-card sr-legend">
      <span class="sr-legend-title">{{ t('sup.roles.levelsTitle') }}</span>
      <span v-for="lvl in levels" :key="lvl.value" class="sr-legend-item">
        <span class="sr-badge" :style="badgeStyle(lvl.value)">{{ lvl.label }}</span>
        <span class="sr-legend-desc">{{ lvl.description }}</span>
      </span>
    </div>

    <p v-if="!isAdmin" class="sr-readonly">
      {{ t('sup.roles.readonly') }}
    </p>

    <!-- Matrice -->
    <div class="sr-card sr-matrix-wrap">
      <table class="sr-table">
        <thead>
          <tr>
            <th class="sr-mod-col">{{ t('sup.roles.thModule') }}</th>
            <th v-for="(role, key) in roles" :key="key" class="sr-role-col">
              <span class="sr-role-name">{{ role.label }}</span>
              <span class="sr-role-desc">{{ role.description }}</span>
              <button v-if="isAdmin && role.custom" type="button" class="sr-role-del" @click="deleteTarget = key">{{ t('sup.roles.deleteRole') }}</button>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="mod in modules" :key="mod.key">
            <td class="sr-mod-cell">
              <span class="sr-mod-name">{{ mod.label }}</span>
              <span class="sr-mod-desc">{{ mod.description }}</span>
            </td>
            <td v-for="(role, roleKey) in roles" :key="roleKey" class="sr-perm-cell">
              <select
                v-if="isAdmin && role.editable !== false"
                class="sr-select"
                :value="role.permissions[mod.key] || 'none'"
                :style="selectStyle(role.permissions[mod.key] || 'none')"
                @change="onChange(roleKey, mod.key, $event.target.value)"
              >
                <option v-for="lvl in levels" :key="lvl.value" :value="lvl.value">{{ lvl.label }}</option>
              </select>
              <span v-else class="sr-badge" :style="badgeStyle(role.permissions[mod.key] || 'none')">
                {{ permLabel(role.permissions[mod.key] || 'none') }}
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Créer un rôle personnalisé -->
    <div v-if="isAdmin" class="sr-card sr-create">
      <div class="sr-create-head">
        <strong>{{ t('sup.roles.createTitle') }}</strong>
        <p>{{ t('sup.roles.createDesc') }}</p>
      </div>
      <div class="sr-create-form">
        <input v-model="newRole.label" type="text" class="sr-input" :placeholder="t('sup.roles.roleName')" @keyup.enter="createRole" />
        <input v-model="newRole.description" type="text" class="sr-input sr-input-grow" :placeholder="t('sup.roles.roleDesc')" @keyup.enter="createRole" />
        <select v-model="newRole.baseKey" class="sr-input sr-input-select">
          <option value="">{{ t('sup.roles.fromScratch') }}</option>
          <option v-for="(role, key) in roles" :key="key" :value="key">{{ t('sup.roles.copyFrom', { label: role.label }) }}</option>
        </select>
        <button type="button" class="sr-btn-primary" :disabled="!newRole.label.trim()" @click="createRole">{{ t('sup.roles.createBtn') }}</button>
      </div>
    </div>

    <!-- Réinitialisation par rôle -->
    <div v-if="isAdmin" class="sr-card sr-reset">
      <div class="sr-reset-head">
        <strong>{{ t('sup.roles.resetTitle') }}</strong>
        <p>{{ t('sup.roles.resetDesc') }}</p>
      </div>
      <div class="sr-reset-btns">
        <button
          v-for="(role, key) in roles"
          :key="key"
          type="button"
          class="sr-reset-btn"
          :disabled="role.editable === false"
          @click="askReset(key)"
        >
          {{ role.label }}
        </button>
      </div>
    </div>

    <!-- Confirmation de réinitialisation (popup in-app) -->
    <transition name="sr-fade">
      <div v-if="resetTarget" class="sr-overlay" @click.self="resetTarget = null">
        <div class="sr-modal">
          <h2 class="sr-modal-title">{{ t('sup.roles.resetConfirmTitle', { label: roles[resetTarget]?.label }) }}</h2>
          <p class="sr-modal-txt">{{ t('sup.roles.resetConfirmTxt') }}</p>
          <div class="sr-modal-actions">
            <button type="button" class="sr-btn-ghost" @click="resetTarget = null">{{ t('sup.roles.cancel') }}</button>
            <button type="button" class="sr-btn-primary" @click="confirmReset">{{ t('sup.roles.reset') }}</button>
          </div>
        </div>
      </div>
    </transition>

    <!-- Confirmation de suppression d'un rôle personnalisé -->
    <transition name="sr-fade">
      <div v-if="deleteTarget" class="sr-overlay" @click.self="deleteTarget = null">
        <div class="sr-modal">
          <h2 class="sr-modal-title">{{ t('sup.roles.deleteConfirmTitle', { label: roles[deleteTarget]?.label }) }}</h2>
          <p class="sr-modal-txt">{{ t('sup.roles.deleteConfirmTxt') }}</p>
          <div class="sr-modal-actions">
            <button type="button" class="sr-btn-ghost" @click="deleteTarget = null">{{ t('sup.roles.cancel') }}</button>
            <button type="button" class="sr-btn-primary" @click="confirmDelete">{{ t('sup.roles.delete') }}</button>
          </div>
        </div>
      </div>
    </transition>

    <div v-if="savedHint" class="sr-toast">{{ t('sup.roles.savedToast') }}</div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  useSuperieurPermissionsStore,
  SUP_APP_MODULES,
  SUP_PERMISSION_LEVELS,
} from '../../stores/superieurPermissions'
import { useSuperieurAuthStore } from '../../stores/superieurAuth'

const { t } = useI18n({ useScope: 'global' })
const perms = useSuperieurPermissionsStore()
const authSup = useSuperieurAuthStore()

const modules = SUP_APP_MODULES
const levels = SUP_PERMISSION_LEVELS
const roles = computed(() => perms.roles)
const isAdmin = computed(() => authSup.role === 'admin')

const resetTarget = ref(null)
const deleteTarget = ref(null)
const savedHint = ref(false)
const newRole = ref({ label: '', description: '', baseKey: '' })

function levelOf(v) { return SUP_PERMISSION_LEVELS.find((l) => l.value === v) }
function permLabel(v) { return levelOf(v)?.label || 'Aucun' }
function badgeStyle(v) {
  const l = levelOf(v)
  if (!l) return {}
  return { background: l.color + '18', color: l.color, borderColor: l.color + '30' }
}
function selectStyle(v) {
  const l = levelOf(v)
  if (!l) return {}
  return { background: l.color + '12', color: l.color, borderColor: l.color + '40' }
}

function flashSaved() {
  savedHint.value = true
  setTimeout(() => { savedHint.value = false }, 1600)
}
function onChange(roleKey, moduleKey, value) {
  perms.updatePermission(roleKey, moduleKey, value)
  flashSaved()
}
function askReset(roleKey) {
  if (roles.value[roleKey]?.editable === false) return
  resetTarget.value = roleKey
}
function confirmReset() {
  if (resetTarget.value) {
    perms.resetRole(resetTarget.value)
    resetTarget.value = null
    flashSaved()
  }
}
function createRole() {
  const key = perms.addRole({ ...newRole.value })
  if (key) {
    newRole.value = { label: '', description: '', baseKey: '' }
    flashSaved()
  }
}
function confirmDelete() {
  if (deleteTarget.value) {
    perms.removeRole(deleteTarget.value)
    deleteTarget.value = null
    flashSaved()
  }
}

onMounted(() => perms.loadRoles())
</script>

<style scoped>
.sr { display: flex; flex-direction: column; gap: 20px; }
.sr-intro { padding: 8px 0; }
.sr-h1 { font-family: 'Poppins', sans-serif; font-size: 26px; font-weight: 800; color: #1A1D1F; margin: 0 0 4px; }
.sr-sub { font-size: 14px; color: #6F767E; margin: 0; line-height: 1.5; max-width: 720px; }

.sr-card { background: #fff; border: 1px solid #ECECE8; border-radius: 14px; padding: 18px 20px; }

.sr-legend { display: flex; flex-wrap: wrap; align-items: center; gap: 16px; }
.sr-legend-title { font-family: 'Poppins', sans-serif; font-size: 12px; font-weight: 700; color: #6F767E; text-transform: uppercase; letter-spacing: 0.04em; }
.sr-legend-item { display: inline-flex; align-items: center; gap: 8px; }
.sr-legend-desc { font-size: 12px; color: #9AA0A6; }

.sr-badge { display: inline-block; padding: 3px 10px; border-radius: 6px; font-size: 12px; font-weight: 700; border: 1px solid; white-space: nowrap; }

.sr-readonly {
  font-size: 13px; color: #6F767E; font-style: italic;
  padding: 11px 16px; background: #F8F8F4; border: 1px solid #ECECE8; border-radius: 10px; margin: 0;
}

.sr-matrix-wrap { padding: 0; overflow-x: auto; }
.sr-table { width: 100%; border-collapse: separate; border-spacing: 0; font-size: 13px; }
.sr-table thead th {
  position: sticky; top: 0; background: #F8F8F4;
  text-align: center; padding: 12px 12px; border-bottom: 1px solid #ECECE8; vertical-align: top;
}
.sr-mod-col { text-align: left !important; min-width: 240px; padding-left: 20px !important; }
.sr-role-col { min-width: 150px; }
.sr-role-name { display: block; font-family: 'Poppins', sans-serif; font-weight: 700; font-size: 13px; color: #1A1D1F; }
.sr-role-desc { display: block; font-size: 10.5px; color: #9AA0A6; line-height: 1.3; margin-top: 2px; }
.sr-mod-cell { padding: 11px 20px; border-bottom: 1px solid #F0F0EC; }
.sr-mod-name { display: block; font-weight: 600; color: #1A1D1F; font-size: 13px; }
.sr-mod-desc { display: block; font-size: 11px; color: #9AA0A6; line-height: 1.3; margin-top: 1px; }
.sr-perm-cell { text-align: center; padding: 8px 10px; border-bottom: 1px solid #F0F0EC; }
.sr-table tbody tr:last-child .sr-mod-cell,
.sr-table tbody tr:last-child .sr-perm-cell { border-bottom: none; }

.sr-select {
  appearance: none; -webkit-appearance: none;
  border: 1.5px solid; border-radius: 7px; padding: 5px 10px;
  font-size: 12px; font-weight: 700; cursor: pointer; text-align: center; outline: none; min-width: 92px;
  font-family: 'Poppins', sans-serif;
}
.sr-select:focus { box-shadow: 0 0 0 3px rgba(21, 88, 176, 0.16); }

.sr-reset { display: flex; align-items: center; justify-content: space-between; gap: 18px; flex-wrap: wrap; }
.sr-reset-head strong { font-family: 'Poppins', sans-serif; font-size: 14px; color: #1A1D1F; }
.sr-reset-head p { font-size: 12px; color: #6F767E; margin: 2px 0 0; }
.sr-reset-btns { display: flex; flex-wrap: wrap; gap: 8px; }
.sr-reset-btn {
  padding: 8px 14px; border-radius: 9px; border: 1.5px solid #DCDCD8; background: #fff;
  font-family: 'Poppins', sans-serif; font-size: 12.5px; font-weight: 600; color: #5B6472; cursor: pointer;
}
.sr-reset-btn:hover:not(:disabled) { background: #F4F4F0; color: #1A1D1F; }
.sr-reset-btn:disabled { opacity: 0.4; cursor: not-allowed; }

.sr-create { display: flex; flex-direction: column; gap: 12px; }
.sr-create-head strong { font-family: 'Poppins', sans-serif; font-size: 14px; color: #1A1D1F; }
.sr-create-head p { font-size: 12px; color: #6F767E; margin: 2px 0 0; }
.sr-create-form { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; }
.sr-input { padding: 9px 12px; border: 1.5px solid #DCDCD8; border-radius: 9px; font-size: 13.5px; color: #1A1D1F; font-family: inherit; min-width: 170px; }
.sr-input::placeholder { color: #9AA0A6; }
.sr-input:focus { outline: none; border-color: var(--pr, #1558B0); box-shadow: 0 0 0 3px rgba(21, 88, 176, 0.14); }
.sr-input-grow { flex: 1; min-width: 200px; }
.sr-input-select { background: #fff; cursor: pointer; }
.sr-role-del { display: block; margin: 6px auto 0; background: none; border: none; color: #B23B3B; font-size: 11px; font-weight: 600; cursor: pointer; text-decoration: underline; }

.sr-overlay { position: fixed; inset: 0; z-index: 1000; background: rgba(12, 45, 90, 0.55); backdrop-filter: blur(3px); display: flex; align-items: center; justify-content: center; padding: 18px; }
.sr-modal { width: 100%; max-width: 420px; background: #fff; border-radius: 16px; padding: 22px 24px; box-shadow: 0 24px 70px rgba(0, 0, 0, 0.3); }
.sr-modal-title { font-family: 'Poppins', sans-serif; font-size: 16px; font-weight: 800; color: #14203f; margin: 0 0 8px; }
.sr-modal-txt { font-size: 13.5px; color: #5B6472; line-height: 1.5; margin: 0 0 18px; }
.sr-modal-actions { display: flex; justify-content: flex-end; gap: 10px; }
.sr-btn-ghost { padding: 9px 16px; border: 1.5px solid #E2E7F0; border-radius: 10px; background: #fff; font-family: 'Poppins', sans-serif; font-weight: 600; font-size: 13px; color: #5B6472; cursor: pointer; }
.sr-btn-primary { padding: 9px 18px; border: none; border-radius: 10px; background: var(--pr, #1558B0); color: #fff; font-family: 'Poppins', sans-serif; font-weight: 700; font-size: 13px; cursor: pointer; }

.sr-toast {
  position: fixed; bottom: 22px; left: 50%; transform: translateX(-50%);
  background: #1B8A5A; color: #fff; padding: 10px 20px; border-radius: 100px;
  font-size: 13px; font-weight: 700; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2); z-index: 1100;
}

.sr-fade-enter-active, .sr-fade-leave-active { transition: opacity 0.2s ease; }
.sr-fade-enter-from, .sr-fade-leave-to { opacity: 0; }
</style>
