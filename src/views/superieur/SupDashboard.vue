<template>
  <div class="sd">
    <div class="sd-intro">
      <h1 class="sd-h1">Tableau de bord</h1>
      <p class="sd-sub">Vue d'ensemble de l'établissement — année académique {{ store.ecole.anneeAcademique }}</p>
    </div>

    <!-- Indicateurs clés -->
    <div class="sd-kpis">
      <div class="sd-kpi">
        <div class="sd-kpi-label">Étudiants inscrits</div>
        <div class="sd-kpi-value">{{ fmt(s.nbEtudiants) }}</div>
        <div class="sd-kpi-foot">{{ s.boursiers }} boursiers</div>
      </div>
      <div class="sd-kpi">
        <div class="sd-kpi-label">Programmes</div>
        <div class="sd-kpi-value">{{ s.nbProgrammes }}</div>
        <div class="sd-kpi-foot">{{ s.nbPromotions }} promotions</div>
      </div>
      <div class="sd-kpi">
        <div class="sd-kpi-label">Intervenants</div>
        <div class="sd-kpi-value">{{ s.nbIntervenants }}</div>
        <div class="sd-kpi-foot">dont {{ s.vacataires }} vacataires</div>
      </div>
      <div class="sd-kpi">
        <div class="sd-kpi-label">Unités d'enseignement</div>
        <div class="sd-kpi-value">{{ s.nbUE }}</div>
        <div class="sd-kpi-foot">{{ fmt(s.totalEctsCatalogue) }} crédits au catalogue</div>
      </div>
      <div class="sd-kpi">
        <div class="sd-kpi-label">Volume horaire</div>
        <div class="sd-kpi-value">{{ fmt(s.totalHeures) }}<span class="sd-kpi-unit">h</span></div>
        <div class="sd-kpi-foot">enseignement annuel</div>
      </div>
      <div class="sd-kpi">
        <div class="sd-kpi-label">Moyenne générale</div>
        <div class="sd-kpi-value">{{ s.moyenneGenerale }}<span class="sd-kpi-unit">/20</span></div>
        <div class="sd-kpi-foot" :class="s.enDifficulte > 0 ? 'is-warn' : 'is-ok'">
          {{ s.enDifficulte }} étudiant(s) en difficulté
        </div>
      </div>
    </div>

    <div class="sd-grid">
      <!-- Répartition par programme -->
      <section class="sd-card">
        <h2 class="sd-h2">Effectifs par programme</h2>
        <div class="sd-prog-list">
          <div v-for="p in s.parProgramme" :key="p.id" class="sd-prog">
            <div class="sd-prog-head">
              <div>
                <span class="sd-prog-niveau" :class="`n-${p.niveau.toLowerCase()}`">{{ p.niveau }}</span>
                <span class="sd-prog-nom">{{ p.nom }}</span>
              </div>
              <span class="sd-prog-eff">{{ p.effectif }}</span>
            </div>
            <div class="sd-prog-track">
              <div class="sd-prog-fill" :style="{ width: barWidth(p.effectif) + '%' }"></div>
            </div>
          </div>
        </div>
      </section>

      <!-- Progression académique -->
      <section class="sd-card">
        <h2 class="sd-h2">Progression académique</h2>
        <div class="sd-progress">
          <div class="sd-progress-ring">
            <svg viewBox="0 0 120 120" width="132" height="132">
              <circle cx="60" cy="60" r="50" fill="none" stroke="var(--input-bg)" stroke-width="13" />
              <circle
                cx="60" cy="60" r="50" fill="none" stroke="var(--pr)" stroke-width="13"
                stroke-linecap="round"
                :stroke-dasharray="circumference"
                :stroke-dashoffset="circumference * (1 - s.tauxProgressionEcts / 100)"
                transform="rotate(-90 60 60)"
              />
              <text x="60" y="56" text-anchor="middle" class="sd-ring-num">{{ s.tauxProgressionEcts }}%</text>
              <text x="60" y="74" text-anchor="middle" class="sd-ring-cap">crédits acquis</text>
            </svg>
          </div>
          <div class="sd-progress-text">
            <p>
              Les étudiants ont validé en moyenne <strong>{{ s.tauxProgressionEcts }}%</strong>
              des crédits attendus à ce stade de l'année.
            </p>
            <p class="sd-progress-note">
              Le premier semestre est clôturé ; le second est en cours.
            </p>
          </div>
        </div>
      </section>
    </div>

    <!-- Répartition par campus (le groupe est multi-campus) -->
    <section class="sd-card sd-campus-card" v-if="s.parCampus && s.parCampus.length">
      <h2 class="sd-h2">Effectifs par campus</h2>
      <p class="sd-campus-sub">Le groupe pilote plusieurs campus, chacun avec sa direction et ses effectifs propres.</p>
      <div class="sd-campus-grid">
        <div v-for="c in s.parCampus" :key="c.id" class="sd-campus">
          <div class="sd-campus-top">
            <span class="sd-campus-nom">{{ c.ville }}</span>
            <span v-if="c.siege" class="sd-campus-siege">Siège</span>
          </div>
          <div class="sd-campus-eff">{{ c.effectif }}</div>
          <div class="sd-campus-cap">étudiants inscrits</div>
          <div class="sd-campus-dir">{{ c.directeur }}</div>
        </div>
      </div>
    </section>

    <!-- Mobilité entrante (résumé) -->
    <section class="sd-card sd-mob-card" v-if="mobStats">
      <div class="sd-mob-head">
        <h2 class="sd-h2">Mobilité entrante</h2>
        <span class="sd-mob-link">Onglet « Mobilité entrante » (sidebar)</span>
      </div>
      <div class="sd-mob-grid">
        <div class="sd-mob-kpi">
          <div class="sd-mob-kpi-num">{{ mobStats.total }}</div>
          <div class="sd-mob-kpi-lab">Dossiers ouverts</div>
        </div>
        <div class="sd-mob-kpi">
          <div class="sd-mob-kpi-num">{{ mobStats.acceptes }}</div>
          <div class="sd-mob-kpi-lab">Acceptés</div>
        </div>
        <div class="sd-mob-kpi">
          <div class="sd-mob-kpi-num">{{ mobStats.visaObtenu }}</div>
          <div class="sd-mob-kpi-lab">Visa obtenu</div>
        </div>
        <div class="sd-mob-kpi">
          <div class="sd-mob-kpi-num">{{ mobStats.arrives }}</div>
          <div class="sd-mob-kpi-lab">Arrivés</div>
        </div>
        <div class="sd-mob-kpi" :class="{ 'is-alert': mobStats.enRetard > 0 }">
          <div class="sd-mob-kpi-num">{{ mobStats.enRetard }}</div>
          <div class="sd-mob-kpi-lab">En retard (rentrée &lt; 30j)</div>
        </div>
      </div>
      <p class="sd-mob-foot">
        Étudiants internationaux acceptés par l'école et suivis jusqu'à leur intégration.
        Les statuts viennent de l'app étudiant MOBI ; les actions d'inscription, facturation et inscription
        pédagogique sont gérées dans MAPO par les Relations internationales et le Comptable.
      </p>
    </section>

    <div v-if="isDemoTenant" class="sd-demo-note">
      Données de démonstration — établissement fictif.
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useSuperieurStore } from '../../stores/superieur'
import { useMobiliteStore } from '../../stores/mobilite'
import { useSchoolIdentityStore } from '../../stores/schoolIdentity'

