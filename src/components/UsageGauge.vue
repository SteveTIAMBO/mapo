<template>
  <div class="ug">
    <div class="ug-head">
      <div>
        <h3 class="ug-title">Utilisation de l'IA</h3>
        <p class="ug-sub">Jauge hebdomadaire de crédits · réinitialisée chaque semaine</p>
      </div>
      <div class="ug-plan-badge">{{ usage.plan.label }}</div>
    </div>

    <div class="ug-gauge">
      <div class="ug-gauge-top">
        <span>{{ fmt(usage.used) }} / {{ fmt(usage.cap) }} crédits</span>
        <span class="ug-restant" :class="niveauClass">{{ fmt(usage.restant) }} restants</span>
      </div>
      <div class="ug-bar"><div class="ug-bar-fill" :class="niveauClass" :style="{ width: usage.pourcentage + '%' }"></div></div>
      <p class="ug-reset">Semaine {{ usage.week }} · se réinitialise automatiquement en début de semaine. Au-delà du plafond : passez à un palier supérieur ou rechargez des crédits.</p>
    </div>

    <div class="ug-plans">
      <div v-for="p in usage.PLANS" :key="p.key" class="ug-planrow" :class="{ current: p.key === usage.planKey }">
        <div class="ug-planinfo">
          <div class="ug-planname">{{ p.label }}<span v-if="p.key === usage.planKey" class="ug-cur">actuel</span></div>
          <div class="ug-plancap">{{ fmt(p.capSemaine) }} crédits/semaine</div>
        </div>
        <div class="ug-planprice">{{ p.prixMois ? fmt(p.prixMois) + ' FCFA/mois' : 'Inclus' }}</div>
        <button v-if="p.key !== usage.planKey" class="ug-planbtn" type="button" @click="usage.setPlan(p.key)">Choisir</button>
        <span v-else class="ug-planok">✓</span>
      </div>
    </div>

    <div class="ug-actions">
      <button class="ug-recharge" type="button" @click="usage.acheterTokens(50000)">Recharger 50 000 crédits</button>
      <span class="ug-note">Le rachat de crédits (PAYG) est ajouté à la jauge de la semaine en cours.</span>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useUsageStore } from '../stores/usage'

const usage = useUsageStore()
const niveauClass = computed(() => usage.pourcentage >= 90 ? 'is-danger' : usage.pourcentage >= 70 ? 'is-warn' : 'is-ok')
function fmt(n) { return (n ?? 0).toLocaleString('fr-FR') }
</script>

<style scoped>
.ug { background: #fff; border: 1px solid var(--border, rgba(20,32,64,.08)); border-radius: 16px; padding: 22px 24px; }
.ug-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 18px; }
.ug-title { font-family: 'Poppins', sans-serif; font-weight: 700; font-size: 17px; color: var(--text, #1A1D1F); margin: 0; }
.ug-sub { font-size: 12.5px; color: var(--muted, #6b7280); margin: 3px 0 0; }
.ug-plan-badge { background: rgba(var(--pr-rgb), .12); color: var(--pr); font-weight: 700; font-size: 12.5px; border-radius: 20px; padding: 4px 14px; white-space: nowrap; }
.ug-gauge-top { display: flex; justify-content: space-between; font-size: 13.5px; color: var(--text, #23262E); font-weight: 600; margin-bottom: 8px; }
.ug-restant.is-ok { color: #0E7C5A; } .ug-restant.is-warn { color: #B45309; } .ug-restant.is-danger { color: #DC2626; }
.ug-bar { height: 10px; background: var(--input-bg, rgba(20,32,64,.06)); border-radius: 20px; overflow: hidden; }
.ug-bar-fill { height: 100%; border-radius: 20px; transition: width .3s ease; }
.ug-bar-fill.is-ok { background: var(--pr); } .ug-bar-fill.is-warn { background: #D97706; } .ug-bar-fill.is-danger { background: #DC2626; }
.ug-reset { font-size: 12px; color: var(--muted, #6b7280); margin: 10px 0 0; line-height: 1.5; }
.ug-plans { margin: 20px 0 0; border-top: 1px solid var(--border, rgba(20,32,64,.06)); padding-top: 14px; }
.ug-planrow { display: flex; align-items: center; gap: 14px; padding: 10px 0; border-bottom: 1px solid var(--border, rgba(20,32,64,.05)); }
.ug-planrow.current { }
.ug-planinfo { flex: 1; }
.ug-planname { font-weight: 700; font-size: 13.5px; color: var(--text, #1A1D1F); }
.ug-cur { margin-left: 8px; font-size: 10.5px; font-weight: 700; color: var(--pr); background: rgba(var(--pr-rgb), .10); border-radius: 20px; padding: 1px 8px; }
.ug-plancap { font-size: 12px; color: var(--muted, #6b7280); }
.ug-planprice { font-size: 13px; font-weight: 600; color: var(--text, #23262E); }
.ug-planbtn { background: var(--pr); color: #fff; border: none; border-radius: 8px; font-family: inherit; font-weight: 700; font-size: 12px; padding: 6px 14px; cursor: pointer; }
.ug-planok { color: #0E7C5A; font-weight: 800; width: 40px; text-align: center; }
.ug-actions { display: flex; align-items: center; gap: 12px; margin-top: 16px; flex-wrap: wrap; }
.ug-recharge { background: none; border: 1.5px solid var(--pr); color: var(--pr); border-radius: 9px; font-family: inherit; font-weight: 700; font-size: 12.5px; padding: 8px 16px; cursor: pointer; }
.ug-note { font-size: 11.5px; color: var(--muted, #9AA2B1); }
</style>
