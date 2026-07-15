<template>
  <div class="ap-page">
    <!-- ═══ En-tête ═══ -->
    <header class="ap-head">
      <div>
        <h1 class="ap-title">APEE</h1>
        <p class="ap-sub">Association des Parents d'Élèves et Enseignants · {{ d.annee }}</p>
      </div>
      <div class="ap-role-tag" title="Le chef d'établissement n'est pas membre du bureau : il conseille et supervise l'APEE.">
        <span class="ap-role-dot"></span>
        Vous êtes <b>conseiller technique</b>
      </div>
    </header>

    <!-- ═══ Onglets ═══ -->
    <nav class="ap-tabs">
      <button
        v-for="tb in tabs" :key="tb.key" type="button"
        class="ap-tab" :class="{ active: tab === tb.key }"
        @click="tab = tb.key"
      >{{ tb.label }}</button>
    </nav>

    <!-- ═══════════════ BUREAU ═══════════════ -->
    <section v-if="tab === 'bureau'" class="ap-section">
      <div class="ap-note">
        Le bureau exécutif est élu par les parents via les délégués de classe. Le chef
        d'établissement en est le <b>conseiller technique</b> : il oriente et supervise, mais
        n'y siège pas. Ce module lui permet de piloter l'APEE en toute transparence.
      </div>

      <div class="ap-block-head">
        <h2 class="ap-h2">Bureau exécutif</h2>
        <button class="btn btn-primary btn-sm" type="button" @click="showBureau = true">Ajouter un membre</button>
      </div>
      <div class="ap-tablewrap">
        <table class="ap-table">
          <thead>
            <tr><th>Fonction</th><th>Nom</th><th>Contact</th><th></th></tr>
          </thead>
          <tbody>
            <tr v-for="m in d.bureau" :key="m.id">
              <td class="ap-td-strong">{{ m.role }}</td>
              <td>{{ m.nom }}</td>
              <td class="ap-td-muted">{{ m.tel || '—' }}</td>
              <td class="ap-td-act">
                <button class="ap-del" type="button" title="Retirer" @click="store.removeBureau(m.id)">✕</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2 class="ap-h2 ap-mt">Délégués de parents par niveau</h2>
      <div class="ap-deleg-grid">
        <div v-for="dl in d.delegues" :key="dl.id" class="ap-deleg">
          <div class="ap-deleg-niv">{{ dl.niveau }}</div>
          <div class="ap-deleg-nom">{{ dl.nom }}</div>
        </div>
      </div>
    </section>

    <!-- ═══════════════ COTISATIONS ═══════════════ -->
    <section v-else-if="tab === 'cotisations'" class="ap-section">
      <div class="ap-note">
        La cotisation APEE est <b>distincte de la scolarité</b>. Votée en assemblée générale,
        elle est obligatoire — sauf pour les familles reconnues « <b>cas social</b> », qui en
        sont exonérées. Ces fonds financent les enseignants vacataires, le gardiennage,
        l'entretien et les constructions.
      </div>

      <!-- KPIs -->
      <div class="ap-kpis">
        <div class="ap-kpi">
          <div class="ap-kpi-label">Montant voté / famille</div>
          <div class="ap-kpi-value">
            <template v-if="!editMontant">{{ fmt(d.cotisationMontant) }} <small>FCFA</small></template>
            <input v-else v-model="montantDraft" type="number" class="ap-input ap-input-montant" />
          </div>
          <button v-if="!editMontant" class="ap-mini" type="button" @click="openMontant">Modifier</button>
          <button v-else class="ap-mini" type="button" @click="saveMontant">Enregistrer</button>
        </div>
        <div class="ap-kpi">
          <div class="ap-kpi-label">Attendu (année)</div>
          <div class="ap-kpi-value">{{ fmt(coti.attendu) }} <small>FCFA</small></div>
        </div>
        <div class="ap-kpi">
          <div class="ap-kpi-label">Collecté</div>
          <div class="ap-kpi-value">{{ fmt(coti.collecte) }} <small>FCFA</small></div>
        </div>
        <div class="ap-kpi ap-kpi-accent">
          <div class="ap-kpi-label">Taux de recouvrement</div>
          <div class="ap-kpi-value">{{ coti.taux }}%</div>
        </div>
      </div>

      <div class="ap-bar"><div class="ap-bar-fill" :style="{ width: coti.taux + '%' }"></div></div>
      <div class="ap-legend">
        <span><b>{{ d.famillesPayees }}</b> familles à jour</span>
        <span><b>{{ coti.impayes }}</b> en attente</span>
        <span><b>{{ coti.exoneres }}</b> exonérées (cas sociaux)</span>
        <span class="ap-legend-reste">Reste à collecter : <b>{{ fmt(coti.reste) }} FCFA</b></span>
      </div>

      <h2 class="ap-h2 ap-mt">Suivi par famille <span class="ap-h2-note">(échantillon)</span></h2>
      <div class="ap-tablewrap">
        <table class="ap-table">
          <thead>
            <tr><th>Famille</th><th>Classe</th><th>Dû</th><th>Réglé</th><th>État</th><th>Cas social</th></tr>
          </thead>
          <tbody>
            <tr v-for="f in d.familles" :key="f.id" :class="{ 'ap-row-exo': f.exonere }">
              <td class="ap-td-strong">{{ f.nom }}</td>
              <td>{{ f.classe }}</td>
              <td class="ap-td-muted">{{ f.exonere ? '—' : fmt(f.du) }}</td>
              <td>
                <input
                  v-if="!f.exonere" class="ap-input ap-input-sm" type="number" min="0" :value="f.paye"
                  @change="store.setFamillePaye(f.id, Number($event.target.value))"
                />
                <span v-else class="ap-td-muted">—</span>
              </td>
              <td>
                <span v-if="f.exonere" class="ap-badge ap-badge-exo">Exonéré</span>
                <span v-else-if="f.paye >= f.du" class="ap-badge ap-badge-ok">À jour</span>
                <span v-else-if="f.paye > 0" class="ap-badge ap-badge-part">Partiel</span>
                <span v-else class="ap-badge ap-badge-ko">Impayé</span>
              </td>
              <td class="ap-td-act">
                <button
                  class="ap-toggle" :class="{ on: f.exonere }" type="button"
                  :title="f.exonere ? 'Rétablir la cotisation' : 'Déclarer cas social (exonérer)'"
                  @click="store.toggleExonere(f.id)"
                >{{ f.exonere ? 'Oui' : 'Non' }}</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- ═══════════════ RÉUNIONS ═══════════════ -->
    <section v-else-if="tab === 'reunions'" class="ap-section">
      <div class="ap-block-head">
        <h2 class="ap-h2">Assemblées & réunions du bureau</h2>
        <button class="btn btn-primary btn-sm" type="button" @click="showReunion = true">Programmer une réunion</button>
      </div>

      <div v-if="!reunionsTriees.length" class="ap-empty">Aucune réunion enregistrée.</div>
      <div v-else class="ap-reunions">
        <article v-for="r in reunionsTriees" :key="r.id" class="ap-card">
          <div class="ap-r-head">
            <div>
              <span class="ap-badge" :class="r.type === 'Assemblée générale' ? 'ap-badge-ag' : 'ap-badge-bur'">{{ r.type }}</span>
              <div class="ap-r-objet">{{ r.objet }}</div>
            </div>
            <div class="ap-r-meta">
              <div class="ap-r-date">{{ formatDate(r.date) }}</div>
              <div class="ap-r-present">{{ r.presents }} présents</div>
            </div>
          </div>
          <div v-if="r.pv" class="ap-pv">
            <div class="ap-pv-label">Procès-verbal</div>
            <p class="ap-pv-text">{{ r.pv }}</p>
          </div>
        </article>
      </div>
    </section>

    <!-- ═══════════════ PROJETS ═══════════════ -->
    <section v-else-if="tab === 'projets'" class="ap-section">
      <div class="ap-note">
        Les projets APEE sont financés par les cotisations et gérés en toute transparence avec
        la direction : enseignants vacataires, gardiennage, entretien et constructions.
      </div>

      <div class="ap-kpis ap-kpis-3">
        <div class="ap-kpi">
          <div class="ap-kpi-label">Budget prévu</div>
          <div class="ap-kpi-value">{{ fmt(budget.prevu) }} <small>FCFA</small></div>
        </div>
        <div class="ap-kpi">
          <div class="ap-kpi-label">Engagé / dépensé</div>
          <div class="ap-kpi-value">{{ fmt(budget.depense) }} <small>FCFA</small></div>
        </div>
        <div class="ap-kpi ap-kpi-accent">
          <div class="ap-kpi-label">Taux d'exécution</div>
          <div class="ap-kpi-value">{{ budget.taux }}%</div>
        </div>
      </div>

      <div class="ap-block-head ap-mt">
        <h2 class="ap-h2">Projets de l'exercice</h2>
        <button class="btn btn-primary btn-sm" type="button" @click="showProjet = true">Nouveau projet</button>
      </div>
      <div class="ap-proj-grid">
        <article v-for="p in d.projets" :key="p.id" class="ap-card ap-proj">
          <div class="ap-proj-head">
            <div class="ap-proj-title">{{ p.intitule }}</div>
            <span class="ap-badge" :class="p.statut === 'Terminé' ? 'ap-badge-ok' : 'ap-badge-run'">{{ p.statut }}</span>
          </div>
          <div class="ap-proj-cat">{{ p.categorie }}</div>
          <div class="ap-bar ap-bar-thin"><div class="ap-bar-fill" :style="{ width: projPct(p) + '%' }"></div></div>
          <div class="ap-proj-foot">
            <span>{{ fmt(p.depense) }} / {{ fmt(p.budget) }} FCFA</span>
            <span class="ap-proj-pct">{{ projPct(p) }}%</span>
          </div>
        </article>
      </div>
    </section>

    <!-- ═══════════════ RAPPORT ═══════════════ -->
    <section v-else-if="tab === 'rapport'" class="ap-section">
      <div class="ap-block-head">
        <div>
          <h2 class="ap-h2">Rapport de synthèse</h2>
          <p class="ap-sub2">Bilan destiné à l'assemblée générale et à l'autorité de tutelle · {{ d.annee }}</p>
        </div>
        <div style="display: flex; gap: 8px; flex-wrap: wrap;">
          <ExportMenu :excel="exportRapport" :pdf="exportRapportPdf" />
        </div>
      </div>

      <div class="ap-report">
        <!-- Cotisations -->
        <div class="ap-rep-block">
          <h3 class="ap-rep-h3">Cotisations</h3>
          <div class="ap-rep-lines">
            <div class="ap-rep-line"><span>Cotisation votée / famille</span><b>{{ fmt(d.cotisationMontant) }} FCFA</b></div>
            <div class="ap-rep-line"><span>Familles cotisantes</span><b>{{ d.famillesTotal }}</b></div>
            <div class="ap-rep-line"><span>Familles exonérées (cas sociaux)</span><b>{{ d.famillesExonerees }}</b></div>
            <div class="ap-rep-line"><span>Attendu sur l'année</span><b>{{ fmt(coti.attendu) }} FCFA</b></div>
            <div class="ap-rep-line ap-rep-line-hi"><span>Collecté à ce jour</span><b>{{ fmt(coti.collecte) }} FCFA</b></div>
            <div class="ap-rep-line"><span>Reste à recouvrer</span><b>{{ fmt(coti.reste) }} FCFA</b></div>
            <div class="ap-rep-line"><span>Taux de recouvrement</span><b class="ap-rep-accent">{{ coti.taux }}%</b></div>
          </div>
        </div>

        <!-- Réalisations -->
        <div class="ap-rep-block">
          <h3 class="ap-rep-h3">Réalisations & budget</h3>
          <div class="ap-rep-lines">
            <div class="ap-rep-line"><span>Budget total des projets</span><b>{{ fmt(budget.prevu) }} FCFA</b></div>
            <div class="ap-rep-line ap-rep-line-hi"><span>Engagé / dépensé</span><b>{{ fmt(budget.depense) }} FCFA</b></div>
            <div class="ap-rep-line"><span>Reste disponible sur budget</span><b>{{ fmt(budget.reste) }} FCFA</b></div>
            <div class="ap-rep-line"><span>Taux d'exécution</span><b class="ap-rep-accent">{{ budget.taux }}%</b></div>
          </div>
          <table class="ap-rep-table">
            <tbody>
              <tr v-for="p in d.projets" :key="p.id">
                <td>{{ p.intitule }}</td>
                <td class="ap-rep-td-r">{{ fmt(p.depense) }} / {{ fmt(p.budget) }}</td>
                <td class="ap-rep-td-s">
                  <span class="ap-badge" :class="p.statut === 'Terminé' ? 'ap-badge-ok' : 'ap-badge-run'">{{ p.statut }}</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Dernière réunion / décisions -->
      <div v-if="derniere" class="ap-rep-decisions">
        <h3 class="ap-rep-h3">Dernière assemblée — {{ formatDate(derniere.date) }}</h3>
        <p class="ap-pv-text">{{ derniere.pv }}</p>
      </div>
    </section>

    <!-- ═══ Modale : membre du bureau ═══ -->
    <transition name="ap-fade">
      <div v-if="showBureau" class="ap-overlay" @click.self="showBureau = false">
        <div class="ap-modal">
          <h3 class="ap-modal-title">Ajouter un membre du bureau</h3>
          <div class="ap-field"><label>Fonction</label>
            <input class="ap-input" v-model="nb.role" placeholder="Ex. Trésorier adjoint" />
          </div>
          <div class="ap-field"><label>Nom</label>
            <input class="ap-input" v-model="nb.nom" placeholder="Nom et prénom" />
          </div>
          <div class="ap-field"><label>Contact (facultatif)</label>
            <input class="ap-input" v-model="nb.tel" placeholder="+237 6 00 00 00 00" />
          </div>
          <div class="ap-modal-actions">
            <button class="btn btn-outline btn-sm" type="button" @click="showBureau = false">Annuler</button>
            <button class="btn btn-primary btn-sm" type="button" :disabled="!nb.role || !nb.nom" @click="addBureau">Ajouter</button>
          </div>
        </div>
      </div>
    </transition>

    <!-- ═══ Modale : réunion ═══ -->
    <transition name="ap-fade">
      <div v-if="showReunion" class="ap-overlay" @click.self="showReunion = false">
        <div class="ap-modal">
          <h3 class="ap-modal-title">Programmer une réunion</h3>
          <div class="ap-field-row">
            <div class="ap-field"><label>Date</label>
              <input class="ap-input" type="date" v-model="nr.date" />
            </div>
            <div class="ap-field"><label>Type</label>
              <select class="ap-input" v-model="nr.type">
                <option>Assemblée générale</option>
                <option>Réunion du bureau</option>
              </select>
            </div>
          </div>
          <div class="ap-field"><label>Objet</label>
            <input class="ap-input" v-model="nr.objet" placeholder="Ordre du jour principal" />
          </div>
          <div class="ap-field"><label>Nombre de présents</label>
            <input class="ap-input" type="number" min="0" v-model="nr.presents" />
          </div>
          <div class="ap-field"><label>Procès-verbal (facultatif)</label>
            <textarea class="ap-input ap-textarea" v-model="nr.pv" placeholder="Décisions et résolutions…"></textarea>
          </div>
          <div class="ap-modal-actions">
            <button class="btn btn-outline btn-sm" type="button" @click="showReunion = false">Annuler</button>
            <button class="btn btn-primary btn-sm" type="button" :disabled="!nr.date || !nr.objet" @click="addReunion">Enregistrer</button>
          </div>
        </div>
      </div>
    </transition>

    <!-- ═══ Modale : projet ═══ -->
    <transition name="ap-fade">
      <div v-if="showProjet" class="ap-overlay" @click.self="showProjet = false">
        <div class="ap-modal">
          <h3 class="ap-modal-title">Nouveau projet APEE</h3>
          <div class="ap-field"><label>Intitulé</label>
            <input class="ap-input" v-model="np.intitule" placeholder="Ex. Clôture de la cour" />
          </div>
          <div class="ap-field"><label>Catégorie</label>
            <select class="ap-input" v-model="np.categorie">
              <option>Construction / entretien</option>
              <option>Personnel vacataire</option>
              <option>Équipement</option>
              <option>Gardiennage / entretien</option>
              <option>Autre</option>
            </select>
          </div>
          <div class="ap-field"><label>Budget prévu (FCFA)</label>
            <input class="ap-input" type="number" min="0" v-model="np.budget" placeholder="0" />
          </div>
          <div class="ap-modal-actions">
            <button class="btn btn-outline btn-sm" type="button" @click="showProjet = false">Annuler</button>
            <button class="btn btn-primary btn-sm" type="button" :disabled="!np.intitule" @click="addProjet">Créer</button>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useApeeStore } from '../stores/apee'