const schoolIdentity = useSchoolIdentityStore()
const isDemoTenant = computed(() => schoolIdentity.isDemoTenant)

const store = useSuperieurStore()
const s = computed(() => store.stats)

// Stats mobilité affichées en résumé sur le dashboard.
// Le store mobilité fait sa propre init au premier appel.
const mobStore = useMobiliteStore()
const mobStats = computed(() => mobStore.stats)

const circumference = 2 * Math.PI * 50

const maxEffectif = computed(() => Math.max(...s.value.parProgramme.map((p) => p.effectif), 1))
function barWidth(effectif) {
  return Math.round((effectif / maxEffectif.value) * 100)
}

const fmt = (n) => (n ?? 0).toLocaleString('fr-FR')
</script>

<style scoped>
.sd-intro {
  margin-bottom: 18px;
}
.sd-h1 {
  font-family: 'Poppins', sans-serif;
  font-size: 24px;
  font-weight: 800;
  color: var(--tx);
  margin: 0;
}
.sd-sub {
  font-size: 14px;
  color: var(--tx2);
  margin: 4px 0 0;
}

/* KPIs */
.sd-kpis {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 14px;
  margin-bottom: 18px;
}
.sd-kpi {
  background: var(--card);
  border: 1px solid var(--card-border);
  border-radius: var(--card-radius);
  box-shadow: var(--card-shadow);
  padding: 16px;
}
.sd-kpi-label {
  font-family: 'Poppins', sans-serif;
  font-size: 11.5px;
  font-weight: 600;
  color: var(--tx3);
  text-transform: uppercase;
  letter-spacing: 0.03em;
}
.sd-kpi-value {
  font-family: 'Poppins', sans-serif;
  font-size: 27px;
  font-weight: 800;
  color: var(--tx);
  margin: 6px 0 4px;
  line-height: 1;
}
.sd-kpi-unit {
  font-size: 16px;
  font-weight: 700;
  color: var(--tx2);
}
.sd-kpi-foot {
  font-size: 12px;
  color: var(--tx2);
}
.sd-kpi-foot.is-ok {
  color: var(--success);
}
.sd-kpi-foot.is-warn {
  color: var(--warn);
}

