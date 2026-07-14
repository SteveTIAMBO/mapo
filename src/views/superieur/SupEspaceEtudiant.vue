<template>
  <div class="see">
    <!-- En-tête -->
    <div class="see-hero">
      <div class="see-avatar">{{ initials }}</div>
      <div class="see-hero-info">
        <div class="see-hello">Bonjour {{ moi.prenom }}</div>
        <div class="see-sub">{{ moi.programmeNom }} · {{ moi.anneeNom }}<span v-if="campusVille"> · Campus de {{ campusVille }}</span></div>
        <div class="see-mat">Matricule {{ moi.matricule }}</div>
      </div>
    </div>

    <!-- Indicateurs -->
    <div class="see-kpis">
      <div class="see-kpi">
        <div class="see-kpi-lab">Crédits acquis</div>
        <div class="see-kpi-val">{{ moi.ectsValides }}<span> / {{ moi.ectsRequis }}</span></div>
        <div class="see-bar"><div class="see-bar-fill" :style="{ width: pct + '%' }"></div></div>
      </div>
      <div class="see-kpi">
        <div class="see-kpi-lab">Moyenne du semestre</div>
        <div class="see-kpi-val">{{ releve ? releve.moyenne.toFixed(2) : (moi.moyenne != null ? moi.moyenne.toFixed(2) : '—') }}<span>/20</span></div>
        <div class="see-kpi-foot" :class="mentionOk ? 'is-ok' : 'is-warn'">{{ releve && releve.mention ? releve.mention : (mentionOk ? 'En bonne voie' : 'À consolider') }}</div>
      </div>
      <div class="see-kpi">
        <div class="see-kpi-lab">UE ce semestre</div>
        <div class="see-kpi-val">{{ releve ? releve.lignes.length : 0 }}</div>
        <div class="see-kpi-foot">semestre {{ releve ? releve.semestre : '—' }}</div>
      </div>
      <div class="see-kpi see-kpi-scol">
        <div class="see-kpi-lab">Scolarité</div>
        <div class="see-kpi-val see-scol-reste">{{ formatFcfa(scolarite.reste) }}<span> FCFA</span></div>
        <div class="see-kpi-foot">reste à payer sur {{ formatFcfa(scolarite.total) }}</div>
      </div>
    </div>

    <div class="see-grid">
      <!-- Mon relevé -->
      <section class="see-card see-card-wide">
        <h2 class="see-h2">Mon relevé de notes</h2>
        <table v-if="releve && releve.lignes.length" class="see-table">
          <thead><tr><th>UE</th><th>Intitulé</th><th class="num">Crédits</th><th class="num">Note</th><th>Statut</th></tr></thead>
          <tbody>
            <tr v-for="l in releve.lignes" :key="l.ueId">
              <td class="see-code">{{ l.ueCode }}</td>
              <td>{{ l.ueIntitule }}</td>
              <td class="num">{{ l.ects }}</td>
              <td class="num"><span :class="l.note != null && l.note < 10 ? 'is-bad' : ''">{{ l.note != null ? l.note.toFixed(1) : '—' }}</span></td>
              <td><span class="see-vld" :class="l.validee ? 'is-ok' : 'is-warn'">{{ l.validee ? 'Validée' : (l.note != null ? 'Non validée' : 'En attente') }}</span></td>
            </tr>
          </tbody>
        </table>
        <p v-else class="see-empty">Relevé bientôt disponible.</p>
      </section>

      <!-- MIAPO+ (masqué si tuteur MIAPO+ désactivé dans Paramètres → MIAPO) -->
      <section v-if="miapoGlobal.isEnabled('tuteur')" class="see-card see-miapo">
        <div class="see-miapo-badge">MIAPO+</div>
        <h2 class="see-h2 see-miapo-h2">Ton tuteur intelligent</h2>
        <p class="see-miapo-txt">Révise tes UE avec MIAPO+ : quiz adaptatifs, parcours de révision personnalisé et suivi de ta progression, disponible 24h/24.</p>
        <ul class="see-miapo-list">
          <li>Quiz ciblés sur tes matières faibles</li>
          <li>Analyse de tes copies d'examen</li>
          <li>Plan de révision avant les partiels</li>
        </ul>
        <a class="see-miapo-cta" href="https://miapo.app-edufrem.com" target="_blank" rel="noopener">Ouvrir MIAPO+</a>
      </section>
    </div>

    <UsageGauge />
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useSuperieurStore, CAMPUS } from '../../stores/superieur'
import { useSuperieurMiapoStore } from '../../stores/superieurMiapo'
import UsageGauge from '../../components/UsageGauge.vue'

const store = useSuperieurStore()
const miapoGlobal = useSuperieurMiapoStore()
// Étudiant de démonstration : un profil crédible (bon dossier) pour la démo.
const moi = computed(() =>
  store.etudiants.find((e) => e.moyenne >= 13 && e.ectsValides > 30 && e.niveau !== 'BTS') ||
  store.etudiants.find((e) => e.moyenne >= 12) ||
  store.etudiants[0]
).value

const releve = computed(() => (moi ? store.releveEtudiant(moi.id) : null)).value
const campusVille = computed(() => (CAMPUS.find((c) => c.id === (moi && moi.campus)) || {}).ville || '').value