import { exportToExcel } from '../utils/exportExcel'
import { exportToPdf } from '../utils/exportPdf'
import ExportMenu from '../components/ExportMenu.vue'

const store = useApeeStore()

const tab = ref('bureau')
const tabs = [
  { key: 'bureau', label: 'Bureau' },
  { key: 'cotisations', label: 'Cotisations' },
  { key: 'reunions', label: 'Réunions' },
  { key: 'projets', label: 'Projets' },
  { key: 'rapport', label: 'Rapport' },
]

onMounted(() => store.load())

const d = computed(() => store.data)
const coti = computed(() => store.coti)
const budget = computed(() => store.budget)

const reunionsTriees = computed(() =>
  [...d.value.reunions].sort((a, b) => (b.date || '').localeCompare(a.date || ''))
)
const derniere = computed(() => reunionsTriees.value.find(r => r.type === 'Assemblée générale') || reunionsTriees.value[0] || null)

function fmt(n) { return Number(n || 0).toLocaleString('fr-FR') }
function projPct(p) { return p.budget ? Math.min(100, Math.round((p.depense / p.budget) * 100)) : 0 }
function formatDate(iso) {
  if (!iso) return '—'
  try {
    return new Date(iso + 'T00:00:00').toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
  } catch { return iso }
}