/* Grid */
.sd-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}
.sd-card {
  background: var(--card);
  border: 1px solid var(--card-border);
  border-radius: var(--card-radius);
  box-shadow: var(--card-shadow);
  padding: 18px 20px;
}
/* Mobilité entrante (résumé) */
.sd-mob-card { margin-top: 16px; }
.sd-mob-head { display: flex; justify-content: space-between; align-items: baseline; gap: 12px; flex-wrap: wrap; margin-bottom: 4px; }
.sd-mob-link {
  font-family: 'Poppins', sans-serif;
  font-size: 11.5px;
  font-weight: 600;
  color: var(--tx3);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.sd-mob-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 12px;
  margin-bottom: 14px;
}
.sd-mob-kpi {
  background: rgba(var(--pr-rgb), 0.04);
  border: 1px solid rgba(var(--pr-rgb), 0.12);
  border-radius: 10px;
  padding: 12px 14px;
  text-align: center;
}
.sd-mob-kpi.is-alert {
  background: rgba(178, 59, 59, 0.05);
  border-color: rgba(178, 59, 59, 0.28);
}
.sd-mob-kpi-num {
  font-family: 'Poppins', sans-serif;
  font-size: 22px;
  font-weight: 800;
  color: var(--tx);
}
.sd-mob-kpi-lab {
  font-size: 11px;
  color: var(--tx2);
  margin-top: 2px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  font-weight: 600;
}
.sd-mob-foot {
  font-size: 12.5px;
  color: var(--tx2);
  margin: 0;
  line-height: 1.5;
  font-style: italic;
}

.sd-h2 {
  font-family: 'Poppins', sans-serif;
  font-size: 16px;
  font-weight: 700;
  color: var(--tx);
  margin: 0 0 14px;
}

/* Programmes */
.sd-prog-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.sd-prog-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 7px;
}
.sd-prog-niveau {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 100px;
  font-family: 'Poppins', sans-serif;
  font-size: 10.5px;
  font-weight: 700;
  margin-right: 8px;
}
.sd-prog-niveau.n-licence {
  background: var(--pr-light);
  color: var(--pr);
}
.sd-prog-niveau.n-master {
  background: var(--gold-light);
  color: var(--gold);
}
.sd-prog-niveau.n-doctorat {
  background: rgba(124, 58, 237, 0.12);
  color: #6D28D9;
}
.sd-prog-nom {
  font-family: 'Poppins', sans-serif;
  font-size: 14px;
  font-weight: 600;
  color: var(--tx);
}
.sd-prog-eff {
  font-family: 'Poppins', sans-serif;
  font-size: 16px;
  font-weight: 800;
  color: var(--tx);
}
.sd-prog-track {
  height: 8px;
  background: var(--input-bg);
  border-radius: 100px;
  overflow: hidden;
}
.sd-prog-fill {
  height: 100%;
  background: var(--pr);
  border-radius: 100px;
}

/* Progression */
.sd-progress {
  display: flex;
  align-items: center;
  gap: 20px;
}
.sd-progress-ring {
  flex-shrink: 0;
}
.sd-ring-num {
  font-family: 'Poppins', sans-serif;
  font-size: 21px;
  font-weight: 800;
  fill: var(--tx);
}
.sd-ring-cap {
  font-family: 'Poppins', sans-serif;
  font-size: 9px;
  font-weight: 600;
  fill: var(--tx3);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.sd-progress-text p {
  font-size: 14px;
  color: var(--tx2);
  line-height: 1.55;
  margin: 0 0 8px;
}
.sd-progress-text strong {
  color: var(--tx);
  font-weight: 700;
}
.sd-progress-note {
  font-size: 13px !important;
  color: var(--tx3) !important;
}

.sd-demo-note {
  margin-top: 18px;
  text-align: center;
  font-size: 12px;
  color: var(--tx3);
}

@media (max-width: 1100px) {
  .sd-kpis {
    grid-template-columns: repeat(3, 1fr);
  }
  .sd-grid {
    grid-template-columns: 1fr;
  }
}
@media (max-width: 680px) {
  .sd-kpis {
    grid-template-columns: repeat(2, 1fr);
  }
  .sd-progress {
    flex-direction: column;
    text-align: center;
  }
  .sd-h1 { font-size: 22px; }
  .sd-card { padding: 14px 14px; }
  .sd-section { padding: 12px 14px; }
}

/* Effectifs par campus (groupe multi-campus) */
.sd-campus-card { margin-top: 18px; }
.sd-campus-sub { font-size: 13.5px; color: var(--muted); margin: 2px 0 16px; }
.sd-campus-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 14px; }
.sd-campus { border: 1px solid var(--border); border-radius: 14px; padding: 16px 18px; background: var(--input-bg); }
.sd-campus-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
.sd-campus-nom { font-family: 'Poppins', sans-serif; font-weight: 700; font-size: 15px; color: var(--text); }
.sd-campus-siege { font-size: 10.5px; font-weight: 700; color: var(--pr); background: rgba(var(--pr-rgb), 0.12); border-radius: 20px; padding: 2px 9px; }
.sd-campus-eff { font-family: 'Poppins', sans-serif; font-weight: 800; font-size: 30px; color: var(--text); line-height: 1.05; }
.sd-campus-cap { font-size: 12px; color: var(--muted); }
.sd-campus-dir { margin-top: 10px; font-size: 12.5px; color: var(--muted); border-top: 1px solid var(--border); padding-top: 8px; }

</style>
