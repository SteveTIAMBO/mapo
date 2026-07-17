<template>
  <div class="sm">
    <div class="sm-intro">
      <div>
        <h1 class="sm-h1">{{ t('sup.mobilite.title') }}</h1>
        <p class="sm-sub">
          {{ t('sup.mobilite.subtitle') }}
        </p>
      </div>
    </div>

    <!-- KPIs -->
    <div class="sm-kpis">
      <div class="sm-kpi">
        <div class="sm-kpi-num">{{ stats.total }}</div>
        <div class="sm-kpi-lab">{{ t('sup.mobilite.kpiOpen') }}</div>
      </div>
      <div class="sm-kpi">
        <div class="sm-kpi-num">{{ stats.acceptes }}</div>
        <div class="sm-kpi-lab">{{ t('sup.mobilite.kpiAccepted') }}</div>
      </div>
      <div class="sm-kpi">
        <div class="sm-kpi-num">{{ stats.visaObtenu }}</div>
        <div class="sm-kpi-lab">{{ t('sup.mobilite.kpiVisa') }}</div>
      </div>
      <div class="sm-kpi">
        <div class="sm-kpi-num">{{ stats.arrives }}</div>
        <div class="sm-kpi-lab">{{ t('sup.mobilite.kpiArrived') }}</div>
      </div>
      <div class="sm-kpi">
        <div class="sm-kpi-num">{{ stats.tauxConversion }}%</div>
        <div class="sm-kpi-lab">{{ t('sup.mobilite.kpiConversion') }}</div>
      </div>
      <div class="sm-kpi" :class="{ 'is-alert': stats.enRetard > 0 }">
        <div class="sm-kpi-num">{{ stats.enRetard }}</div>
        <div class="sm-kpi-lab">{{ t('sup.mobilite.kpiLate') }}</div>
      </div>
    </div>

    <!-- Alertes rôle-spécifiques -->
    <div v-if="alertes.length" class="sm-alertes">
      <div v-for="a in alertes" :key="a.key" class="sm-alerte" :class="`tone-${a.tone}`">
        <strong>{{ a.titre }}</strong> : {{ a.message }}
      </div>
    </div>

    <!-- Paiements de scolarité réels (pont MOBI) -->
    <section class="sm-card">
      <div class="sm-ps-head">
        <h2 class="sm-h2">{{ t('sup.mobilite.psTitle') }}</h2>
        <button class="sm-btn-secondary" type="button" :disabled="psStore.loading" @click="rafraichirPaiements">
          {{ psStore.loading ? t('sup.mobilite.refreshing') : t('sup.mobilite.refresh') }}
        </button>
      </div>
      <p class="sm-section-note">
        {{ t('sup.mobilite.psNote') }}
      </p>
      <p v-if="psStore.error" class="sm-ps-error">{{ psStore.error }}</p>
      <p v-else-if="psStore.paiements.length === 0 && !psStore.loading" class="sm-section-note">
        {{ t('sup.mobilite.psEmpty') }}
      </p>
      <div v-else class="sm-paiements">
        <div v-for="p in psStore.paiementsTries" :key="p.id" class="sm-paiement">
          <div class="sm-paiement-head">
            <div>
              <div class="sm-paiement-montant">{{ fmtMontantPS(p.montant, p.devise) }}</div>
              <div class="sm-paiement-motif">
                {{ p.studentName || p.studentEmail || t('sup.mobilite.studentFallback') }} · {{ p.motif || t('sup.mobilite.motifFallback') }}<span v-if="p.modePaiement"> · {{ labelMode(p.modePaiement) }}</span>
              </div>
            </div>
            <span class="sm-statut" :class="`tone-${psStatuts[p.status]?.tone || 'neutral'}`">
              {{ psStatuts[p.status]?.courtEcole || psStatuts[p.status]?.label || p.status }}
            </span>
          </div>
          <div class="sm-paiement-timeline">
            <span v-if="p.declareAt">{{ t('sup.mobilite.declaredOn', { date: fmtDate(p.declareAt) }) }}</span>
            <span v-if="p.recuEdufremAt"> {{ t('sup.mobilite.receivedEdufremOn', { date: fmtDate(p.recuEdufremAt) }) }}</span>
            <span v-if="p.transfertEnvoyeAt"> {{ t('sup.mobilite.transferSentOn', { date: fmtDate(p.transfertEnvoyeAt) }) }}</span>
            <span v-if="p.recuEcoleAt"> {{ t('sup.mobilite.confirmedSchoolOn', { date: fmtDate(p.recuEcoleAt) }) }}</span>
          </div>
          <div v-if="p.reference" class="sm-paiement-ref">{{ t('sup.mobilite.refPrefix', { ref: p.reference }) }}</div>
          <div v-if="p.certificatNom" class="sm-paiement-ref">{{ t('sup.mobilite.certifLabel', { nom: p.certificatNom }) }}<span v-if="p.certificatAt"> {{ t('sup.mobilite.certifSentOn', { date: fmtDate(p.certificatAt) }) }}</span></div>
          <div class="sm-action-btns sm-mt8">
            <button
              v-if="peutConfirmerPaiementEcole && p.status === 'transfert_envoye'"
              class="sm-btn-primary" type="button"
              @click="confirmerPaiementEcole(p)"
            >{{ t('sup.mobilite.confirmTransfer') }}</button>
            <button
              v-if="peutConfirmerPaiementEcole && !p.certificatNom && p.status !== 'declare_etudiant'"
              class="sm-btn-secondary" type="button"
              :disabled="certifEnvoiEnCours === p.id"
              @click="choisirCertificat(p)"
            >{{ certifEnvoiEnCours === p.id ? t('sup.mobilite.sendingCertif') : t('sup.mobilite.sendCertif') }}</button>
            <button
              v-if="p.certificatNom"
              class="sm-btn-secondary" type="button"
              @click="telechargerCertificatPS(p)"
            >{{ t('sup.mobilite.downloadCertif') }}</button>
          </div>
        </div>
      </div>
      <input ref="certifInput" type="file" accept="application/pdf" style="display:none" @change="onCertificatChoisi" />
    </section>

    <!-- Répartition par programme -->
    <section class="sm-card">
      <h2 class="sm-h2">{{ t('sup.mobilite.repartTitle') }}</h2>
      <div class="sm-prog-list">
        <div v-for="p in store.repartitionParProgramme" :key="p.programmeId" class="sm-prog">
          <div class="sm-prog-head">
            <span class="sm-prog-nom">{{ p.programmeNom }}</span>
            <span class="sm-prog-eff">{{ p.arrives }} / {{ p.total }}</span>
          </div>
          <div class="sm-prog-track">
            <div class="sm-prog-fill" :style="{ width: barWidth(p) + '%' }"></div>
          </div>
        </div>
      </div>
    </section>

    <!-- Tableau -->
    <section class="sm-card">
      <div class="sm-filters">
        <input
          :value="store.filters.search"
          @input="(e) => store.setFilter('search', e.target.value)"
          type="text"
          :placeholder="t('sup.mobilite.searchPlaceholder')"
          class="sm-input"
        />
        <select :value="store.filters.statut" @change="(e) => store.setFilter('statut', e.target.value)" class="sm-select">
          <option value="">{{ t('sup.mobilite.allStatuts') }}</option>
          <option v-for="(s, k) in statutsMobi" :key="k" :value="k">{{ s.label }}</option>
        </select>
        <select :value="store.filters.programmeId" @change="(e) => store.setFilter('programmeId', e.target.value)" class="sm-select">
          <option value="">{{ t('sup.mobilite.allProgrammes') }}</option>
          <option v-for="p in programmes" :key="p.id" :value="p.id">{{ p.nom }}</option>
        </select>
        <select :value="store.filters.rentree" @change="(e) => store.setFilter('rentree', e.target.value)" class="sm-select">
          <option value="">{{ t('sup.mobilite.allRentrees') }}</option>
          <option v-for="r in rentreesUniques" :key="r" :value="r">{{ fmtDateShort(r) }}</option>
        </select>
        <select :value="store.filters.dossier" @change="(e) => store.setFilter('dossier', e.target.value)" class="sm-select">
          <option value="">{{ t('sup.mobilite.allDossiers') }}</option>
          <option value="incomplet">{{ t('sup.mobilite.dossierIncomplet') }}</option>
          <option value="complet">{{ t('sup.mobilite.dossierComplet') }}</option>
        </select>
      </div>

      <div class="sm-table-wrap">
        <table class="sm-table">
          <thead>
            <tr>
              <th>{{ t('sup.mobilite.thStudent') }}</th>
              <th>{{ t('sup.mobilite.thOrigin') }}</th>
              <th>{{ t('sup.mobilite.thTargetProgram') }}</th>
              <th>{{ t('sup.mobilite.thIntake') }}</th>
              <th>{{ t('sup.mobilite.thStatutMobi') }}</th>
              <th>{{ t('sup.mobilite.thDossier') }}</th>
              <th>{{ t('sup.mobilite.thAcompte') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="d in store.filteredDossiers" :key="d.id" class="sm-row" @click="openDetail(d)">
              <td>
                <div class="sm-etu-nom">{{ d.nomComplet }}</div>
                <div class="sm-etu-id">{{ d.identifiantMobi }}</div>
              </td>
              <td>
                <div>{{ d.villeOrigine }}</div>
                <div class="sm-meta">{{ d.paysOrigine }}</div>
              </td>
              <td>
                <div>{{ d.programmeNom }}</div>
                <div class="sm-meta">{{ d.anneeNom }}</div>
              </td>
              <td class="date">{{ fmtDateShort(d.rentreePrevu) }}</td>
              <td>
                <span class="sm-statut" :class="`tone-${statutsMobi[d.statutMobi].tone}`">
                  {{ statutsMobi[d.statutMobi].label }}
                </span>
              </td>
              <td>
                <span class="sm-statut" :class="`tone-${statutsDossier[d.dossierInscription].tone}`">
                  {{ statutsDossier[d.dossierInscription].label }}
                </span>
              </td>
              <td>
                <span class="sm-tag" :class="`tone-${statutsAcompte[d.acompteStatut || 'non_demande'].tone}`">
                  {{ statutsAcompte[d.acompteStatut || 'non_demande'].label }}
                </span>
                <div v-if="d.acompteMontant" class="sm-meta">{{ fmtMontant(d.acompteMontant) }}</div>
              </td>
            </tr>
            <tr v-if="store.filteredDossiers.length === 0">
              <td colspan="7" class="sm-empty">{{ t('sup.mobilite.emptyDossiers') }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Liste mobile : cartes tappables (le tableau est masqué sur petit écran) -->
      <ul class="sm-mlist">
        <li v-for="d in store.filteredDossiers" :key="d.id" class="sm-mrow" @click="openDetail(d)">
          <div class="sm-mrow-main">
            <div class="sm-mrow-name">{{ d.nomComplet }}</div>
            <div class="sm-mrow-sub">{{ d.villeOrigine }}, {{ d.paysOrigine }} → {{ d.programmeNom }}</div>
            <div class="sm-mrow-meta">
              <span class="sm-statut" :class="`tone-${statutsMobi[d.statutMobi].tone}`">{{ statutsMobi[d.statutMobi].label }}</span>
            </div>
          </div>
          <svg class="sm-mrow-chev" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
        </li>
        <li v-if="store.filteredDossiers.length === 0" class="sm-mempty">{{ t('sup.mobilite.emptyDossiers') }}</li>
      </ul>
    </section>

    <!-- Pop-up confirmation envoi certificat -->
    <div v-if="askCertifFor" class="sm-modal" @click.self="annulerEnvoiCertificat">
      <div class="sm-modal-content sm-modal-small">
        <header class="sm-modal-head">
          <h3>{{ t('sup.mobilite.certifModalTitle') }}</h3>
          <button class="sm-modal-close" type="button" @click="annulerEnvoiCertificat">×</button>
        </header>
        <div class="sm-modal-body">
          <p class="sm-confirm-text">
            {{ t('sup.mobilite.certifConfirmText') }}
            <strong>{{ askCertifFor.nomComplet }}</strong> ({{ askCertifFor.email }}).
          </p>
          <p class="sm-confirm-note">
            {{ t('sup.mobilite.certifConfirmNote') }}
          </p>
          <div class="sm-confirm-btns">
            <button class="sm-btn-secondary" type="button" @click="annulerEnvoiCertificat">{{ t('sup.mobilite.cancel') }}</button>
            <button class="sm-btn-primary" type="button" @click="confirmerEnvoiCertificat">{{ t('sup.mobilite.confirmSend') }}</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Fiche détail -->
    <div v-if="detail" class="sm-modal" @click.self="closeDetail">
      <div class="sm-modal-content">
        <header class="sm-modal-head">
          <div>
            <h3>{{ detail.nomComplet }}</h3>
            <p class="sm-modal-sub">
              {{ detail.identifiantMobi }} · {{ detail.villeOrigine }}, {{ detail.paysOrigine }}
            </p>
          </div>
          <button class="sm-modal-close" type="button" @click="closeDetail">×</button>
        </header>

        <div class="sm-modal-body">
          <!-- Workflow MOBI -->
          <section class="sm-section">
            <h4 class="sm-section-h">{{ t('sup.mobilite.detailProgressTitle') }}</h4>
            <div class="sm-workflow">
              <div
                v-for="(s, idx) in workflowSteps"
                :key="s.key"
                class="sm-step"
                :class="{
                  active: s.rang === currentRang,
                  done: s.rang < currentRang,
                }"
              >
                <span class="sm-step-dot"></span>
                <span class="sm-step-lab">{{ s.label }}</span>
              </div>
            </div>
            <p class="sm-section-note">
              {{ t('sup.mobilite.detailProgressNote') }}
            </p>
          </section>

          <!-- Infos étudiant -->
          <section class="sm-section">
            <h4 class="sm-section-h">{{ t('sup.mobilite.detailStudentInfo') }}</h4>
            <div class="sm-infos">
              <div><span class="sm-lab">{{ t('sup.mobilite.labEmail') }}</span><span>{{ detail.email }}</span></div>
              <div><span class="sm-lab">{{ t('sup.mobilite.labPhone') }}</span><span>{{ detail.telephone }}</span></div>
              <div><span class="sm-lab">{{ t('sup.mobilite.labCurrentProgram') }}</span><span>{{ detail.formationActuelle }}</span></div>
              <div><span class="sm-lab">{{ t('sup.mobilite.labAcceptDate') }}</span><span>{{ fmtDate(detail.dateAcceptation) }}</span></div>
            </div>
          </section>

          <!-- Cible école -->
          <section class="sm-section">
            <h4 class="sm-section-h">{{ t('sup.mobilite.thTargetProgram') }}</h4>
            <div class="sm-infos">
              <div><span class="sm-lab">{{ t('sup.mobilite.labProgramme') }}</span><span>{{ detail.programmeNom }}</span></div>
              <div><span class="sm-lab">{{ t('sup.mobilite.labYear') }}</span><span>{{ detail.anneeNom }}</span></div>
              <div><span class="sm-lab">{{ t('sup.mobilite.labIntakePlanned') }}</span><span>{{ fmtDate(detail.rentreePrevu) }}</span></div>
            </div>
          </section>

          <!-- Actions école (selon rôle) -->
          <section class="sm-section">
            <h4 class="sm-section-h">{{ t('sup.mobilite.detailActions') }}</h4>

            <div class="sm-action-line">
              <span class="sm-action-lab">{{ t('sup.mobilite.lineDossier') }}</span>
              <span class="sm-statut" :class="`tone-${statutsDossier[detail.dossierInscription].tone}`">
                {{ statutsDossier[detail.dossierInscription].label }}
              </span>
              <div v-if="peutEditerInscription" class="sm-action-btns">
                <button
                  v-if="detail.dossierInscription === 'incomplet'"
                  class="sm-btn-primary"
                  type="button"
                  @click="action('marquerDossierComplet', detail.id)"
                >{{ t('sup.mobilite.markComplete') }}</button>
                <button
                  v-else
                  class="sm-btn-secondary"
                  type="button"
                  @click="action('marquerDossierIncomplet', detail.id)"
                >{{ t('sup.mobilite.markIncomplete') }}</button>
              </div>
            </div>

            <div class="sm-action-line">
              <span class="sm-action-lab">{{ t('sup.mobilite.linePeda') }}</span>
              <span class="sm-statut" :class="detail.inscriptionPedaDeclenchee ? 'tone-success' : 'tone-neutral'">
                {{ detail.inscriptionPedaDeclenchee ? t('sup.mobilite.pedaTriggered') : t('sup.mobilite.pedaWaiting') }}
              </span>
              <div v-if="peutEditerInscription && !detail.inscriptionPedaDeclenchee" class="sm-action-btns">
                <button
                  class="sm-btn-primary"
                  type="button"
                  :disabled="detail.dossierInscription !== 'complet'"
                  :title="detail.dossierInscription !== 'complet' ? t('sup.mobilite.pedaMustComplete') : ''"
                  @click="action('declencherInscriptionPeda', detail.id)"
                >{{ t('sup.mobilite.trigger') }}</button>
              </div>
            </div>

            <div class="sm-action-line">
              <span class="sm-action-lab">{{ t('sup.mobilite.lineFacture') }}</span>
              <span class="sm-statut" :class="detail.factureEmise ? 'tone-info' : 'tone-neutral'">
                {{ detail.factureEmise ? t('sup.mobilite.factureEmise') : t('sup.mobilite.factureAEmettre') }}
              </span>
              <div v-if="peutEditerFinance" class="sm-action-btns">
                <button
                  v-if="!detail.factureEmise"
                  class="sm-btn-primary"
                  type="button"
                  @click="action('marquerFactureEmise', detail.id, true)"
                >{{ t('sup.mobilite.markIssued') }}</button>
                <button
                  v-else
                  class="sm-btn-secondary"
                  type="button"
                  @click="action('marquerFactureEmise', detail.id, false)"
                >{{ t('sup.mobilite.cancelIssue') }}</button>
              </div>
            </div>

            <!-- Workflow acompte de scolarité -->
            <div class="sm-action-line sm-acompte-line">
              <span class="sm-action-lab">{{ t('sup.mobilite.lineAcompte') }}</span>
              <span class="sm-statut" :class="`tone-${statutsAcompte[detail.acompteStatut || 'non_demande'].tone}`">
                {{ statutsAcompte[detail.acompteStatut || 'non_demande'].label }}
              </span>
              <span v-if="detail.acompteMontant" class="sm-acompte-montant">{{ fmtMontant(detail.acompteMontant) }}</span>
            </div>

            <!-- Traçabilité -->
            <div v-if="detail.acompteSource" class="sm-acompte-trace">
              <div v-if="detail.acompteValideEdufremDate">
                {{ t('sup.mobilite.traceAttested', { date: fmtDate(detail.acompteValideEdufremDate) }) }}
              </div>
              <div v-if="detail.acompteConfirmeEcoleDate">
                {{ t('sup.mobilite.traceConfirmedSchool', { date: fmtDate(detail.acompteConfirmeEcoleDate) }) }}
                <span v-if="detail.acompteSource === 'ecole'"> {{ t('sup.mobilite.traceDirectSchool') }}</span>
              </div>
            </div>

            <!-- Boutons super admin EDUFREM -->
            <div v-if="isSuperAdminEdufrem && detail.factureEmise && detail.acompteStatut !== 'confirme_ecole'" class="sm-action-btns sm-mt8">
              <button
                v-if="detail.acompteStatut !== 'atteste_edufrem'"
                class="sm-btn-primary"
                type="button"
                @click="action('attesterAcompteEdufrem', detail.id, authMega.uid || 'superadmin', detail.acompteMontant)"
              >{{ t('sup.mobilite.attestEdufrem') }}</button>
              <button
                v-else
                class="sm-btn-secondary"
                type="button"
                disabled
                :title="t('sup.mobilite.attestWaitingSchool')"
              >{{ t('sup.mobilite.attestSentSchool') }}</button>
            </div>

            <!-- Boutons école -->
            <div v-if="peutConfirmerEcole && detail.factureEmise" class="sm-action-btns sm-mt8">
              <!-- Cas 1 : EDUFREM a attesté → école confirme -->
              <button
                v-if="detail.acompteStatut === 'atteste_edufrem'"
                class="sm-btn-primary"
                type="button"
                @click="action('confirmerAcompteEcole', detail.id, authSup.userId || 'comptable')"
              >{{ t('sup.mobilite.confirmPaymentReceived') }}</button>
              <!-- Cas 2 : encaissement direct école (sans EDUFREM) -->
              <button
                v-if="detail.acompteStatut === 'en_attente' || detail.acompteStatut === 'non_demande'"
                class="sm-btn-secondary"
                type="button"
                @click="action('attesterAcompteEcole', detail.id, authSup.userId || 'comptable', detail.acompteMontant)"
              >{{ t('sup.mobilite.attestDirectSchool') }}</button>
            </div>

            <!-- Envoi certificat de scolarité -->
            <div v-if="detail.acompteStatut === 'confirme_ecole'" class="sm-action-line sm-mt12">
              <span class="sm-action-lab">{{ t('sup.mobilite.lineCertif') }}</span>
              <span class="sm-statut" :class="detail.certificatEnvoye ? 'tone-success' : 'tone-warning'">
                {{ detail.certificatEnvoye ? t('sup.mobilite.certifSent') : t('sup.mobilite.certifToSend') }}
              </span>
              <div v-if="peutEnvoyerCertificat && !detail.certificatEnvoye" class="sm-action-btns">
                <button
                  class="sm-btn-primary"
                  type="button"
                  @click="demanderEnvoiCertificat(detail)"
                >{{ t('sup.mobilite.markCertifSent') }}</button>
              </div>
              <div v-else-if="detail.certificatEnvoyeDate" class="sm-meta">
                {{ t('sup.mobilite.sentOn', { date: fmtDate(detail.certificatEnvoyeDate) }) }}
              </div>
            </div>

            <p v-if="!peutEditerInscription && !peutEditerFinance && !isSuperAdminEdufrem" class="sm-section-note">
              {{ t('sup.mobilite.noRights') }}
            </p>
          </section>

          <!-- Lien MOBI (futur — affichage info seulement pour cette version) -->
          <section v-if="detail.mobiStudentId" class="sm-section">
            <h4 class="sm-section-h">{{ t('sup.mobilite.mobiProcTitle') }}</h4>
            <div class="sm-infos">
              <div><span class="sm-lab">{{ t('sup.mobilite.labMobiId') }}</span><span>{{ detail.mobiStudentId }}</span></div>
              <div v-if="detail.mobiStatutProcedure"><span class="sm-lab">{{ t('sup.mobilite.labCurrentStep') }}</span><span>{{ detail.mobiStatutProcedure }}</span></div>
              <div v-if="detail.mobiLastUpdate"><span class="sm-lab">{{ t('sup.mobilite.labLastUpdate') }}</span><span>{{ fmtDate(detail.mobiLastUpdate) }}</span></div>
            </div>
          </section>

          <!-- Paiements de scolarité (workflow MOBI ↔ MAPO) -->
          <section v-if="detail.mobiStudentId" class="sm-section">
            <h4 class="sm-section-h">{{ t('sup.mobilite.psTitle') }}</h4>
            <p v-if="paiementsStudent.length === 0" class="sm-section-note">
              {{ t('sup.mobilite.psEmptyStudent') }}
            </p>
            <div v-else class="sm-paiements">
              <div v-for="p in paiementsStudent" :key="p.id" class="sm-paiement">
                <div class="sm-paiement-head">
                  <div>
                    <div class="sm-paiement-montant">{{ fmtMontantPS(p.montant, p.devise) }}</div>
                    <div class="sm-paiement-motif">{{ p.motif || t('sup.mobilite.motifFallback') }}<span v-if="p.modePaiement"> · {{ labelMode(p.modePaiement) }}</span></div>
                  </div>
                  <span class="sm-statut" :class="`tone-${psStatuts[p.status]?.tone || 'neutral'}`">
                    {{ psStatuts[p.status]?.courtEcole || psStatuts[p.status]?.label || p.status }}
                  </span>
                </div>
                <div class="sm-paiement-timeline">
                  <span v-if="p.declareAt">{{ t('sup.mobilite.declaredOn', { date: fmtDate(p.declareAt) }) }}</span>
                  <span v-if="p.recuEdufremAt"> {{ t('sup.mobilite.receivedEdufremOn', { date: fmtDate(p.recuEdufremAt) }) }}</span>
                  <span v-if="p.transfertEnvoyeAt"> {{ t('sup.mobilite.transferSentOn', { date: fmtDate(p.transfertEnvoyeAt) }) }}</span>
                  <span v-if="p.recuEcoleAt"> {{ t('sup.mobilite.confirmedSchoolOn', { date: fmtDate(p.recuEcoleAt) }) }}</span>
                </div>
                <div v-if="p.reference" class="sm-paiement-ref">{{ t('sup.mobilite.refPrefix', { ref: p.reference }) }}</div>
                <div v-if="peutConfirmerPaiementEcole && p.status === 'transfert_envoye'" class="sm-action-btns sm-mt8">
                  <button class="sm-btn-primary" type="button" @click="confirmerPaiementEcole(p)">
                    {{ t('sup.mobilite.confirmTransfer') }}
                  </button>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useMobiliteStore, STATUTS_MOBI, STATUTS_DOSSIER, STATUTS_ACOMPTE } from '../../stores/mobilite'
import { currentSchoolId } from '../../utils/supSync'
import { PROGRAMMES } from '../../stores/superieur'
import { useSuperieurAuthStore } from '../../stores/superieurAuth'
import { useAuthStore } from '../../stores/auth'
import { usePaiementsScolariteStore, PAIEMENT_STATUTS, MODES_PAIEMENT } from '../../stores/paiementsScolarite'

const store = useMobiliteStore()
const authSup = useSuperieurAuthStore()
const authMega = useAuthStore()
const psStore = usePaiementsScolariteStore()
const psStatuts = PAIEMENT_STATUTS

const { t, locale } = useI18n({ useScope: 'global' })

const statutsMobi = STATUTS_MOBI
const statutsDossier = STATUTS_DOSSIER
const statutsAcompte = STATUTS_ACOMPTE
const programmes = PROGRAMMES

const stats = computed(() => store.stats)

// Permissions
const peutEditerInscription = computed(
  () => authSup.role === 'admin' || authSup.role === 'relation_internationale'
)
const peutEditerFinance = computed(
  () => authSup.role === 'admin' || authSup.role === 'comptable'
)
// Super admin EDUFREM : peut attester l'acompte reçu sur le compte EDUFREM
// (flux de médiation). Détecté soit via le store auth Firebase, soit en démo
// via un rôle "super_admin" sur le store démo.
const isSuperAdminEdufrem = computed(() =>
  authMega.isSuperAdmin || authSup.role === 'super_admin'
)
// L'école garde la main sur la confirmation finale + envoi certificat
const peutConfirmerEcole = computed(
  () => authSup.role === 'admin' || authSup.role === 'comptable'
)
const peutEnvoyerCertificat = computed(
  () => authSup.role === 'admin' || authSup.role === 'relation_internationale'
)

// Pop-up de confirmation envoi certificat
const askCertifFor = ref(null)
function demanderEnvoiCertificat(dossier) { askCertifFor.value = dossier }
function annulerEnvoiCertificat() { askCertifFor.value = null }
function confirmerEnvoiCertificat() {
  if (askCertifFor.value) {
    store.marquerCertificatEnvoye(askCertifFor.value.id, authSup.userId || 'ecole')
    askCertifFor.value = null
  }
}

function fmtMontant(n) {
  if (n == null) return '—'
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XAF', maximumFractionDigits: 0 }).format(n)
}

// Alertes contextuelles selon rôle
const alertes = computed(() => {
  const items = []
  const role = authSup.role
  if (role === 'admin' || role === 'relation_internationale') {
    if (stats.value.dossiersIncomplets > 0) {
      items.push({
        key: 'inscription',
        tone: 'warning',
        titre: t('sup.mobilite.alertIncompleteTitle'),
        message: t('sup.mobilite.alertIncompleteMsg', { n: stats.value.dossiersIncomplets }),
      })
    }
  }
  if (role === 'admin' || role === 'comptable') {
    if (stats.value.facturesNonEmises > 0) {
      items.push({
        key: 'finance',
        tone: 'warning',
        titre: t('sup.mobilite.alertInvoiceTitle'),
        message: t('sup.mobilite.alertInvoiceMsg', { n: stats.value.facturesNonEmises }),
      })
    }
  }
  if (stats.value.enRetard > 0) {
    items.push({
      key: 'retard',
      tone: 'danger',
      titre: t('sup.mobilite.alertLateTitle'),
      message: t('sup.mobilite.alertLateMsg', { n: stats.value.enRetard }),
    })
  }
  return items
})

// Rentrées uniques pour le filtre
const rentreesUniques = computed(() => {
  return [...new Set(store.dossiers.map((d) => d.rentreePrevu))].sort()
})

// Répartition par programme
const maxProg = computed(() => Math.max(1, ...store.repartitionParProgramme.map((p) => p.total)))
function barWidth(p) {
  return Math.min(100, Math.max(4, (p.total / maxProg.value) * 100))
}

// Workflow steps (ordonnés par rang)
const workflowSteps = computed(() =>
  Object.values(STATUTS_MOBI).sort((a, b) => a.rang - b.rang)
)

// Détail
const detail = ref(null)
function openDetail(d) { detail.value = d }
function closeDetail() {
  detail.value = null
  store.clearSelection()
}

// Auto-ouverture du dossier demandé depuis l'extérieur (cloche, dashboard).
function maybeOpenSelected() {
  const id = store.selectedDossierId
  if (!id) return
  const d = store.getDossier(id)
  if (d) detail.value = d
}
onMounted(maybeOpenSelected)
watch(() => store.selectedDossierId, maybeOpenSelected)
const currentRang = computed(() =>
  detail.value ? STATUTS_MOBI[detail.value.statutMobi].rang : 0
)

function action(method, ...args) {
  const result = store[method](...args)
  if (result) detail.value = result
}

function fmtDate(iso) {
  if (!iso) return ''
  return new Date(iso + 'T00:00:00').toLocaleDateString(locale.value === 'en' ? 'en-GB' : 'fr-FR', {
    day: '2-digit', month: 'long', year: 'numeric',
  })
}
function fmtDateShort(iso) {
  if (!iso) return ''
  return new Date(iso + 'T00:00:00').toLocaleDateString(locale.value === 'en' ? 'en-GB' : 'fr-FR', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

// ── Paiements scolarité MOBI ↔ MAPO ──────────────────────────────────
// Souscription temps réel aux paiements de l'école courante quand on entre
// dans la vue Mobilité. Filtrage par étudiant via mobiStudentId dans la
// fiche détail.

onMounted(() => {
  // En mode école, le slug du sous-domaine est l'identifiant utilisé par les
  // étudiants côté MOBI (ex. entpe). Repli sur le profil pour les autres modes.
  const schoolId = currentSchoolId() || authMega.userProfile?.schoolId
  if (schoolId) psStore.subscribeBySchool(schoolId)
})

function rafraichirPaiements() { psStore.refresh() }

// ── Envoi du certificat de scolarité (PDF, via pont MOBI) ────────────
const certifInput = ref(null)
const certifPour = ref(null)
const certifEnvoiEnCours = ref(null)

function choisirCertificat(p) {
  certifPour.value = p
  if (certifInput.value) { certifInput.value.value = ''; certifInput.value.click() }
}

async function onCertificatChoisi(e) {
  const file = e.target.files && e.target.files[0]
  const p = certifPour.value
  certifPour.value = null
  if (!file || !p) return
  const ok = window.confirm(
    t('sup.mobilite.confirmSendCertifJs', { file: file.name, name: p.studentName || t('sup.mobilite.studentFallbackJs') })
  )
  if (!ok) return
  certifEnvoiEnCours.value = p.id
  const r = await psStore.envoyerCertificat(p.id, file)
  certifEnvoiEnCours.value = null
  if (!r.success) window.alert(r.error || t('sup.mobilite.certifSendFailed'))
}

async function telechargerCertificatPS(p) {
  const r = await psStore.telechargerCertificat(p)
  if (!r.success) window.alert(r.error || t('sup.mobilite.downloadFailed'))
}

const paiementsStudent = computed(() => {
  if (!detail.value?.mobiStudentId) return []
  return psStore.getByStudent(detail.value.mobiStudentId)
})

function fmtMontantPS(montant, devise = 'XAF') {
  if (montant == null) return '—'
  try {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency', currency: devise, maximumFractionDigits: 0,
    }).format(montant)
  } catch (e) {
    return `${montant} ${devise}`
  }
}
function labelMode(v) {
  return MODES_PAIEMENT.find((m) => m.value === v)?.label || v
}

const peutConfirmerPaiementEcole = computed(
  () => authSup.role === 'admin' || authSup.role === 'comptable'
)

async function confirmerPaiementEcole(p) {
  if (!p) return
  const ok = window.confirm(
    t('sup.mobilite.confirmReceiveTransferJs', { montant: fmtMontantPS(p.montant, p.devise), name: p.studentName })
  )
  if (!ok) return
  const r = await psStore.confirmerReceptionEcole(p.id)
  if (!r.success) {
    window.alert(r.error || t('sup.mobilite.confirmFailed'))
  }
}
</script>

<style scoped>
.sm { display: flex; flex-direction: column; gap: 22px; }
.sm-intro { padding: 8px 0; }
.sm-h1 { font-family: 'Poppins', sans-serif; font-size: 26px; font-weight: 800; color: #1A1D1F; margin: 0 0 4px; }
.sm-sub { font-size: 14px; color: #6F767E; margin: 0; max-width: 760px; line-height: 1.5; }
.sm-h2 { font-family: 'Poppins', sans-serif; font-size: 15.5px; font-weight: 700; color: #1A1D1F; margin: 0 0 14px; }

.sm-kpis {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 10px;
}
.sm-kpi {
  background: #fff;
  border: 1px solid #ECECE8;
  border-radius: 12px;
  padding: 13px 16px;
  text-align: center;
}
.sm-kpi.is-alert { border-color: rgba(178, 59, 59, 0.35); background: rgba(178, 59, 59, 0.04); }
.sm-kpi-num { font-family: 'Poppins', sans-serif; font-size: 22px; font-weight: 800; color: #1A1D1F; }
.sm-kpi-lab { font-size: 11px; color: #6F767E; margin-top: 2px; text-transform: uppercase; letter-spacing: 0.04em; font-weight: 600; }

.sm-alertes { display: flex; flex-direction: column; gap: 8px; }
.sm-alerte {
  padding: 10px 14px;
  border-radius: 10px;
  font-size: 13px;
  border: 1px solid;
}
.sm-alerte.tone-warning { background: rgba(184, 137, 42, 0.08); border-color: rgba(184, 137, 42, 0.28); color: #7C5A1C; }
.sm-alerte.tone-danger { background: rgba(178, 59, 59, 0.06); border-color: rgba(178, 59, 59, 0.28); color: #8A2A2A; }

.sm-card {
  background: #fff;
  border: 1px solid #ECECE8;
  border-radius: 14px;
  padding: 18px 20px;
}

.sm-prog-list { display: flex; flex-direction: column; gap: 12px; }
.sm-prog { display: flex; flex-direction: column; gap: 6px; }
.sm-prog-head { display: flex; justify-content: space-between; align-items: center; }
.sm-prog-nom { font-family: 'Poppins', sans-serif; font-size: 13px; font-weight: 700; color: #1A1D1F; }
.sm-prog-eff { font-size: 11.5px; color: #6F767E; font-weight: 600; }
.sm-prog-track { height: 6px; background: rgba(var(--pr-rgb), 0.08); border-radius: 100px; overflow: hidden; }
.sm-prog-fill { height: 100%; background: var(--pr); border-radius: 100px; }

.sm-filters {
  display: flex; flex-wrap: wrap; gap: 10px;
  margin-bottom: 14px;
}
.sm-input, .sm-select {
  padding: 9px 12px;
  border: 1px solid #DCDCD8;
  border-radius: 9px;
  font-size: 13px; font-family: inherit; color: #1A1D1F;
  background: #fff;
}
.sm-input { flex: 1; min-width: 240px; }
.sm-input:focus, .sm-select:focus {
  outline: none; border-color: var(--pr);
  box-shadow: 0 0 0 3px rgba(var(--pr-rgb), 0.18);
}

.sm-table-wrap { overflow-x: auto; }
.sm-table { width: 100%; border-collapse: collapse; }
.sm-table th {
  text-align: left;
  font-family: 'Poppins', sans-serif;
  font-size: 11px; font-weight: 700; color: #6F767E;
  text-transform: uppercase; letter-spacing: 0.04em;
  padding: 8px 10px;
  border-bottom: 1px solid #ECECE8;
}
.sm-table td {
  padding: 11px 10px;
  border-bottom: 1px solid #F4F4F0;
  font-size: 13px; color: #1A1D1F;
}
.sm-row { cursor: pointer; transition: background 0.12s ease; }
.sm-row:hover { background: rgba(var(--pr-rgb), 0.04); }
.sm-table td.date { white-space: nowrap; font-size: 12.5px; color: #6F767E; }
.sm-etu-nom { font-family: 'Poppins', sans-serif; font-weight: 700; }
.sm-etu-id { font-size: 11px; color: #6F767E; margin-top: 2px; font-family: monospace; }
.sm-meta { font-size: 11.5px; color: #6F767E; margin-top: 2px; }
.sm-empty { text-align: center; color: #9A9FA5; padding: 30px 10px; font-style: italic; }

.sm-statut, .sm-tag {
  display: inline-block;
  font-family: 'Poppins', sans-serif;
  font-size: 10.5px; font-weight: 700;
  padding: 3px 9px;
  border-radius: 100px;
}
.tone-neutral { background: rgba(149, 149, 149, 0.16); color: #4F5258; }
.tone-info { background: rgba(var(--pr-rgb), 0.12); color: var(--pr); }
.tone-warning { background: rgba(184, 137, 42, 0.15); color: #B07308; }
.tone-success { background: rgba(46, 139, 87, 0.14); color: #2E8B57; }
.tone-danger { background: rgba(178, 59, 59, 0.14); color: #B23B3B; }

/* Modale */
.sm-modal {
  position: fixed; inset: 0; z-index: 30;
  background: rgba(0,0,0,0.5);
  display: flex; align-items: center; justify-content: center;
  padding: 20px;
  overflow-y: auto;
}
.sm-modal-content {
  background: #fff;
  border-radius: 16px;
  width: 100%; max-width: 720px;
  display: flex; flex-direction: column;
  box-shadow: 0 28px 70px rgba(0,0,0,0.4);
  max-height: 92vh;
}
.sm-modal-head {
  display: flex; align-items: center; justify-content: space-between;
  padding: 16px 22px; border-bottom: 1px solid #ECECE8;
}
.sm-modal-head h3 { font-family: 'Poppins', sans-serif; font-size: 17px; font-weight: 700; color: #1A1D1F; margin: 0; }
.sm-modal-sub { font-size: 12.5px; color: #6F767E; margin: 2px 0 0; }
.sm-modal-close {
  background: transparent; border: none;
  font-size: 28px; color: #6F767E; cursor: pointer;
  width: 32px; height: 32px; border-radius: 8px;
}
.sm-modal-close:hover { background: #F4F4F0; color: #1A1D1F; }
.sm-modal-body { padding: 18px 22px; overflow-y: auto; }

.sm-section { margin-bottom: 22px; }
.sm-section-h {
  font-family: 'Poppins', sans-serif;
  font-size: 12.5px; font-weight: 700; color: #6F767E;
  text-transform: uppercase; letter-spacing: 0.04em;
  margin: 0 0 10px;
}
.sm-section-note { font-size: 11.5px; color: #9A9FA5; margin-top: 8px; font-style: italic; }

.sm-paiements { display: flex; flex-direction: column; gap: 10px; }
.sm-paiement { background: #FAFAF7; border: 1px solid #ECECE8; border-radius: 10px; padding: 12px 14px; }
.sm-paiement-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 10px; }
.sm-paiement-montant { font-family: 'Poppins', sans-serif; font-size: 16px; font-weight: 700; color: #1A1D1F; }
.sm-paiement-motif { font-size: 12.5px; color: #6F767E; margin-top: 2px; }
.sm-paiement-timeline { font-size: 11.5px; color: #6F767E; margin-top: 8px; line-height: 1.55; }
.sm-paiement-ref { font-family: 'JetBrains Mono', monospace; font-size: 11px; color: #5C5F62; margin-top: 6px; }

.sm-workflow {
  display: flex; flex-wrap: wrap; gap: 8px 14px;
  align-items: center;
}
.sm-step {
  display: inline-flex; align-items: center; gap: 6px;
  font-size: 12px; color: #9A9FA5;
}
.sm-step-dot {
  width: 10px; height: 10px;
  border-radius: 50%;
  background: #DCDCD8;
  flex-shrink: 0;
}
.sm-step.done { color: #6F767E; }
.sm-step.done .sm-step-dot { background: #2E8B57; }
.sm-step.active { color: var(--pr); font-weight: 700; font-size: 12.5px; }
.sm-step.active .sm-step-dot { background: var(--pr); box-shadow: 0 0 0 3px rgba(var(--pr-rgb), 0.18); }

.sm-infos {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px 18px;
}
.sm-infos > div { display: flex; flex-direction: column; gap: 2px; font-size: 13px; color: #1A1D1F; }
.sm-lab { font-size: 10.5px; color: #6F767E; text-transform: uppercase; letter-spacing: 0.04em; font-weight: 600; }

.sm-action-line {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 0;
  border-bottom: 1px solid #F4F4F0;
  flex-wrap: wrap;
}
.sm-action-line:last-child { border-bottom: none; }
.sm-action-lab { font-size: 13px; color: #1A1D1F; font-weight: 600; min-width: 180px; }
.sm-action-btns { margin-left: auto; display: flex; gap: 6px; }

.sm-btn-primary, .sm-btn-secondary {
  padding: 7px 14px;
  border-radius: 8px;
  border: 1px solid transparent;
  font-family: 'Poppins', sans-serif;
  font-size: 12.5px; font-weight: 700;
  cursor: pointer;
}
.sm-btn-primary { background: var(--pr); color: #fff; }
.sm-btn-primary:hover:not(:disabled) { background: #11498F; }
.sm-btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
.sm-btn-secondary { background: #fff; color: #6F767E; border-color: #DCDCD8; }
.sm-btn-secondary:hover { background: #F4F4F0; color: #1A1D1F; }

@media (max-width: 700px) {
  .sm-h1 { font-size: 22px; }
  .sm-sub { font-size: 13px; }
  .sm-card { padding: 14px 14px; }
  .sm-kpis { grid-template-columns: 1fr 1fr; gap: 8px; }
  .sm-kpi { padding: 10px 12px; }
  .sm-kpi-num { font-size: 18px; }
  .sm-kpi-lab { font-size: 10px; }
  .sm-filters { flex-direction: column; gap: 8px; }
  .sm-filters .sm-input, .sm-filters .sm-select { min-width: 0; width: 100%; }
  .sm-table th, .sm-table td { padding: 10px 10px; font-size: 12.5px; }
  .sm-etu-id { font-size: 11px; }
  .sm-modal { padding: 0; align-items: flex-end; }
  .sm-modal-content {
    max-width: 100%;
    max-height: 92vh;
    border-radius: 14px 14px 0 0;
  }
  .sm-modal-body { padding: 14px 16px; }
  .sm-action-line { flex-wrap: wrap; gap: 8px; }
  .sm-action-btns { width: 100%; }
  .sm-btn-primary, .sm-btn-secondary { flex: 1; }
  .sm-acompte-trace { margin-left: 0; }
  .sm-infos { grid-template-columns: 1fr; }
}

@media (max-width: 480px) {
  .sm-kpis { grid-template-columns: 1fr 1fr; }
}

/* Workflow acompte */
.sm-acompte-line { align-items: center; gap: 10px; }
.sm-acompte-montant {
  font-family: 'Poppins', sans-serif;
  font-weight: 700;
  font-size: 14px;
  color: #1A1D1F;
  margin-left: 6px;
}
.sm-acompte-trace {
  margin-top: 6px;
  margin-left: 152px;
  font-size: 12.5px;
  color: #6F767E;
  line-height: 1.5;
}
.sm-mt8 { margin-top: 8px; }
.sm-mt12 { margin-top: 12px; }

.sm-ps-head { display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; }
.sm-ps-error { background: #FDECEE; color: #B3261E; border-radius: 10px; padding: 10px 14px; font-size: 13.5px; }

/* Pop-up confirmation certificat */
.sm-modal-small { max-width: 480px; }
.sm-confirm-text {
  font-size: 14.5px;
  color: #1A1D1F;
  line-height: 1.55;
  margin: 0 0 10px;
}
.sm-confirm-note {
  font-size: 12.5px;
  color: #6F767E;
  background: rgba(184, 137, 42, 0.06);
  border: 1px solid rgba(184, 137, 42, 0.18);
  border-radius: 8px;
  padding: 10px 12px;
  margin: 0 0 14px;
  line-height: 1.55;
}
.sm-confirm-btns { display: flex; justify-content: flex-end; gap: 10px; }

/* ── Liste mobile (remplace le tableau sur petit écran) ── */
.sm-mlist { display: none; list-style: none; margin: 0; padding: 0; }
.sm-mrow { display: flex; align-items: center; gap: 10px; padding: 12px 14px; border-bottom: 1px solid var(--hair, rgba(20,32,64,.08)); cursor: pointer; }
.sm-mrow:last-child { border-bottom: none; }
.sm-mrow:active { background: rgba(var(--pr-rgb), .07); }
.sm-mrow-main { flex: 1; min-width: 0; }
.sm-mrow-name { font-family: 'Poppins', sans-serif; font-weight: 700; font-size: 14.5px; color: var(--tx); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.sm-mrow-sub { font-size: 12.5px; color: var(--tx2, #6f767e); margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.sm-mrow-meta { display: flex; align-items: center; gap: 8px; margin-top: 5px; flex-wrap: wrap; }
.sm-mrow-chev { color: var(--tx3, #9aa2b1); flex-shrink: 0; }
.sm-mempty { padding: 24px; text-align: center; color: var(--tx3); font-size: 13.5px; }
@media (max-width: 560px) {
  .sm-table-wrap { display: none; }
  .sm-mlist { display: block; background: var(--card); border-radius: 14px; box-shadow: var(--card-shadow); overflow: hidden; }
}
</style>