// ── Montant de cotisation ──
const editMontant = ref(false)
const montantDraft = ref(0)
function openMontant() { montantDraft.value = store.data.cotisationMontant; editMontant.value = true }
function saveMontant() { store.setCotisationMontant(montantDraft.value); editMontant.value = false }

// ── Modale bureau ──
const showBureau = ref(false)
const nb = ref({ role: '', nom: '', tel: '' })
function addBureau() {
  if (!nb.value.role || !nb.value.nom) return
  store.addBureau({ ...nb.value })
  nb.value = { role: '', nom: '', tel: '' }
  showBureau.value = false
}

// ── Modale réunion ──
const showReunion = ref(false)
const nr = ref({ date: '', type: 'Réunion du bureau', objet: '', presents: 0, pv: '' })
function addReunion() {
  if (!nr.value.date || !nr.value.objet) return
  store.addReunion({ ...nr.value, presents: Number(nr.value.presents) || 0 })
  nr.value = { date: '', type: 'Réunion du bureau', objet: '', presents: 0, pv: '' }
  showReunion.value = false
}

// ── Modale projet ──
const showProjet = ref(false)
const np = ref({ intitule: '', categorie: 'Construction / entretien', budget: 0 })
function addProjet() {
  if (!np.value.intitule) return
  store.addProjet({ intitule: np.value.intitule, categorie: np.value.categorie, budget: Number(np.value.budget) || 0 })
  np.value = { intitule: '', categorie: 'Construction / entretien', budget: 0 }
  showProjet.value = false
}