const initials = (moi ? (moi.nomComplet || '') : '').split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()
const pct = moi && moi.ectsRequis ? Math.round((moi.ectsValides / moi.ectsRequis) * 100) : 0
const mentionOk = ((releve ? releve.moyenne : (moi && moi.moyenne)) || 0) >= 10

// Scolarité : estimation par niveau (démo).
const TARIF = { BTS: 450000, Licence: 550000, Master: 750000 }
const scolarite = computed(() => {
  const total = TARIF[moi && moi.niveau] || 550000
  const paye = Math.round(total * (0.55 + ((moi ? moi.ectsValides : 0) % 20) / 100))
  return { total, paye, reste: Math.max(0, total - paye) }
}).value

function formatFcfa(n) { return (n ?? 0).toLocaleString('fr-FR') }
</script>

<style scoped>
.see { display: flex; flex-direction: column; gap: 18px; }
.see-hero { display: flex; align-items: center; gap: 18px; background: linear-gradient(135deg, rgba(var(--pr-rgb), 0.10), rgba(var(--pr-rgb), 0.02)); border: 1px solid var(--border, rgba(20,32,64,.08)); border-radius: 18px; padding: 22px 24px; }
.see-avatar { width: 62px; height: 62px; border-radius: 16px; background: var(--pr); color: #fff; display: flex; align-items: center; justify-content: center; font-family: 'Poppins', sans-serif; font-weight: 800; font-size: 24px; flex-shrink: 0; }
.see-hello { font-family: 'Poppins', sans-serif; font-weight: 800; font-size: 24px; color: var(--text, #1A1D1F); }
.see-sub { font-size: 14px; color: var(--muted, #5b6472); margin-top: 3px; }
.see-mat { font-size: 12.5px; color: var(--pr); font-weight: 600; margin-top: 2px; }
.see-kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; }
.see-kpi { background: #fff; border: 1px solid var(--border, rgba(20,32,64,.08)); border-radius: 14px; padding: 16px 18px; }
.see-kpi-lab { font-size: 11.5px; text-transform: uppercase; letter-spacing: .4px; color: var(--muted, #9AA2B1); }
.see-kpi-val { font-family: 'Poppins', sans-serif; font-weight: 800; font-size: 26px; color: var(--text, #1A1D1F); margin-top: 4px; }
.see-kpi-val span { font-size: 14px; color: var(--muted, #9AA2B1); font-weight: 600; }
.see-scol-reste { color: #B45309; }
.see-kpi-foot { font-size: 12px; color: var(--muted, #6b7280); margin-top: 3px; }
.see-kpi-foot.is-ok { color: #0E7C5A; } .see-kpi-foot.is-warn { color: #B45309; }
.see-bar { height: 6px; background: var(--input-bg, rgba(20,32,64,.06)); border-radius: 20px; margin-top: 10px; overflow: hidden; }
.see-bar-fill { height: 100%; background: var(--pr); border-radius: 20px; }
.see-grid { display: grid; grid-template-columns: 1.7fr 1fr; gap: 16px; align-items: start; }
.see-card { background: #fff; border: 1px solid var(--border, rgba(20,32,64,.08)); border-radius: 16px; padding: 20px 22px; }
.see-h2 { font-family: 'Poppins', sans-serif; font-weight: 700; font-size: 16px; color: var(--text, #1A1D1F); margin: 0 0 14px; }
.see-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.see-table th { text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: .4px; color: var(--muted, #9AA2B1); padding: 8px 8px; border-bottom: 1px solid var(--border, rgba(20,32,64,.08)); }
.see-table th.num, .see-table td.num { text-align: right; }
.see-table td { padding: 9px 8px; border-bottom: 1px solid var(--border, rgba(20,32,64,.05)); color: var(--text, #23262E); }
.see-code { font-weight: 700; color: var(--pr); }
.see-table td .is-bad { color: #DC2626; font-weight: 700; }
.see-vld { font-size: 11px; font-weight: 700; border-radius: 20px; padding: 2px 8px; }
.see-vld.is-ok { background: rgba(14,124,90,.12); color: #0E7C5A; }
.see-vld.is-warn { background: rgba(217,119,6,.14); color: #B45309; }
.see-empty { color: var(--muted, #6b7280); font-size: 13.5px; padding: 20px 0; text-align: center; }
.see-miapo { background: linear-gradient(150deg, #4F46E5, #7C3AED); color: #fff; border: none; }
.see-miapo-badge { display: inline-block; background: rgba(255,255,255,.2); border-radius: 20px; padding: 3px 12px; font-weight: 800; font-size: 12px; letter-spacing: .5px; }
.see-miapo-h2 { color: #fff; margin-top: 12px; }
.see-miapo-txt { font-size: 13.5px; line-height: 1.55; color: rgba(255,255,255,.92); }
.see-miapo-list { margin: 12px 0 16px; padding-left: 18px; font-size: 13px; color: rgba(255,255,255,.9); }
.see-miapo-list li { margin: 5px 0; }
.see-miapo-cta { display: inline-block; background: #fff; color: #5B21B6; font-weight: 700; font-size: 13.5px; border-radius: 10px; padding: 9px 18px; text-decoration: none; }
@media (max-width: 900px) { .see-kpis { grid-template-columns: repeat(2, 1fr); } .see-grid { grid-template-columns: 1fr; } }
</style>