// ── Rapport ──
function buildRapportExport() {
  const columns = [
    { key: 'intitule', label: 'Projet', width: 34 },
    { key: 'categorie', label: 'Catégorie', width: 24 },
    { key: 'budget', label: 'Budget (FCFA)', width: 16 },
    { key: 'depense', label: 'Dépensé (FCFA)', width: 16 },
    { key: 'reste', label: 'Reste (FCFA)', width: 16 },
    { key: 'statut', label: 'Statut', width: 14 },
  ]
  const data = d.value.projets.map(p => ({
    intitule: p.intitule,
    categorie: p.categorie,
    budget: p.budget,
    depense: p.depense,
    reste: (p.budget || 0) - (p.depense || 0),
    statut: p.statut,
  }))
  return { data, columns }
}
function exportRapport() {
  const { data, columns } = buildRapportExport()
  exportToExcel(data, columns, `Rapport_APEE_${d.value.annee}`, 'Projets APEE')
}
function exportRapportPdf() {
  const { data, columns } = buildRapportExport()
  if (!data.length) return
  exportToPdf(data, columns, `Rapport_APEE_${d.value.annee}`, { title: `Rapport APEE — ${d.value.annee}` })
}
</script>

<style scoped>
.ap-page { max-width: 1100px; margin: 0 auto; }

/* En-tête */
.ap-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; margin-bottom: 18px; flex-wrap: wrap; }
.ap-title { font-size: 26px; font-weight: 700; color: var(--tx); margin: 0; }
.ap-sub { font-size: 14px; color: var(--tx2); margin: 4px 0 0; }
.ap-sub2 { font-size: 13px; color: var(--tx2); margin: 3px 0 0; }
.ap-role-tag {
  display: inline-flex; align-items: center; gap: 8px;
  background: rgba(var(--pr-rgb,10,132,255),.08); border: 1px solid rgba(var(--pr-rgb,10,132,255),.22);
  color: var(--tx); font-size: 13px; padding: 8px 14px; border-radius: 999px;
}
.ap-role-tag b { color: var(--pr); font-weight: 700; }
.ap-role-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--pr); flex-shrink: 0; }

/* Onglets */
.ap-tabs { display: flex; gap: 6px; border-bottom: 1px solid var(--divider, #e6e6e6); margin-bottom: 22px; overflow-x: auto; }
.ap-tab {
  background: none; border: none; font: inherit; font-size: 14px; font-weight: 600;
  color: var(--tx2); padding: 10px 14px; cursor: pointer; position: relative; white-space: nowrap;
  border-bottom: 2.5px solid transparent; margin-bottom: -1px; transition: color .15s;
}
.ap-tab:hover { color: var(--tx); }
.ap-tab.active { color: var(--pr); border-bottom-color: var(--pr); }

.ap-section { animation: ap-in .2s ease; }
@keyframes ap-in { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: none; } }

/* Note explicative */
.ap-note {
  background: rgba(var(--pr-rgb,10,132,255),.06); border: 1px solid rgba(var(--pr-rgb,10,132,255),.16);
  border-radius: 12px; padding: 13px 16px; font-size: 13.5px; line-height: 1.55; color: var(--tx2);
  margin-bottom: 20px; text-align: justify;
}
.ap-note b { color: var(--tx); font-weight: 600; }

.ap-block-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 12px; flex-wrap: wrap; }
.ap-h2 { font-size: 17px; font-weight: 700; color: var(--tx); margin: 0; }
.ap-h2-note { font-size: 13px; font-weight: 500; color: var(--tx3); }
.ap-mt { margin-top: 26px; }

/* Tables */
.ap-tablewrap { background: var(--card, #fff); border: 1px solid var(--divider, #eee); border-radius: 16px; padding: 6px 6px 2px; overflow-x: auto; }
.ap-table { width: 100%; border-collapse: collapse; }
.ap-table th { text-align: left; font-size: 12px; font-weight: 600; color: var(--tx2); padding: 12px; border-bottom: 1px solid var(--divider, #eee); }
.ap-table td { padding: 10px 12px; border-bottom: 1px solid var(--divider, #f3f3f3); font-size: 13.5px; color: var(--tx); }
.ap-table tbody tr:last-child td { border-bottom: none; }
.ap-td-strong { font-weight: 600; }
.ap-td-muted { color: var(--tx3); }
.ap-td-act { text-align: right; width: 60px; }
.ap-row-exo { background: rgba(27,138,90,.04); }
.ap-del { background: none; border: none; color: var(--tx3); cursor: pointer; font-size: 14px; padding: 3px 7px; border-radius: 6px; }
.ap-del:hover { background: rgba(192,57,43,.1); color: var(--danger, #c0392b); }

/* Délégués */
.ap-deleg-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 12px; }
.ap-deleg { background: var(--card, #fff); border: 1px solid var(--divider, #eee); border-radius: 12px; padding: 13px 15px; }
.ap-deleg-niv { font-size: 12px; font-weight: 700; color: var(--pr); letter-spacing: .02em; }
.ap-deleg-nom { font-size: 14px; color: var(--tx); margin-top: 3px; }

/* KPIs */
.ap-kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-bottom: 18px; }
.ap-kpis-3 { grid-template-columns: repeat(3, 1fr); }
@media (max-width: 720px) { .ap-kpis, .ap-kpis-3 { grid-template-columns: repeat(2, 1fr); } }
.ap-kpi { background: var(--card, #fff); border: 1px solid var(--divider, #eee); border-radius: 14px; padding: 15px 16px; position: relative; }
.ap-kpi-accent { background: linear-gradient(135deg, rgba(var(--pr-rgb,10,132,255),.1), rgba(var(--pr-rgb,10,132,255),.03)); border-color: rgba(var(--pr-rgb,10,132,255),.25); }
.ap-kpi-label { font-size: 12px; color: var(--tx2); font-weight: 600; }
.ap-kpi-value { font-size: 23px; font-weight: 700; color: var(--tx); margin-top: 4px; }
.ap-kpi-value small { font-size: 12px; font-weight: 600; color: var(--tx3); }
.ap-kpi-accent .ap-kpi-value { color: var(--pr); }
.ap-mini { position: absolute; top: 13px; right: 13px; background: none; border: none; color: var(--pr); font: inherit; font-size: 11.5px; font-weight: 600; cursor: pointer; padding: 0; }
.ap-input-montant { width: 120px; font-size: 16px; padding: 4px 8px; }

/* Barres */
.ap-bar { height: 9px; background: rgba(0,0,0,.06); border-radius: 6px; overflow: hidden; margin: 4px 0 10px; }
.ap-bar-thin { height: 6px; margin: 10px 0 8px; }
.ap-bar-fill { height: 100%; background: var(--pr); border-radius: 6px; transition: width .3s; }
.ap-legend { display: flex; flex-wrap: wrap; gap: 6px 20px; font-size: 13px; color: var(--tx2); margin-bottom: 6px; }
.ap-legend b { color: var(--tx); }
.ap-legend-reste { margin-left: auto; }

/* Badges */
.ap-badge { display: inline-block; font-size: 11.5px; font-weight: 600; padding: 3px 9px; border-radius: 999px; }
.ap-badge-ok { background: rgba(27,138,90,.12); color: #157a4f; }
.ap-badge-run { background: rgba(var(--pr-rgb,10,132,255),.12); color: var(--pr); }
.ap-badge-part { background: rgba(214,158,46,.16); color: #b7791f; }
.ap-badge-ko { background: rgba(192,57,43,.12); color: #c0392b; }
.ap-badge-exo { background: rgba(27,138,90,.12); color: #157a4f; }
.ap-badge-ag { background: rgba(124,58,237,.12); color: #6d28d9; }
.ap-badge-bur { background: rgba(100,116,139,.14); color: #475569; }

/* Toggle exonération */
.ap-toggle { border: 1.5px solid var(--divider, #dcdcd8); background: #fff; color: var(--tx2); font: inherit; font-size: 12px; font-weight: 600; padding: 3px 12px; border-radius: 999px; cursor: pointer; min-width: 48px; }
.ap-toggle.on { background: rgba(27,138,90,.12); border-color: rgba(27,138,90,.4); color: #157a4f; }

/* Réunions */
.ap-reunions { display: flex; flex-direction: column; gap: 14px; }
.ap-card { background: var(--card, #fff); border: 1px solid var(--divider, #eee); border-radius: 16px; padding: 18px; }
.ap-r-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 14px; }
.ap-r-objet { font-size: 15.5px; font-weight: 600; color: var(--tx); margin-top: 8px; }
.ap-r-meta { text-align: right; flex-shrink: 0; }
.ap-r-date { font-size: 13px; font-weight: 600; color: var(--tx); }
.ap-r-present { font-size: 12px; color: var(--tx3); margin-top: 2px; }
.ap-pv { margin-top: 14px; padding-top: 13px; border-top: 1px dashed var(--divider, #e6e6e6); }
.ap-pv-label { font-size: 11px; font-weight: 700; letter-spacing: .05em; text-transform: uppercase; color: var(--tx3); margin-bottom: 5px; }
.ap-pv-text { font-size: 13.5px; line-height: 1.6; color: var(--tx2); margin: 0; text-align: justify; }

/* Projets */
.ap-proj-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; }
.ap-proj-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; }
.ap-proj-title { font-size: 15.5px; font-weight: 700; color: var(--tx); }
.ap-proj-cat { font-size: 12.5px; color: var(--tx2); margin-top: 3px; }
.ap-proj-foot { display: flex; justify-content: space-between; font-size: 12.5px; color: var(--tx2); }
.ap-proj-pct { font-weight: 700; color: var(--pr); }

/* Rapport */
.ap-report { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
@media (max-width: 820px) { .ap-report { grid-template-columns: 1fr; } }
.ap-rep-block { background: var(--card, #fff); border: 1px solid var(--divider, #eee); border-radius: 16px; padding: 18px 20px; }
.ap-rep-h3 { font-size: 15px; font-weight: 700; color: var(--tx); margin: 0 0 12px; }
.ap-rep-lines { display: flex; flex-direction: column; gap: 2px; }
.ap-rep-line { display: flex; align-items: center; justify-content: space-between; gap: 12px; font-size: 13.5px; color: var(--tx2); padding: 7px 0; border-bottom: 1px solid var(--divider, #f3f3f3); }
.ap-rep-line:last-child { border-bottom: none; }
.ap-rep-line b { color: var(--tx); font-weight: 600; }
.ap-rep-line-hi { background: rgba(var(--pr-rgb,10,132,255),.05); margin: 0 -20px; padding-left: 20px; padding-right: 20px; border-bottom: none; }
.ap-rep-accent { color: var(--pr) !important; font-weight: 700 !important; }
.ap-rep-table { width: 100%; border-collapse: collapse; margin-top: 14px; }
.ap-rep-table td { padding: 8px 0; border-bottom: 1px solid var(--divider, #f3f3f3); font-size: 13px; color: var(--tx); }
.ap-rep-table tr:last-child td { border-bottom: none; }
.ap-rep-td-r { text-align: right; color: var(--tx2); white-space: nowrap; }
.ap-rep-td-s { text-align: right; width: 90px; }
.ap-rep-decisions { background: var(--card, #fff); border: 1px solid var(--divider, #eee); border-radius: 16px; padding: 18px 20px; margin-top: 16px; }

.ap-empty { font-size: 14px; color: var(--tx3); text-align: center; padding: 40px 0; }

/* Inputs */
.ap-input { padding: 8px 11px; font: inherit; font-size: 13.5px; color: var(--tx); background: #fff; border: 1.5px solid var(--divider, #dcdcd8); border-radius: 9px; outline: none; width: 100%; }
.ap-input:focus { border-color: var(--pr); }
.ap-input-sm { width: 100px; padding: 6px 9px; }
.ap-textarea { min-height: 78px; resize: vertical; font-family: inherit; }

/* Modales */
.ap-overlay { position: fixed; inset: 0; z-index: 1000; background: rgba(0,0,0,.35); display: flex; align-items: center; justify-content: center; padding: 20px; }
.ap-modal { background: #fff; border-radius: 16px; width: 100%; max-width: 440px; padding: 22px; box-shadow: 0 24px 70px rgba(0,0,0,.25); }
.ap-modal-title { font-size: 18px; font-weight: 700; color: var(--tx); margin: 0 0 16px; }
.ap-field { margin-bottom: 13px; }
.ap-field > label { display: block; font-size: 12.5px; font-weight: 600; color: var(--tx2); margin-bottom: 6px; }
.ap-field-row { display: flex; gap: 12px; }
.ap-field-row .ap-field { flex: 1; }
.ap-modal-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 8px; }
.ap-fade-enter-active, .ap-fade-leave-active { transition: opacity .15s; }
.ap-fade-enter-from, .ap-fade-leave-to { opacity: 0; }
</style>
