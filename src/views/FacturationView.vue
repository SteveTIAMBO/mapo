<template>
  <div class="facturation-page">
    <!-- Header -->
    <div class="page-header">
      <div class="page-header-text">
        <h1>{{ t('fact.title') }}</h1>
        <p>{{ t('fact.subtitle') }}</p>
      </div>
      <div class="header-actions">
        <ExportMenu v-if="!authStore.isTeacher && filteredEleves.length > 0" :excel="exportPayments" :pdf="exportPaymentsPdf" />
        <button v-if="factStore.setupDone" class="btn btn-outline" @click="activeTab = 'grille'">
          <Settings :size="16" />
          <span>{{ t('fact.feeGrid') }}</span>
        </button>
        <button class="btn btn-primary" @click="openPaymentModal()">
          <Plus :size="16" />
          <span>{{ t('fact.recordPayment') }}</span>
        </button>
      </div>
    </div>

    <!-- Setup wizard si pas encore configuré -->
    <div v-if="!factStore.setupDone && !factStore.loading" class="setup-section">
      <div class="card setup-card">
        <div class="setup-icon">
          <Banknote :size="48" />
        </div>
        <h2>{{ t('fact.setupTitle') }}</h2>
        <p>{{ t('fact.setupDesc') }}</p>
        <button class="btn btn-primary" @click="activeTab = 'grille'; showAddFee = true">
          <Plus :size="16" />
          <span>{{ t('fact.addFirstFee') }}</span>
        </button>
      </div>
    </div>

    <!-- Contenu principal -->
    <template v-if="factStore.setupDone || feeStructure.length > 0">
      <!-- Stats financières -->
      <div class="stat-bar" style="grid-template-columns: repeat(4, 1fr); margin-bottom: 24px;">
        <div class="stat-bar-item">
          <span class="stat-bar-dot blue"></span>
          <div>
            <div class="stat-bar-value">{{ formatMoney(displayStats.totalExpected) }}</div>
            <div class="stat-bar-label">{{ t('fact.expected') }}</div>
          </div>
        </div>
        <div class="stat-bar-item">
          <span class="stat-bar-dot green"></span>
          <div>
            <div class="stat-bar-value">{{ formatMoney(displayStats.totalCollected) }}</div>
            <div class="stat-bar-label">{{ t('fact.collected') }}</div>
          </div>
        </div>
        <div class="stat-bar-item">
          <span class="stat-bar-dot orange"></span>
          <div>
            <div class="stat-bar-value">{{ formatMoney(displayStats.totalOutstanding) }}</div>
            <div class="stat-bar-label">{{ t('fact.outstanding') }}</div>
          </div>
        </div>
        <div class="stat-bar-item">
          <span class="stat-bar-dot" :style="{ background: displayStats.collectionRate >= 70 ? 'var(--success, #34A853)' : displayStats.collectionRate >= 40 ? 'var(--gold, #F9AB00)' : 'var(--danger, #D93025)' }"></span>
          <div>
            <div class="stat-bar-value">{{ displayStats.collectionRate }}%</div>
            <div class="stat-bar-label">{{ t('fact.collectionRate') }}</div>
          </div>
        </div>
      </div>

      <!-- Bilan classe filtrée -->
      <div v-if="filterClass && activeTab === 'eleves'" class="class-summary-bar">
        <div class="class-summary-title">
          <BookOpen :size="16" />
          {{ t('fact.classSummary', { cls: filterClass }) }}
        </div>
        <div class="class-summary-stats">
          <span><strong>{{ classStats.total }}</strong> {{ t('fact.students') }}</span>
          <span class="cs-sep">|</span>
          <span class="cs-green"><strong>{{ classStats.paidCount }}</strong> {{ t('fact.paidLow') }}</span>
          <span class="cs-sep">|</span>
          <span class="cs-orange"><strong>{{ classStats.partialCount }}</strong> {{ t('fact.partialLow') }}</span>
          <span class="cs-sep">|</span>
          <span class="cs-red"><strong>{{ classStats.unpaidCount }}</strong> {{ t('fact.unpaidLow') }}</span>
          <span class="cs-sep">|</span>
          <span>{{ t('fact.expectedColon') }} <strong>{{ formatMoney(classStats.totalExpected) }}</strong></span>
          <span class="cs-sep">|</span>
          <span>{{ t('fact.collectedColon') }} <strong class="cs-green">{{ formatMoney(classStats.totalCollected) }}</strong></span>
          <span class="cs-sep">|</span>
          <span>{{ t('fact.remainingColon') }} <strong class="cs-red">{{ formatMoney(classStats.totalOutstanding) }}</strong></span>
        </div>
      </div>

      <!-- Tabs -->
      <div class="tabs-bar">
        <button class="tab-btn" :class="{ active: activeTab === 'eleves' }" @click="activeTab = 'eleves'">
          <Users :size="16" />
          <span>{{ t('fact.tabStudents') }}</span>
          <span class="tab-count">{{ stats.totalEleves }}</span>
        </button>
        <button class="tab-btn" :class="{ active: activeTab === 'historique' }" @click="activeTab = 'historique'">
          <Receipt :size="16" />
          <span>{{ t('fact.tabHistory') }}</span>
          <span class="tab-count">{{ factStore.payments.length }}</span>
        </button>
        <button class="tab-btn" :class="{ active: activeTab === 'salaires' }" @click="activeTab = 'salaires'">
          <Briefcase :size="16" />
          <span>{{ t('fact.tabSalaries') }}</span>
          <span class="tab-count">{{ personnelStore.staff.length }}</span>
        </button>
        <button class="tab-btn" :class="{ active: activeTab === 'charges' }" @click="activeTab = 'charges'">
          <DollarSign :size="16" />
          <span>{{ t('fact.tabCharges') }}</span>
          <span class="tab-count">{{ factStore.charges?.length || 0 }}</span>
        </button>
        <button class="tab-btn" :class="{ active: activeTab === 'synthese' }" @click="activeTab = 'synthese'">
          <BarChart3 :size="16" />
          <span>{{ t('fact.tabSynthesis') }}</span>
        </button>
        <button class="tab-btn" :class="{ active: activeTab === 'grille' }" @click="activeTab = 'grille'">
          <TableProperties :size="16" />
          <span>{{ t('fact.feeGrid') }}</span>
        </button>
      </div>

      <!-- Tab: Paiements par élève -->
      <div v-if="activeTab === 'eleves'">
        <!-- Filtres -->
        <div class="card" style="margin-bottom: 20px;">
          <div class="toolbar">
            <div class="search-box">
              <Search :size="18" class="search-icon" />
              <input v-model="searchQuery" type="text" class="input search-input" :placeholder="t('fact.searchPh')" />
            </div>
            <select v-model="filterClass" class="select">
              <option value="">{{ t('fact.allClasses') }}</option>
              <option v-for="c in classesStore.classes" :key="c.id" :value="c.name">{{ c.name }}</option>
            </select>
            <select v-model="filterStatus" class="select">
              <option value="">{{ t('fact.allStatuses') }}</option>
              <option value="payé">{{ t('fact.statusPaid') }}</option>
              <option value="partiel">{{ t('fact.statusPartial') }}</option>
              <option value="impayé">{{ t('fact.statusUnpaid') }}</option>
            </select>
            <button class="btn btn-primary btn-relance" @click="openRelance">
              <Sparkles :size="16" />
              <span>{{ t('fact.relanceBtn') }}</span>
            </button>
          </div>
        </div>

        <!-- Status résumé -->
        <div class="status-summary">
          <button class="status-chip" :class="{ active: filterStatus === '' }" @click="filterStatus = ''">
            {{ t('fact.all') }} ({{ displayStats.totalEleves }})
          </button>
          <button class="status-chip chip-paid" :class="{ active: filterStatus === 'payé' }" @click="filterStatus = filterStatus === 'payé' ? '' : 'payé'">
            {{ t('fact.paidPlural') }} ({{ displayStats.paidCount }})
          </button>
          <button class="status-chip chip-partial" :class="{ active: filterStatus === 'partiel' }" @click="filterStatus = filterStatus === 'partiel' ? '' : 'partiel'">
            {{ t('fact.partialPlural') }} ({{ displayStats.partialCount }})
          </button>
          <button class="status-chip chip-unpaid" :class="{ active: filterStatus === 'impayé' }" @click="filterStatus = filterStatus === 'impayé' ? '' : 'impayé'">
            {{ t('fact.unpaidPlural') }} ({{ displayStats.unpaidCount }})
          </button>
        </div>

        <!-- Tableau élèves -->
        <div class="card">
          <div v-if="filteredEleves.length === 0" class="empty-state">
            <Users :size="40" style="color: var(--tx3); margin-bottom: 12px;" />
            <p>{{ searchQuery || filterClass || filterStatus ? t('fact.noResult') : t('fact.noStudents') }}</p>
          </div>
          <div v-else class="table-wrapper">
            <table class="data-table" style="table-layout: fixed; width: 100%;">
              <colgroup>
                <col style="width: 25%;" />
                <col style="width: 15%;" />
                <col style="width: 130px;" />
                <col style="width: 130px;" />
                <col style="width: 130px;" />
                <col style="width: 12%;" />
                <col style="width: 13%;" />
              </colgroup>
              <thead>
                <tr>
                  <th class="col-eleve">{{ t('fact.thStudent') }}</th>
                  <th class="col-classe">{{ t('fact.thClass') }}</th>
                  <th class="col-montant text-right">{{ t('fact.thTotalDue') }}</th>
                  <th class="col-montant text-right">{{ t('fact.thPaid') }}</th>
                  <th class="col-montant text-right">{{ t('fact.thRemaining') }}</th>
                  <th class="col-statut">{{ t('fact.thStatus') }}</th>
                  <th class="col-actions text-center">{{ t('fact.thActions') }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in paginatedEleves" :key="row.eleve.id" class="table-row-clickable" @click="openEleveDetail(row)">
                  <td class="col-eleve">
                    <div class="eleve-cell">
                      <strong>{{ row.eleve.lastName }} {{ row.eleve.firstName }}</strong>
                      <span v-if="row.eleve.matricule" class="matricule">{{ row.eleve.matricule }}</span>
                    </div>
                  </td>
                  <td class="col-classe">{{ row.eleve.className }}</td>
                  <td class="col-montant text-right font-mono" style="white-space: nowrap;">{{ formatMoney(row.totalDue) }}</td>
                  <td class="col-montant text-right font-mono" style="white-space: nowrap;">{{ formatMoney(row.totalPaid) }}</td>
                  <td class="col-montant text-right font-mono" style="white-space: nowrap;" :class="{ 'text-danger': row.balance > 0 }">{{ formatMoney(row.balance) }}</td>
                  <td class="col-statut">
                    <span class="payment-badge" :class="'badge-' + row.status">
                      {{ statusText(row.status) }}
                    </span>
                  </td>
                  <td class="col-actions text-center" @click.stop>
                    <button class="btn btn-sm btn-primary" @click="openPaymentModal(row.eleve)">
                      <Plus :size="14" />
                      <span>{{ t('fact.pay') }}</span>
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Pagination -->
          <div v-if="filteredEleves.length > perPage" class="pagination-bar">
            <span class="pagination-info">
              {{ t('fact.paginationOf', { from: (currentPage - 1) * perPage + 1, to: Math.min(currentPage * perPage, filteredEleves.length), total: filteredEleves.length }) }}
            </span>
            <div class="pagination-btns">
              <button class="btn btn-sm btn-outline" :disabled="currentPage <= 1" @click="currentPage--">
                <ChevronLeft :size="16" />
              </button>
              <button class="btn btn-sm btn-outline" :disabled="currentPage >= totalPages" @click="currentPage++">
                <ChevronRight :size="16" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Tab: Historique des paiements -->
      <div v-if="activeTab === 'historique'">
        <div class="card">
          <div v-if="factStore.payments.length === 0" class="empty-state">
            <Receipt :size="40" style="color: var(--tx3); margin-bottom: 12px;" />
            <p>{{ t('fact.noPayment') }}</p>
          </div>
          <div v-else class="table-wrapper">
            <table class="data-table" style="table-layout: fixed; width: 100%;">
              <colgroup>
                <col style="width: 90px;" />
                <col style="width: 22%;" />
                <col style="width: 70px;" />
                <col style="width: 120px;" />
                <col style="width: 90px;" />
                <col style="width: 90px;" />
                <col style="width: 15%;" />
                <col style="width: 90px;" />
              </colgroup>
              <thead>
                <tr>
                  <th>{{ t('fact.thDate') }}</th>
                  <th>{{ t('fact.thStudent') }}</th>
                  <th>{{ t('fact.thClass') }}</th>
                  <th class="col-montant text-right">{{ t('fact.thAmount') }}</th>
                  <th>{{ t('fact.thMethod') }}</th>
                  <th>{{ t('fact.thReference') }}</th>
                  <th>{{ t('fact.thRecordedBy') }}</th>
                  <th class="text-center">{{ t('fact.thActions') }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="pay in paginatedPayments" :key="pay.id" class="row-clickable" @click="openPaymentDetail(pay)">
                  <td style="white-space: nowrap;">{{ formatDate(pay.date) }}</td>
                  <td>
                    <strong>{{ getEleveName(pay.eleveId) }}</strong>
                  </td>
                  <td>{{ getEleveClass(pay.eleveId) }}</td>
                  <td class="col-montant text-right font-mono font-semibold" style="white-space: nowrap;">{{ formatMoney(pay.amount) }}</td>
                  <td>
                    <span class="method-badge">{{ getMethodLabel(pay.method) }}</span>
                  </td>
                  <td class="text-muted" style="white-space: nowrap;">{{ pay.reference || '—' }}</td>
                  <td style="white-space: nowrap; font-size: 12px; color: var(--tx2);">{{ pay.recordedBy || '—' }}</td>
                  <td class="text-center">
                    <div class="action-btns">
                      <button class="btn btn-sm btn-outline" :title="t('fact.printReceipt')" @click.stop="printReceipt(pay)">
                        <Printer :size="14" />
                      </button>
                      <button class="btn btn-sm btn-outline btn-danger" :title="t('fact.delete')" @click.stop="confirmDeletePayment(pay.id)">
                        <Trash2 :size="14" />
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <!-- Pagination historique -->
          <div v-if="factStore.payments.length > payPerPage" class="pagination-bar">
            <span class="pagination-info">
              {{ t('fact.paginationOf', { from: (payPage - 1) * payPerPage + 1, to: Math.min(payPage * payPerPage, factStore.payments.length), total: factStore.payments.length }) }}
            </span>
            <div class="pagination-btns">
              <button class="btn btn-sm btn-outline" :disabled="payPage <= 1" @click="payPage--">
                <ChevronLeft :size="16" />
              </button>
              <button class="btn btn-sm btn-outline" :disabled="payPage >= totalPayPages" @click="payPage++">
                <ChevronRight :size="16" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Tab: Salaires du personnel -->
      <div v-if="activeTab === 'salaires'">
        <div class="card" style="margin-bottom: 20px;">
          <div class="toolbar">
            <div class="search-box">
              <Search :size="18" class="search-icon" />
              <input v-model="salarySearch" type="text" class="input search-input" :placeholder="t('fact.salarySearchPh')" />
            </div>
            <select v-model="salaryMonth" class="select">
              <option v-for="m in monthOptions" :key="m.value" :value="m.value">{{ m.label }}</option>
            </select>
          </div>
        </div>

        <!-- Résumé masse salariale -->
        <div class="salary-summary-bar">
          <div class="salary-summary-item">
            <span class="salary-summary-label">{{ t('fact.payrollMonthly') }}</span>
            <span class="salary-summary-value">{{ formatMoney(salaryStats.totalMensuel) }}</span>
          </div>
          <div class="salary-summary-item">
            <span class="salary-summary-label">{{ t('fact.paidThisMonth') }}</span>
            <span class="salary-summary-value cs-green">{{ salaryStats.paidCount }} / {{ salaryStats.total }}</span>
          </div>
          <div class="salary-summary-item">
            <span class="salary-summary-label">{{ t('fact.totalPaidLabel') }}</span>
            <span class="salary-summary-value cs-green">{{ formatMoney(salaryStats.totalPaid) }}</span>
          </div>
          <div class="salary-summary-item">
            <span class="salary-summary-label">{{ t('fact.toPay') }}</span>
            <span class="salary-summary-value cs-red">{{ formatMoney(salaryStats.totalRemaining) }}</span>
          </div>
        </div>

        <div class="card">
          <div v-if="filteredStaff.length === 0" class="empty-state">
            <Briefcase :size="40" style="color: var(--tx3); margin-bottom: 12px;" />
            <p>{{ t('fact.noStaff') }}</p>
          </div>
          <div v-else class="table-wrapper">
            <table class="data-table" style="table-layout: fixed; width: 100%;">
              <colgroup>
                <col style="width: 30%;" />
                <col style="width: 120px;" />
                <col style="width: 130px;" />
                <col style="width: 130px;" />
                <col style="width: 130px;" />
                <col style="width: 12%;" />
                <col style="width: 13%;" />
              </colgroup>
              <thead>
                <tr>
                  <th class="col-eleve">{{ t('fact.thName') }}</th>
                  <th style="width:120px">{{ t('fact.thFunction') }}</th>
                  <th class="col-montant text-right">{{ t('fact.thGrossSalary') }}</th>
                  <th class="col-montant text-right">{{ t('fact.thPaidOut') }}</th>
                  <th class="col-montant text-right">{{ t('fact.thRemaining') }}</th>
                  <th class="col-statut">{{ t('fact.thStatus') }}</th>
                  <th class="col-actions text-center">{{ t('fact.thActions') }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in filteredStaff" :key="row.staff.id" class="table-row-clickable" @click="openBulletinModal(row)">
                  <td class="col-eleve">
                    <strong>{{ row.staff.lastName }} {{ row.staff.firstName }}</strong>
                  </td>
                  <td>{{ row.staff.role || '—' }}</td>
                  <td class="col-montant text-right font-mono" style="white-space: nowrap;">{{ formatMoney(row.salary) }}</td>
                  <td class="col-montant text-right font-mono cs-green" style="white-space: nowrap;">{{ formatMoney(row.paid) }}</td>
                  <td class="col-montant text-right font-mono" style="white-space: nowrap;" :class="{ 'cs-red': row.remaining > 0 }">{{ formatMoney(row.remaining) }}</td>
                  <td class="col-statut">
                    <span class="payment-badge" :class="row.paid >= row.salary ? 'badge-payé' : row.paid > 0 ? 'badge-partiel' : 'badge-impayé'">
                      {{ row.paid >= row.salary ? t('fact.statusPaid') : row.paid > 0 ? t('fact.statusPartial') : t('fact.notPaid') }}
                    </span>
                  </td>
                  <td class="col-actions text-center" @click.stop>
                    <button class="btn btn-sm btn-primary" @click="openSalaryPayModal(row)">
                      <Plus :size="14" />
                      <span>{{ t('fact.pay') }}</span>
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Tab: Charges fixes -->
      <div v-if="activeTab === 'charges'">
        <div class="card">
          <div class="card-header">
            <h3>{{ t('fact.tabCharges') }}</h3>
            <button class="btn btn-sm btn-primary" @click="showAddCharge = true">
              <Plus :size="14" />
              <span>{{ t('fact.addCharge') }}</span>
            </button>
          </div>

          <!-- Résumé charges -->
          <div class="charges-summary-bar">
            <div class="charges-summary-item">
              <span class="charges-summary-label">{{ t('fact.totalMonthly') }}</span>
              <span class="charges-summary-value">{{ formatMoney(chargeStats.totalMensuel) }}</span>
            </div>
            <div class="charges-summary-item">
              <span class="charges-summary-label">{{ t('fact.totalQuarterly') }}</span>
              <span class="charges-summary-value">{{ formatMoney(chargeStats.totalTrimestriel) }}</span>
            </div>
            <div class="charges-summary-item">
              <span class="charges-summary-label">{{ t('fact.totalAnnual') }}</span>
              <span class="charges-summary-value">{{ formatMoney(chargeStats.totalAnnuel) }}</span>
            </div>
          </div>

          <div v-if="factStore.charges?.length === 0" class="empty-state" style="padding: 24px;">
            <p>{{ t('fact.noCharge') }}</p>
          </div>

          <div v-else class="table-wrapper">
            <table class="data-table" style="table-layout: fixed; width: 100%;">
              <colgroup>
                <col style="width: 25%;" />
                <col style="width: 20%;" />
                <col style="width: 130px;" />
                <col style="width: 120px;" />
                <col style="width: 13%;" />
              </colgroup>
              <thead>
                <tr>
                  <th>{{ t('fact.thLabel') }}</th>
                  <th>{{ t('fact.thCategory') }}</th>
                  <th class="col-montant text-right">{{ t('fact.thAmount') }}</th>
                  <th>{{ t('fact.thFrequency') }}</th>
                  <th class="text-center" style="width:90px">{{ t('fact.thActions') }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="chg in factStore.charges" :key="chg.id" class="row-clickable" @click="editCharge(chg)">
                  <td><strong>{{ chg.label }}</strong></td>
                  <td>{{ getChargeCategory(chg.category) }}</td>
                  <td class="col-montant text-right font-mono font-semibold" style="white-space: nowrap;">{{ formatMoney(chg.amount) }}</td>
                  <td>{{ getFrequencyLabel(chg.frequency) }}</td>
                  <td class="text-center">
                    <div class="action-btns">
                      <button class="btn btn-sm btn-outline" @click.stop="editCharge(chg)">
                        <Pencil :size="14" />
                      </button>
                      <button class="btn btn-sm btn-outline btn-danger" @click.stop="confirmDeleteCharge(chg.id)">
                        <Trash2 :size="14" />
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Résumé par catégorie -->
          <div v-if="factStore.charges?.length > 0" class="category-summary">
            <h4>{{ t('fact.detailByCategory') }}</h4>
            <div class="category-grid">
              <div v-for="cat in chargesByCategory" :key="cat.category" class="category-card">
                <div class="category-name">{{ cat.categoryLabel }}</div>
                <div class="category-total">{{ formatMoney(cat.totalMensuel) }}{{ t('fact.perMonth') }}</div>
                <div class="category-detail">{{ t('fact.chargeCount', { n: cat.count }) }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Tab: Synthèse financière -->
      <div v-if="activeTab === 'synthese'">
        <div class="card">
          <div class="card-header">
            <h3>{{ t('fact.synthesisTitle') }}</h3>
          </div>

          <div class="synthesis-section">
            <h4>{{ t('fact.revenues') }}</h4>
            <div class="synthesis-grid">
              <div class="synthesis-item">
                <span class="synthesis-label">{{ t('fact.tuitionCollected') }}</span>
                <span class="synthesis-value green">{{ formatMoney(synthesis.recettesScolarite) }}</span>
              </div>
              <div class="synthesis-item">
                <span class="synthesis-label">{{ t('fact.expectedRevenue') }}</span>
                <span class="synthesis-value blue">{{ formatMoney(synthesis.recettesPrevisionnelles) }}</span>
              </div>
            </div>
          </div>

          <div class="synthesis-section">
            <h4>{{ t('fact.expenseSalaries') }}</h4>
            <div class="synthesis-grid synthesis-grid-3">
              <div class="synthesis-item">
                <span class="synthesis-label">{{ t('fact.payrollMonthly') }}</span>
                <span class="synthesis-value">{{ formatMoney(synthesis.masseSalarialeMensuelle) }}</span>
              </div>
              <div class="synthesis-item">
                <span class="synthesis-label">{{ t('fact.payrollAnnual') }}</span>
                <span class="synthesis-value">{{ formatMoney(synthesis.masseSalarialeAnnuelle) }}</span>
              </div>
              <div class="synthesis-item">
                <span class="synthesis-label">{{ t('fact.salariesPaidToDate') }}</span>
                <span class="synthesis-value">{{ formatMoney(synthesis.totalSalairesVerses) }}</span>
              </div>
            </div>
          </div>

          <div class="synthesis-section">
            <h4>{{ t('fact.expenseCharges') }}</h4>
            <div class="synthesis-grid">
              <div class="synthesis-item">
                <span class="synthesis-label">{{ t('fact.chargesMonthly') }}</span>
                <span class="synthesis-value">{{ formatMoney(synthesis.chargesFixesMensuelles) }}</span>
              </div>
              <div class="synthesis-item">
                <span class="synthesis-label">{{ t('fact.totalChargesAnnual') }}</span>
                <span class="synthesis-value">{{ formatMoney(synthesis.totalChargesFixesAnnuel) }}</span>
              </div>
            </div>
          </div>

          <div class="synthesis-section">
            <h4>{{ t('fact.balance') }}</h4>
            <div class="synthesis-balance">
              <div class="balance-item" :class="{ positive: synthesis.resultatActuel >= 0, negative: synthesis.resultatActuel < 0 }">
                <span class="balance-label">{{ t('fact.currentResult') }}</span>
                <span class="balance-value">{{ formatMoney(synthesis.resultatActuel) }}</span>
              </div>
              <div class="balance-item" :class="{ positive: synthesis.resultatPrevisionnel >= 0, negative: synthesis.resultatPrevisionnel < 0 }">
                <span class="balance-label">{{ t('fact.forecastResult') }}</span>
                <span class="balance-value">{{ formatMoney(synthesis.resultatPrevisionnel) }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Tab: Grille tarifaire -->
      <div v-if="activeTab === 'grille'">
        <div class="card">
          <div class="card-header">
            <h3>{{ t('fact.gridTitle') }}</h3>
            <div class="card-header-actions">
              <button class="btn btn-sm btn-outline" @click="toggleEcheances">
                <Calendar :size="14" />
                <span>{{ showEcheances ? t('fact.hideSchedule') : t('fact.manageSchedule') }}</span>
              </button>
              <button class="btn btn-sm btn-primary" @click="showAddFee = true">
                <Plus :size="14" />
                <span>{{ t('fact.addFee') }}</span>
              </button>
            </div>
          </div>

          <div v-if="feeStructure.length === 0" class="empty-state">
            <TableProperties :size="40" style="color: var(--tx3); margin-bottom: 12px;" />
            <p>{{ t('fact.noFee') }}</p>
            <button class="btn btn-sm btn-outline" style="margin-top: 12px;" @click="showAddFee = true">
              {{ t('fact.addFirstFee') }}
            </button>
          </div>

          <div v-else class="table-wrapper">
            <table class="data-table" style="table-layout: fixed; width: 100%;">
              <colgroup>
                <col style="width: 20%;" />
                <col style="width: 25%;" />
                <col style="width: 20%;" />
                <col style="width: 130px;" />
                <col style="width: 13%;" />
              </colgroup>
              <thead>
                <tr>
                  <th>{{ t('fact.thFeeType') }}</th>
                  <th>{{ t('fact.thLabel') }}</th>
                  <th>{{ t('fact.thLevel') }}</th>
                  <th class="col-montant text-right">{{ t('fact.thAmount') }}</th>
                  <th class="text-center" style="width:90px">{{ t('fact.thActions') }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="fee in sortedFees" :key="fee.id">
                  <td>
                    <span class="fee-type-badge">{{ getFeeTypeLabel(fee.feeType) }}</span>
                  </td>
                  <td>{{ fee.label }}</td>
                  <td>{{ fee.level === 'all' ? t('fact.allLevels') : fee.level }}</td>
                  <td class="col-montant text-right font-mono font-semibold" style="white-space: nowrap;">{{ formatMoney(fee.amount) }}</td>
                  <td class="text-center">
                    <div class="action-btns">
                      <button class="btn btn-sm btn-outline" @click="editFee(fee)">
                        <Pencil :size="14" />
                      </button>
                      <button class="btn btn-sm btn-outline btn-danger" @click="confirmDeleteFee(fee.id)">
                        <Trash2 :size="14" />
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Résumé par niveau -->
          <div v-if="feeStructure.length > 0" class="level-summary">
            <h4>{{ t('fact.summaryByLevel') }}</h4>
            <div class="level-grid">
              <div v-for="lvl in levelTotals" :key="lvl.level" class="level-card">
                <div class="level-name">{{ lvl.level }}</div>
                <div class="level-total">{{ formatMoney(lvl.total) }}</div>
                <div class="level-detail">{{ t('fact.feeCount', { n: lvl.count }) }}</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Section échéances -->
        <div v-if="showEcheances" ref="echeancesSection" class="card" style="margin-top: 20px;">
          <div class="card-header">
            <h3>{{ t('fact.scheduleTitle') }}</h3>
            <button class="btn btn-sm btn-primary" @click="editingEcheanceId = null; echeanceForm = { label: '', dueDate: '', percent: null, level: 'all' }; showAddEcheance = true">
              <Plus :size="14" />
              <span>{{ t('fact.addSchedule') }}</span>
            </button>
          </div>
          <div v-if="factStore.echeances.length === 0" class="empty-state" style="padding: 24px;">
            <p>{{ t('fact.noSchedule') }}</p>
            <p style="font-size: 13px; color: var(--tx3); margin-top: 4px;">
              {{ t('fact.scheduleHint') }}
            </p>
          </div>
          <div v-else class="table-wrapper">
            <table class="data-table" style="table-layout: fixed; width: 100%;">
              <colgroup>
                <col style="width: 25%;" />
                <col style="width: 20%;" />
                <col style="width: 20%;" />
                <col style="width: 100px;" />
                <col style="width: 90px;" />
              </colgroup>
              <thead>
                <tr>
                  <th>{{ t('fact.thLabel') }}</th>
                  <th>{{ t('fact.thLevel') }}</th>
                  <th>{{ t('fact.thDueDate') }}</th>
                  <th class="col-montant text-right">%</th>
                  <th class="text-center">{{ t('fact.thActions') }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="ech in factStore.echeances" :key="ech.id">
                  <td><strong>{{ ech.label }}</strong></td>
                  <td>{{ ech.level === 'all' || !ech.level ? t('fact.allLevels') : ech.level }}</td>
                  <td style="white-space: nowrap;">{{ formatDate(ech.dueDate) }}</td>
                  <td class="col-montant text-right font-mono font-semibold" style="white-space: nowrap;">{{ ech.percent }}%</td>
                  <td class="text-center">
                    <div class="action-btns">
                      <button class="btn btn-sm btn-outline" @click="editEcheance(ech)">
                        <Pencil :size="14" />
                      </button>
                      <button class="btn btn-sm btn-outline btn-danger" @click="factStore.deleteEcheance(ech.id)">
                        <Trash2 :size="14" />
                      </button>
                    </div>
                  </td>
                </tr>
                <tr class="total-row">
                  <td><strong>{{ t('fact.total') }}</strong></td>
                  <td></td>
                  <td></td>
                  <td class="col-montant text-right font-mono font-semibold" :class="{ 'text-danger': echeanceTotalPercent !== 100 }" style="white-space: nowrap;">
                    {{ echeanceTotalPercent }}%
                  </td>
                  <td></td>
                </tr>
              </tbody>
            </table>
          </div>
          <div v-if="echeanceTotalPercent !== 100 && factStore.echeances.length > 0" class="echeance-warning">
            {{ t('fact.scheduleWarn', { pct: echeanceTotalPercent }) }}
          </div>
        </div>

        <div v-if="feeStructure.length > 0 && !factStore.setupDone" class="setup-confirm">
          <button class="btn btn-primary btn-lg" @click="factStore.completeSetup()">
            <CheckCircle2 :size="18" />
            <span>{{ t('fact.validateGrid') }}</span>
          </button>
        </div>
      </div>
    </template>

    <!-- Modal: Enregistrer un paiement -->
    <div v-if="showPaymentModal" class="modal-overlay" @click.self="showPaymentModal = false">
      <div class="modal-card card">
        <div class="modal-header">
          <h2>{{ t('fact.recordPayment') }}</h2>
          <button class="icon-btn" @click="showPaymentModal = false" type="button"><X :size="20" /></button>
        </div>
        <div class="modal-body">
          <div v-if="payTarget" class="pay-eleve-info">
            <div class="pay-info-row">
              <span>{{ t('fact.infoStudent') }}</span>
              <strong>{{ payTarget.lastName }} {{ payTarget.firstName }}</strong>
            </div>
            <div class="pay-info-row">
              <span>{{ t('fact.infoClass') }}</span>
              <strong>{{ payTarget.className }}</strong>
            </div>
            <div class="pay-info-row">
              <span>{{ t('fact.infoTotalDue') }}</span>
              <strong>{{ formatMoney(payTargetTotal) }}</strong>
            </div>
            <div class="pay-info-row pay-info-highlight">
              <span>{{ t('fact.infoToPay') }}</span>
              <strong>{{ formatMoney(payTargetBalance) }}</strong>
            </div>
          </div>
          <div class="field-row">
            <div class="field">
              <label>{{ t('fact.paymentType') }}</label>
              <select v-model="payForm.tranche" class="input">
                <option value="">{{ t('fact.chooseDash') }}</option>
                <option v-for="ech in factStore.echeances" :key="ech.id" :value="ech.label">
                  {{ ech.label }} ({{ ech.percent }}%)
                </option>
                <option value="Paiement intégral">{{ t('fact.fullPayment') }}</option>
                <option value="Autre">{{ t('fact.other') }}</option>
              </select>
            </div>
            <div class="field">
              <label>{{ t('fact.amountXAF') }}</label>
              <input v-model.number="payForm.amount" type="number" class="input" placeholder="0" min="0" />
            </div>
          </div>
          <div class="field-row">
            <div class="field">
              <label>{{ t('fact.paymentMethod') }}</label>
              <select v-model="payForm.method" class="input">
                <option v-for="m in PAYMENT_METHODS" :key="m.value" :value="m.value">{{ m.label }}</option>
              </select>
            </div>
            <div class="field">
              <label>{{ t('fact.dateLabel') }}</label>
              <input v-model="payForm.date" type="date" class="input" />
            </div>
          </div>
          <div class="field">
            <label>{{ t('fact.notesLabel') }}</label>
            <textarea v-model="payForm.note" class="input" :placeholder="t('fact.notesPh')" style="resize: vertical; min-height: 80px;"></textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" @click="showPaymentModal = false">{{ t('fact.cancel') }}</button>
          <button class="btn btn-primary" :disabled="!canSubmitPayment" @click="submitPayment">
            <CheckCircle2 :size="16" />
            <span>{{ t('fact.save') }}</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Modal: Ajouter/Modifier tarif -->
    <div v-if="showAddFee" class="modal-overlay" @click.self="showAddFee = false">
      <div class="modal-card card" style="max-width: 520px;">
        <div class="modal-header">
          <h2>{{ editingFeeId ? t('fact.editFee') : t('fact.addFee') }}</h2>
          <button class="icon-btn" @click="closeFeeMod()" type="button"><X :size="20" /></button>
        </div>
        <div class="modal-body">
          <div class="field">
            <label>{{ t('fact.thFeeType') }}</label>
            <select v-model="feeForm.feeType" class="input">
              <option v-for="ft in FEE_TYPES" :key="ft.value" :value="ft.value">{{ ft.label }}</option>
            </select>
          </div>
          <div class="field">
            <label>{{ t('fact.thLabel') }}</label>
            <input v-model="feeForm.label" type="text" class="input" :placeholder="t('fact.feeLabelPh')" />
          </div>
          <div class="field-row">
            <div class="field">
              <label>{{ t('fact.thLevel') }}</label>
              <select v-model="feeForm.level" class="input">
                <option value="all">{{ t('fact.allLevels') }}</option>
                <option v-for="lvl in availableLevels" :key="lvl" :value="lvl">{{ lvl }}</option>
              </select>
            </div>
            <div class="field">
              <label>{{ t('fact.amountXAF') }}</label>
              <input v-model.number="feeForm.amount" type="number" class="input" placeholder="0" min="0" />
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" @click="closeFeeMod()">{{ t('fact.cancel') }}</button>
          <button class="btn btn-primary" :disabled="!canSubmitFee" @click="submitFee">
            <CheckCircle2 :size="16" />
            <span>{{ editingFeeId ? t('fact.modify') : t('fact.add') }}</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Modal: Ajouter échéance -->
    <div v-if="showAddEcheance" class="modal-overlay" @click.self="showAddEcheance = false">
      <div class="modal-card card" style="max-width: 440px;">
        <div class="modal-header">
          <h2>{{ editingEcheanceId ? t('fact.editScheduleTitle') : t('fact.addScheduleTitle') }}</h2>
          <button class="icon-btn" @click="showAddEcheance = false" type="button"><X :size="20" /></button>
        </div>
        <div class="modal-body">
          <div class="field">
            <label>{{ t('fact.thLabel') }}</label>
            <input v-model="echeanceForm.label" class="input" :placeholder="t('fact.scheduleLabelPh')" />
          </div>
          <div class="field">
            <label>{{ t('fact.concernedLevel') }}</label>
            <select v-model="echeanceForm.level" class="input">
              <option value="all">{{ t('fact.allLevels') }}</option>
              <option v-for="lvl in availableLevels" :key="lvl" :value="lvl">{{ lvl }}</option>
            </select>
          </div>
          <div class="field-row">
            <div class="field">
              <label>{{ t('fact.thDueDate') }}</label>
              <input v-model="echeanceForm.dueDate" type="date" class="input" />
            </div>
            <div class="field">
              <label>{{ t('fact.percentOfTotal') }}</label>
              <input v-model.number="echeanceForm.percent" type="number" class="input" placeholder="30" min="1" max="100" />
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" @click="showAddEcheance = false">{{ t('fact.cancel') }}</button>
          <button class="btn btn-primary" :disabled="!echeanceForm.label || !echeanceForm.dueDate || !echeanceForm.percent" @click="submitEcheance">
            <CheckCircle2 :size="16" />
            <span>{{ editingEcheanceId ? t('fact.save') : t('fact.add') }}</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Modal: Payer salaire -->
    <div v-if="showSalaryModal" class="modal-overlay" @click.self="showSalaryModal = false">
      <div class="modal-card card">
        <div class="modal-header">
          <h2>{{ t('fact.paySalary') }}</h2>
          <button class="icon-btn" @click="showSalaryModal = false" type="button"><X :size="20" /></button>
        </div>
        <div class="modal-body">
          <div v-if="salaryPayTarget" class="pay-eleve-info">
            <div class="pay-info-row">
              <span>{{ t('fact.infoStaff') }}</span>
              <strong>{{ salaryPayTarget.staff.lastName }} {{ salaryPayTarget.staff.firstName }}</strong>
            </div>
            <div class="pay-info-row">
              <span>{{ t('fact.infoFunction') }}</span>
              <strong>{{ salaryPayTarget.staff.role || '—' }}</strong>
            </div>
            <div class="pay-info-row">
              <span>{{ t('fact.infoGrossSalary') }}</span>
              <strong>{{ formatMoney(salaryPayTarget.salary) }}</strong>
            </div>
            <div class="pay-info-row pay-info-highlight">
              <span>{{ t('fact.infoToPayOut') }}</span>
              <strong>{{ formatMoney(salaryPayTarget.remaining) }}</strong>
            </div>
          </div>
          <div class="field-row">
            <div class="field">
              <label>{{ t('fact.amountXAF') }}</label>
              <input v-model.number="salaryPayForm.amount" type="number" class="input" placeholder="0" min="0" />
            </div>
            <div class="field">
              <label>{{ t('fact.paymentMethod') }}</label>
              <select v-model="salaryPayForm.method" class="input">
                <option v-for="m in PAYMENT_METHODS" :key="m.value" :value="m.value">{{ m.label }}</option>
              </select>
            </div>
          </div>
          <div class="field-row">
            <div class="field">
              <label>{{ t('fact.thReference') }}</label>
              <input v-model="salaryPayForm.reference" class="input" placeholder="SAL-00001" />
            </div>
            <div class="field">
              <label>{{ t('fact.dateLabel') }}</label>
              <input v-model="salaryPayForm.date" type="date" class="input" />
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" @click="showSalaryModal = false">{{ t('fact.cancel') }}</button>
          <button class="btn btn-primary" :disabled="!salaryPayForm.amount || salaryPayForm.amount <= 0" @click="submitSalaryPayment">
            <CheckCircle2 :size="16" />
            <span>{{ t('fact.pay') }}</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Modal: Bulletin de paie -->
    <div v-if="showBulletinModal && currentBulletin" class="modal-overlay" @click.self="showBulletinModal = false">
      <div class="modal-card card" style="max-width: 600px;">
        <div class="modal-header">
          <h2>{{ t('fact.payslip') }}</h2>
          <div class="modal-header-actions">
            <button class="icon-btn" @click="printBulletin" :title="t('fact.printLabel')" type="button"><Printer :size="20" /></button>
            <button class="icon-btn" @click="showBulletinModal = false" type="button"><X :size="20" /></button>
          </div>
        </div>
        <div class="modal-body" ref="bulletinRef">
          <div class="bulletin-container">
            <div class="bulletin-header">
              <h3>{{ currentBulletin.staff.lastName }} {{ currentBulletin.staff.firstName }}</h3>
              <p>{{ currentBulletin.staff.role }}</p>
            </div>
            <div class="bulletin-info">
              <div class="bulletin-row">
                <span class="bulletin-label">{{ t('fact.periodColon') }}</span>
                <span class="bulletin-value">{{ bulletinMonth }}</span>
              </div>
              <div class="bulletin-row">
                <span class="bulletin-label">{{ t('fact.referenceColon') }}</span>
                <span class="bulletin-value">BP-{{ currentBulletin.staff.id }}-{{ bulletinMonthShort }}</span>
              </div>
              <div class="bulletin-row">
                <span class="bulletin-label">{{ t('fact.dateColon') }}</span>
                <span class="bulletin-value">{{ formatDate(new Date().toISOString().split('T')[0]) }}</span>
              </div>
            </div>
            <div class="bulletin-salary">
              <div class="bulletin-salary-item">
                <span>{{ t('fact.grossMonthlySalary') }}</span>
                <span class="bulletin-value-large">{{ formatMoney(currentBulletin.salary) }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal: Ajouter/Modifier charge -->
    <div v-if="showAddCharge" class="modal-overlay" @click.self="showAddCharge = false">
      <div class="modal-card card" style="max-width: 520px;">
        <div class="modal-header">
          <h2>{{ editingChargeId ? t('fact.editCharge') : t('fact.addChargeFixed') }}</h2>
          <button class="icon-btn" @click="closeChargeModal()" type="button"><X :size="20" /></button>
        </div>
        <div class="modal-body">
          <div class="field">
            <label>{{ t('fact.thLabel') }}</label>
            <input v-model="chargeForm.label" type="text" class="input" :placeholder="t('fact.chargeLabelPh')" />
          </div>
          <div class="field">
            <label>{{ t('fact.thCategory') }}</label>
            <select v-model="chargeForm.category" class="input">
              <option v-for="cat in CHARGE_CATEGORIES" :key="cat.value" :value="cat.value">{{ cat.label }}</option>
            </select>
          </div>
          <div class="field-row">
            <div class="field">
              <label>{{ t('fact.amountXAF') }}</label>
              <input v-model.number="chargeForm.amount" type="number" class="input" placeholder="0" min="0" />
            </div>
            <div class="field">
              <label>{{ t('fact.thFrequency') }}</label>
              <select v-model="chargeForm.frequency" class="input">
                <option value="mensuel">{{ t('fact.freqMonthly') }}</option>
                <option value="trimestriel">{{ t('fact.freqQuarterly') }}</option>
                <option value="annuel">{{ t('fact.freqAnnual') }}</option>
              </select>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" @click="closeChargeModal()">{{ t('fact.cancel') }}</button>
          <button class="btn btn-primary" :disabled="!canSubmitCharge" @click="submitCharge">
            <CheckCircle2 :size="16" />
            <span>{{ editingChargeId ? t('fact.modify') : t('fact.add') }}</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Modal: Confirmation suppression -->
    <div v-if="confirmDeleteId" class="modal-overlay" @click.self="confirmDeleteId = null">
      <div class="modal-card card" style="max-width: 400px;">
        <div class="modal-header">
          <h2>{{ t('fact.confirmDeleteTitle') }}</h2>
          <button class="icon-btn" @click="confirmDeleteId = null" type="button"><X :size="20" /></button>
        </div>
        <div class="modal-body">
          <p>{{ t('fact.confirmDeleteText') }}</p>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" @click="confirmDeleteId = null">{{ t('fact.cancel') }}</button>
          <button class="btn btn-danger" @click="confirmDelete">{{ t('fact.delete') }}</button>
        </div>
      </div>
    </div>

    <!-- Modal détail générique -->
    <div v-if="showDetailModal && detailData" class="modal-overlay" @click.self="showDetailModal = false">
      <div class="modal-card card" style="max-width: 520px;">
        <div class="modal-header">
          <h2>{{ detailType === 'eleve' ? t('fact.detailStudent') : t('fact.detailPayment') }}</h2>
          <button class="icon-btn" @click="showDetailModal = false" type="button"><X :size="20" /></button>
        </div>
        <div class="modal-body">
          <!-- Détail élève -->
          <template v-if="detailType === 'eleve'">
            <div class="detail-section">
              <h4 class="detail-title">{{ detailData.eleve.lastName }} {{ detailData.eleve.firstName }}</h4>
              <p class="detail-subtitle">{{ detailData.eleve.className }} &mdash; {{ detailData.eleve.matricule }}</p>
            </div>
            <div class="detail-grid">
              <div class="detail-item">
                <span class="detail-label">{{ t('fact.thTotalDue') }}</span>
                <span class="detail-value font-mono">{{ formatMoney(detailData.totalDue) }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">{{ t('fact.totalPaidDetail') }}</span>
                <span class="detail-value font-mono cs-green">{{ formatMoney(detailData.totalPaid) }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">{{ t('fact.toPayDetail') }}</span>
                <span class="detail-value font-mono" :class="{ 'cs-red': detailData.balance > 0 }">{{ formatMoney(detailData.balance) }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">{{ t('fact.thStatus') }}</span>
                <span class="status-chip" :class="'chip-' + detailData.status">{{ statusText(detailData.status) }}</span>
              </div>
            </div>
            <div v-if="detailData.payments && detailData.payments.length > 0" class="detail-section" style="margin-top: 16px;">
              <h4 class="detail-section-title">{{ t('fact.paymentHistory') }}</h4>
              <div v-for="p in detailData.payments" :key="p.id" class="detail-payment-row">
                <span>{{ formatDate(p.date) }}</span>
                <span class="font-mono">{{ formatMoney(p.amount) }}</span>
                <span class="method-badge" style="font-size: 11px;">{{ getMethodLabel(p.method) }}</span>
              </div>
            </div>
          </template>

          <!-- Détail paiement historique -->
          <template v-if="detailType === 'payment'">
            <div class="detail-section">
              <h4 class="detail-title">{{ getEleveName(detailData.eleveId) }}</h4>
              <p class="detail-subtitle">{{ getEleveClass(detailData.eleveId) }} &mdash; {{ formatDate(detailData.date) }}</p>
            </div>
            <div class="detail-grid">
              <div class="detail-item">
                <span class="detail-label">{{ t('fact.thAmount') }}</span>
                <span class="detail-value font-mono">{{ formatMoney(detailData.amount) }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">{{ t('fact.paymentMethod') }}</span>
                <span class="detail-value">{{ getMethodLabel(detailData.method) }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">{{ t('fact.thReference') }}</span>
                <span class="detail-value">{{ detailData.reference || '—' }}</span>
              </div>
              <div v-if="detailData.tranche" class="detail-item">
                <span class="detail-label">{{ t('fact.paymentType') }}</span>
                <span class="detail-value">{{ detailData.tranche }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">{{ t('fact.thRecordedBy') }}</span>
                <span class="detail-value">{{ detailData.recordedBy || '—' }}</span>
              </div>
              <div v-if="detailData.note" class="detail-item" style="grid-column: 1 / -1;">
                <span class="detail-label">{{ t('fact.noteLabel') }}</span>
                <span class="detail-value">{{ detailData.note }}</span>
              </div>
            </div>
          </template>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" @click="showDetailModal = false">{{ t('fact.close') }}</button>
          <button v-if="detailType === 'payment'" class="btn btn-outline" @click="showDetailModal = false; printReceipt(detailData)">
            <Printer :size="14" /> <span>{{ t('fact.printReceipt') }}</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Relances impayés (MIAPO) — supervisées -->
    <div v-if="showRelance" class="modal-overlay" @click.self="closeRelance">
      <div class="modal-card card relance-modal">
        <div class="modal-header">
          <div class="relance-head">
            <span class="relance-spark"><Sparkles :size="18" /></span>
            <div>
              <h2>{{ t('fact.relanceTitle') }}</h2>
              <p class="relance-sub">{{ t('fact.relanceGuard') }}</p>
            </div>
          </div>
          <button class="icon-btn" @click="closeRelance"><X :size="20" /></button>
        </div>

        <!-- Résultat d'envoi -->
        <div v-if="relanceResult" class="modal-body">
          <div class="relance-done">
            <CheckCircle2 :size="42" style="color: var(--success);" />
            <p class="relance-done-title">{{ t('fact.relanceSentTitle', { n: relanceResult.total }) }}</p>
            <p class="relance-done-text">{{ t('fact.relanceSentDetail', { sent: relanceResult.sent, sim: relanceResult.simulated, fail: relanceResult.failed }) }}</p>
          </div>
          <div class="modal-actions">
            <button class="btn btn-primary" @click="closeRelance">{{ t('fact.close') }}</button>
          </div>
        </div>

        <!-- Composition -->
        <div v-else class="modal-body">
          <div v-if="relanceCandidates.length === 0" class="empty-state">
            <CheckCircle2 :size="40" style="color: var(--success); margin-bottom: 12px;" />
            <p>{{ t('fact.relanceNone') }}</p>
          </div>
          <template v-else>
            <div class="relance-row">
              <span class="relance-label">{{ t('fact.relanceChannel') }}</span>
              <div class="relance-seg">
                <button type="button" :class="{ active: relanceChannel === 'whatsapp' }" @click="relanceChannel = 'whatsapp'">WhatsApp</button>
                <button type="button" :class="{ active: relanceChannel === 'sms' }" @click="relanceChannel = 'sms'">SMS</button>
              </div>
            </div>

            <label class="relance-field">
              <span>{{ t('fact.relanceMessage') }}</span>
              <textarea v-model="relanceMessage" rows="4"></textarea>
              <span class="relance-hint">{{ t('fact.relanceVarsLabel') }} : {{ RELANCE_VARS }}</span>
            </label>

            <div v-if="relancePreview" class="relance-preview">
              <span class="relance-preview-label"><Sparkles :size="12" /> {{ t('fact.relancePreview') }}</span>
              <p>{{ relancePreview }}</p>
            </div>

            <div class="relance-listhead">
              <label class="relance-check">
                <input type="checkbox" :checked="allSelected" @change="toggleRelanceAll" />
                <span>{{ t('fact.relanceSelectAll') }}</span>
              </label>
              <span class="relance-count">{{ t('fact.relanceSelected', { n: selectedCount }) }}</span>
            </div>
            <div class="relance-list">
              <div v-for="row in relanceCandidates" :key="row.eleve.id" class="relance-item" :class="{ disabled: !row.phone }">
                <input type="checkbox" :checked="!!relanceSel[row.eleve.id]" :disabled="!row.phone" @change="toggleRelanceOne(row.eleve.id)" />
                <div class="relance-item-main">
                  <span class="relance-item-name">{{ row.eleve.lastName }} {{ row.eleve.firstName }}</span>
                  <span class="relance-item-meta">{{ row.eleve.className }} · {{ t('fact.relanceDue', { m: fmtMoney(row.balance) }) }}</span>
                </div>
                <div class="relance-item-side">
                  <span v-if="row.phone" class="relance-item-phone">{{ row.parent || '—' }} · {{ row.phone }}</span>
                  <span v-else class="relance-item-nophone"><AlertTriangle :size="13" /> {{ t('fact.relanceNoPhone') }}</span>
                  <span v-if="row.lastRelance" class="relance-item-last">{{ t('fact.relanceLast', { d: fmtDate(row.lastRelance) }) }}</span>
                </div>
              </div>
            </div>
          </template>

          <div v-if="relanceCandidates.length" class="modal-actions">
            <button class="btn btn-outline" @click="closeRelance">{{ t('fact.cancel') }}</button>
            <button class="btn btn-primary" :disabled="selectedCount === 0 || relanceSending" @click="sendRelances">
              <Send :size="16" />
              <span>{{ relanceSending ? t('fact.relanceSending') : t('fact.relanceSend', { n: selectedCount }) }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import { useFacturationStore, FEE_TYPES, PAYMENT_METHODS, PAYMENT_STATUS } from '../stores/facturation'
import { useElevesStore } from '../stores/eleves'
import { useClassesStore } from '../stores/classes'
import { useSchoolStore } from '../stores/school'
import { usePersonnelStore } from '../stores/personnel'
import { useAuthStore } from '../stores/auth'
import {
  Plus, Search, X, Pencil, Trash2, CheckCircle2, Settings,
  Users, Receipt, TableProperties, Banknote, Printer,
  ChevronLeft, ChevronRight, Briefcase, BookOpen, Calendar,
  DollarSign, BarChart3, Sparkles, Send, AlertTriangle
} from 'lucide-vue-next'
import { exportToExcel } from '../utils/exportExcel'
import { exportToPdf } from '../utils/exportPdf'
import ExportMenu from '../components/ExportMenu.vue'
import { useNotificationsStore } from '../stores/notifications'

const CHARGE_CATEGORIES = [
  { value: 'immobilier', label: 'Immobilier' },
  { value: 'energie', label: 'Énergie' },
  { value: 'telecom', label: 'Télécom' },
  { value: 'assurance', label: 'Assurance' },
  { value: 'fournitures', label: 'Fournitures' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'autre', label: 'Autre' }
]

const factStore = useFacturationStore()
const elevesStore = useElevesStore()
const classesStore = useClassesStore()
const schoolStore = useSchoolStore()
const personnelStore = usePersonnelStore()
const authStore = useAuthStore()
const notif = useNotificationsStore()

// ── State ──
const { t, locale } = useI18n({ useScope: 'global' })
// Libellé de statut de paiement traduit (valeurs stockées : payé/partiel/impayé)
function statusText(s) {
  if (s === 'payé') return t('fact.statusPaid')
  if (s === 'partiel') return t('fact.statusPartial')
  if (s === 'impayé') return t('fact.statusUnpaid')
  return s
}
const activeTab = ref('eleves')
const searchQuery = ref('')
const filterClass = ref('')
const filterStatus = ref('')
const currentPage = ref(1)
const perPage = 20
const payPage = ref(1)
const payPerPage = 20

// Salary state
const salarySearch = ref('')
const salaryMonth = ref(getCurrentMonth())
const showSalaryModal = ref(false)
const salaryPayTarget = ref(null)
const salaryPayForm = ref({ amount: null, method: 'virement', reference: '', date: '' })

// Charges
const showAddCharge = ref(false)
const editingChargeId = ref(null)
const chargeForm = ref({ label: '', category: 'immobilier', amount: null, frequency: 'mensuel' })

// Bulletin modal
const showBulletinModal = ref(false)
const currentBulletin = ref(null)
const bulletinRef = ref(null)

// Echeances
const showEcheances = ref(false)
const showAddEcheance = ref(false)
const editingEcheanceId = ref(null)
const echeanceForm = ref({ label: '', dueDate: '', percent: null, level: 'all' })
const echeancesSection = ref(null)

function toggleEcheances() {
  showEcheances.value = !showEcheances.value
  if (showEcheances.value) {
    nextTick(() => {
      echeancesSection.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }
}

// Modals
const showPaymentModal = ref(false)
const showAddFee = ref(false)
const confirmDeleteId = ref(null)
const deleteType = ref('')
const editingFeeId = ref(null)

// Payment form
const payForm = ref({
  eleveId: '',
  amount: null,
  method: 'especes',
  reference: '',
  date: new Date().toISOString().split('T')[0],
  note: '',
})

// Fee form
const feeForm = ref({
  feeType: 'scolarite',
  label: '',
  level: 'all',
  amount: null,
})

// Payment target
const payTarget = ref(null)

// ── Helpers ──
function getCurrentMonth() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function getMonthLabel(yearMonth) {
  const [year, month] = yearMonth.split('-')
  const date = new Date(year, parseInt(month) - 1)
  return date.toLocaleDateString(locale.value === 'en' ? 'en-GB' : 'fr-FR', { month: 'long', year: 'numeric' })
}

function formatMoney(amount) {
  const num = Math.round(amount || 0)
  // Format with regular spaces (not thin/narrow spaces) for better readability
  const formatted = num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
  return `${formatted} FCFA`
}

function formatDate(dateStr) {
  if (!dateStr) return '—'
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString(locale.value === 'en' ? 'en-GB' : 'fr-FR')
}

function getEleveName(eleveId) {
  const e = elevesStore.eleves.find(el => el.id === eleveId)
  return e ? `${e.lastName} ${e.firstName}` : '—'
}

function getEleveClass(eleveId) {
  const e = elevesStore.eleves.find(el => el.id === eleveId)
  return e?.className || '—'
}

function getMethodLabel(method) {
  const m = PAYMENT_METHODS.find(pm => pm.value === method)
  return m?.label || method
}

function getStatusLabel(status) {
  if (status === 'payé' || status === PAYMENT_STATUS.PAID) return 'Soldé'
  if (status === 'partiel' || status === PAYMENT_STATUS.PARTIAL) return 'Partiel'
  if (status === 'impayé' || status === PAYMENT_STATUS.UNPAID) return 'Impayé'
  return status || '—'
}

function getFeeTypeLabel(feeType) {
  const ft = FEE_TYPES.find(f => f.value === feeType)
  return ft?.label || feeType
}

function getChargeCategory(category) {
  const cat = CHARGE_CATEGORIES.find(c => c.value === category)
  return cat?.label || category
}

function getFrequencyLabel(freq) {
  const labels = { mensuel: 'Mensuel', trimestriel: 'Trimestriel', annuel: 'Annuel' }
  return labels[freq] || freq
}

const monthOptions = computed(() => {
  const opts = []
  const now = new Date()
  // Go back to September (start of school year)
  const septemberYear = now.getMonth() < 8 ? now.getFullYear() - 1 : now.getFullYear()
  const startDate = new Date(septemberYear, 8, 1)

  for (let i = 0; i <= 12; i++) {
    const d = new Date(startDate.getFullYear(), startDate.getMonth() + i, 1)
    const yearMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    opts.push({
      value: yearMonth,
      label: d.toLocaleDateString(locale.value === 'en' ? 'en-GB' : 'fr-FR', { month: 'long', year: 'numeric' }),
    })
    if (d > now) break
  }
  return opts.reverse()
})

// ── Computed ──
const stats = computed(() => factStore.globalStats)
const feeStructure = computed(() => factStore.feeStructure)

const inscritsList = computed(() =>
  elevesStore.eleves
    .filter(e => e.status === 'inscrit')
    .sort((a, b) => (a.lastName + a.firstName).localeCompare(b.lastName + b.firstName))
)

const availableLevels = computed(() => {
  const levels = new Set()
  classesStore.classes.forEach(c => { if (c.level) levels.add(c.level) })
  return Array.from(levels).sort()
})

// Eleves avec infos de paiement
const elevesWithPayments = computed(() => {
  return inscritsList.value.map(eleve => {
    const cls = classesStore.classes.find(c => c.name === eleve.className)
    const level = cls?.level || ''
    const totalDue = factStore.getTotalFeesForLevel(level)
    const totalPaid = factStore.getEleveTotalPaid(eleve.id)
    const status = factStore.getElevePaymentStatus(eleve.id, level)
    const balance = Math.max(0, totalDue - totalPaid)
    const statusLabel = status === PAYMENT_STATUS.PAID ? 'Soldé' : status === PAYMENT_STATUS.PARTIAL ? 'Partiel' : 'Impayé'
    return { eleve, totalDue, totalPaid, balance, status, statusLabel, level }
  })
})

const filteredEleves = computed(() => {
  let list = elevesWithPayments.value
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    list = list.filter(r =>
      (r.eleve.lastName + ' ' + r.eleve.firstName).toLowerCase().includes(q) ||
      (r.eleve.matricule || '').toLowerCase().includes(q)
    )
  }
  if (filterClass.value) {
    list = list.filter(r => r.eleve.className === filterClass.value)
  }
  if (filterStatus.value) {
    list = list.filter(r => r.status === filterStatus.value)
  }
  return list
})

// Stats adaptées au filtre classe
const classStats = computed(() => {
  if (!filterClass.value) return null
  const list = elevesWithPayments.value.filter(r => r.eleve.className === filterClass.value)
  let totalExpected = 0, totalCollected = 0, paidCount = 0, partialCount = 0, unpaidCount = 0
  for (const r of list) {
    totalExpected += r.totalDue
    totalCollected += r.totalPaid
    if (r.status === PAYMENT_STATUS.PAID) paidCount++
    else if (r.status === PAYMENT_STATUS.PARTIAL) partialCount++
    else unpaidCount++
  }
  return {
    total: list.length,
    totalExpected,
    totalCollected,
    totalOutstanding: totalExpected - totalCollected,
    paidCount,
    partialCount,
    unpaidCount,
  }
})

const displayStats = computed(() => {
  const all = elevesWithPayments.value
  let totalExpected = 0, totalCollected = 0, paidCount = 0, partialCount = 0, unpaidCount = 0
  for (const r of all) {
    totalExpected += r.totalDue
    totalCollected += r.totalPaid
    if (r.status === PAYMENT_STATUS.PAID) paidCount++
    else if (r.status === PAYMENT_STATUS.PARTIAL) partialCount++
    else unpaidCount++
  }
  const outstanding = totalExpected - totalCollected
  return {
    totalEleves: all.length,
    totalExpected,
    totalCollected,
    totalOutstanding: outstanding,
    paidCount,
    partialCount,
    unpaidCount,
    collectionRate: totalExpected > 0 ? Math.round((totalCollected / totalExpected) * 100) : 0,
  }
})

const paginatedEleves = computed(() => {
  const start = (currentPage.value - 1) * perPage
  return filteredEleves.value.slice(start, start + perPage)
})

const totalPages = computed(() => Math.ceil(filteredEleves.value.length / perPage))

const paginatedPayments = computed(() => {
  const start = (payPage.value - 1) * payPerPage
  return factStore.payments.slice(start, start + payPerPage)
})

const totalPayPages = computed(() => Math.ceil(factStore.payments.length / payPerPage))

// Salary filtering
const filteredStaff = computed(() => {
  let staff = personnelStore.staff
  if (salarySearch.value) {
    const q = salarySearch.value.toLowerCase()
    staff = staff.filter(s => (s.lastName + ' ' + s.firstName).toLowerCase().includes(q))
  }

  return staff.map(s => {
    const salaryPayments = factStore.getSalaryPayments?.(s.id, salaryMonth.value) || []
    const totalSalary = s.salary || 0
    const totalPaid = salaryPayments.reduce((acc, sp) => acc + (sp.amount || 0), 0)
    return {
      staff: s,
      salary: totalSalary,
      paid: totalPaid,
      remaining: Math.max(0, totalSalary - totalPaid)
    }
  })
})

const salaryStats = computed(() => {
  const filtered = filteredStaff.value
  let totalMensuel = 0, paidCount = 0, totalPaid = 0
  for (const row of filtered) {
    totalMensuel += row.salary
    if (row.paid >= row.salary) paidCount++
    totalPaid += row.paid
  }
  return {
    total: filtered.length,
    totalMensuel,
    paidCount,
    totalPaid,
    totalRemaining: totalMensuel - totalPaid,
  }
})

// Charges
const chargeStats = computed(() => {
  const charges = factStore.charges || []
  let mensuelDirect = 0, trimestrielDirect = 0, annuelDirect = 0

  for (const chg of charges) {
    const amt = chg.amount || 0
    if (chg.frequency === 'mensuel') mensuelDirect += amt
    else if (chg.frequency === 'trimestriel') trimestrielDirect += amt
    else if (chg.frequency === 'annuel') annuelDirect += amt
  }

  // Total mensuel = tout ramené au mois
  const totalMensuel = mensuelDirect + (trimestrielDirect / 3) + (annuelDirect / 12)

  return {
    totalMensuel: Math.round(totalMensuel),
    totalTrimestriel: Math.round(totalMensuel * 3),
    totalAnnuel: Math.round(totalMensuel * 12),
  }
})

const chargesByCategory = computed(() => {
  const charges = factStore.charges || []
  const grouped = {}

  for (const chg of charges) {
    if (!grouped[chg.category]) {
      grouped[chg.category] = { category: chg.category, charges: [], count: 0 }
    }
    grouped[chg.category].charges.push(chg)
    grouped[chg.category].count++
  }

  return Object.values(grouped).map(g => {
    let monthly = 0
    for (const chg of g.charges) {
      if (chg.frequency === 'mensuel') monthly += chg.amount || 0
      else if (chg.frequency === 'trimestriel') monthly += (chg.amount || 0) / 3
      else if (chg.frequency === 'annuel') monthly += (chg.amount || 0) / 12
    }
    return {
      ...g,
      categoryLabel: getChargeCategory(g.category),
      totalMensuel: monthly,
    }
  })
})

// Synthèse financière
const synthesis = computed(() => factStore.financialSynthesis || {
  recettesScolarite: 0,
  recettesPrevisionnelles: 0,
  masseSalarialeMensuelle: 0,
  masseSalarialeAnnuelle: 0,
  totalSalairesVerses: 0,
  chargesFixesMensuelles: 0,
  totalChargesFixesAnnuel: 0,
  resultatActuel: 0,
  resultatPrevisionnel: 0,
})

const sortedFees = computed(() => {
  return [...feeStructure.value].sort((a, b) => {
    if (a.level !== b.level) return a.level.localeCompare(b.level)
    return a.label.localeCompare(b.label)
  })
})

const levelTotals = computed(() => {
  const totals = {}
  for (const fee of feeStructure.value) {
    const key = fee.level === 'all' ? 'Tous les niveaux' : fee.level
    if (!totals[key]) totals[key] = { level: key, total: 0, count: 0 }
    totals[key].total += fee.amount || 0
    totals[key].count++
  }
  return Object.values(totals).sort((a, b) => a.level.localeCompare(b.level))
})

const echeanceTotalPercent = computed(() => {
  return factStore.echeances.reduce((acc, e) => acc + (e.percent || 0), 0)
})

const canSubmitFee = computed(() => feeForm.value.label && feeForm.value.amount && feeForm.value.amount > 0)
const canSubmitPayment = computed(() => payForm.value.eleveId && payForm.value.amount && payForm.value.amount > 0)
const canSubmitCharge = computed(() => chargeForm.value.label && chargeForm.value.amount && chargeForm.value.amount > 0)

const payTargetTotal = computed(() => {
  if (!payTarget.value) return 0
  const cls = classesStore.classes.find(c => c.name === payTarget.value.className)
  return factStore.getTotalFeesForLevel(cls?.level || '')
})

const payTargetBalance = computed(() => {
  if (!payTarget.value) return 0
  const total = payTargetTotal.value
  const paid = factStore.getEleveTotalPaid(payTarget.value.id)
  return Math.max(0, total - paid)
})

const bulletinMonth = computed(() => {
  if (!currentBulletin.value) return ''
  return getMonthLabel(salaryMonth.value)
})

const bulletinMonthShort = computed(() => {
  return salaryMonth.value
})

// ── Methods ──
function generatePaymentReference() {
  // Générer un numéro séquentiel basé sur les paiements existants
  const existing = factStore.payments
    .map(p => p.reference)
    .filter(r => r && r.startsWith('REC-'))
    .map(r => parseInt(r.replace('REC-', ''), 10))
    .filter(n => !isNaN(n))
  const next = existing.length > 0 ? Math.max(...existing) + 1 : 1
  return `REC-${String(next).padStart(5, '0')}`
}

function openPaymentModal(eleve = null) {
  payForm.value = {
    eleveId: eleve?.id || '',
    amount: null,
    method: 'especes',
    tranche: '',
    date: new Date().toISOString().split('T')[0],
    note: '',
  }
  payTarget.value = eleve || null
  showPaymentModal.value = true
}

function buildPaymentsExport() {
  const columns = [
    { key: 'eleveName', label: 'Élève', width: 20 },
    { key: 'className', label: 'Classe', width: 15 },
    { key: 'expected', label: 'Montant attendu', width: 18 },
    { key: 'paid', label: 'Montant payé', width: 18 },
    { key: 'remaining', label: 'Reste', width: 18 },
    { key: 'status', label: 'Statut', width: 15 },
  ]

  const exportData = filteredEleves.value.map(row => ({
    eleveName: row.eleve.lastName + ' ' + row.eleve.firstName,
    className: row.eleve.className || '-',
    expected: row.totalDue || 0,
    paid: row.totalPaid || 0,
    remaining: row.balance || 0,
    status: row.statusLabel || '-',
  }))

  return { data: exportData, columns }
}

function exportPayments() {
  const { data, columns } = buildPaymentsExport()
  exportToExcel(data, columns, 'paiements', 'Paiements')
}

function exportPaymentsPdf() {
  const { data, columns } = buildPaymentsExport()
  exportToPdf(data, columns, 'paiements', { title: 'Paiements' })
}

function submitPayment() {
  if (!canSubmitPayment.value) return
  const reference = generatePaymentReference()
  factStore.addPayment({
    eleveId: payForm.value.eleveId,
    amount: payForm.value.amount,
    method: payForm.value.method,
    reference,
    tranche: payForm.value.tranche || '',
    date: payForm.value.date,
    note: payForm.value.note,
    recordedBy: authStore.userProfile?.displayName || authStore.firstName || 'Inconnu',
  })
  showPaymentModal.value = false
}

// Detail modals
const showDetailModal = ref(false)
const detailType = ref('')
const detailData = ref(null)

function openEleveDetail(row) {
  detailType.value = 'eleve'
  const payments = factStore.payments.filter(p => p.eleveId === row.eleve.id).sort((a, b) => new Date(b.date) - new Date(a.date))
  detailData.value = { ...row, payments }
  showDetailModal.value = true
}

function openPaymentDetail(pay) {
  detailType.value = 'payment'
  detailData.value = pay
  showDetailModal.value = true
}

function printReceipt(payment) {
  const eleve = elevesStore.eleves.find(e => e.id === payment.eleveId)
  const method = getMethodLabel(payment.method)
  const content = `
Reçu de paiement
===============
Date: ${formatDate(payment.date)}
Élève: ${eleve?.lastName} ${eleve?.firstName}
Classe: ${eleve?.className}
Montant: ${formatMoney(payment.amount)}
Mode: ${method}
Référence: ${payment.reference || '—'}
  `.trim()

  const win = window.open('', '', 'width=600,height=400')
  win.document.write('<pre>' + content + '</pre>')
  win.document.close()
  win.print()
}

function confirmDeletePayment(paymentId) {
  confirmDeleteId.value = paymentId
  deleteType.value = 'payment'
}

function editFee(fee) {
  editingFeeId.value = fee.id
  feeForm.value = { ...fee }
  showAddFee.value = true
}

function closeFeeMod() {
  showAddFee.value = false
  editingFeeId.value = null
  feeForm.value = { feeType: 'scolarite', label: '', level: 'all', amount: null }
}

function submitFee() {
  if (!canSubmitFee.value) return
  if (editingFeeId.value) {
    factStore.updateFee(editingFeeId.value, feeForm.value)
  } else {
    factStore.addFee(feeForm.value)
  }
  closeFeeMod()
}

function confirmDeleteFee(feeId) {
  confirmDeleteId.value = feeId
  deleteType.value = 'fee'
}

function editEcheance(ech) {
  editingEcheanceId.value = ech.id
  echeanceForm.value = {
    label: ech.label,
    dueDate: ech.dueDate,
    percent: ech.percent,
    level: ech.level || 'all',
  }
  showAddEcheance.value = true
}

function submitEcheance() {
  const data = {
    label: echeanceForm.value.label,
    dueDate: echeanceForm.value.dueDate,
    percent: echeanceForm.value.percent,
    level: echeanceForm.value.level || 'all',
  }
  if (editingEcheanceId.value) {
    factStore.updateEcheance(editingEcheanceId.value, data)
  } else {
    factStore.addEcheance(data)
  }
  echeanceForm.value = { label: '', dueDate: '', percent: null, level: 'all' }
  editingEcheanceId.value = null
  showAddEcheance.value = false
}

function openSalaryPayModal(row) {
  salaryPayTarget.value = row
  salaryPayForm.value = {
    amount: null,
    method: 'virement',
    reference: '',
    date: new Date().toISOString().split('T')[0],
  }
  showSalaryModal.value = true
}

function submitSalaryPayment() {
  if (!salaryPayTarget.value || !salaryPayForm.value.amount) return
  factStore.addSalaryPayment?.({
    staffId: salaryPayTarget.value.staff.id,
    amount: salaryPayForm.value.amount,
    month: salaryMonth.value,
    method: salaryPayForm.value.method,
    reference: salaryPayForm.value.reference,
    date: salaryPayForm.value.date,
  })
  showSalaryModal.value = false
}

function openBulletinModal(row) {
  currentBulletin.value = row
  showBulletinModal.value = true
}

function printBulletin() {
  if (!bulletinRef.value) return
  const win = window.open('', '', 'width=800,height=600')
  win.document.write(bulletinRef.value.innerHTML)
  win.document.close()
  win.print()
}

function editCharge(charge) {
  editingChargeId.value = charge.id
  chargeForm.value = { ...charge }
  showAddCharge.value = true
}

function closeChargeModal() {
  showAddCharge.value = false
  editingChargeId.value = null
  chargeForm.value = { label: '', category: 'immobilier', amount: null, frequency: 'mensuel' }
}

function submitCharge() {
  if (!canSubmitCharge.value) return
  if (editingChargeId.value) {
    factStore.updateCharge?.(editingChargeId.value, chargeForm.value)
  } else {
    factStore.addCharge?.(chargeForm.value)
  }
  closeChargeModal()
}

function confirmDeleteCharge(chargeId) {
  confirmDeleteId.value = chargeId
  deleteType.value = 'charge'
}

function confirmDelete() {
  if (deleteType.value === 'payment') {
    factStore.deletePayment(confirmDeleteId.value)
  } else if (deleteType.value === 'fee') {
    factStore.deleteFee(confirmDeleteId.value)
  } else if (deleteType.value === 'charge') {
    factStore.deleteCharge?.(confirmDeleteId.value)
  }
  confirmDeleteId.value = null
  deleteType.value = ''
}

// ── Relances impayés (MIAPO) — supervisées ──
// MIAPO repère les familles avec un solde, prépare un message personnalisé par
// famille, le directeur coche/valide, puis l'envoi part par WhatsApp/SMS (proxy
// Twilio, ou simulé si pas encore branché). Garde-fou : rien ne part sans validation.
const RELANCE_VARS = '{parent}, {eleve}, {classe}, {montant}, {ecole}'
const DEFAULT_RELANCE = {
  fr: 'Bonjour {parent}, un solde de scolarite de {montant} reste a regler pour {eleve} ({classe}). Merci de bien vouloir regulariser des que possible. Cordialement, {ecole}.',
  en: 'Hello {parent}, a tuition balance of {montant} is still due for {eleve} ({classe}). Please settle it as soon as possible. Best regards, {ecole}.',
}
const showRelance = ref(false)
const relanceChannel = ref(notif.settings.channel || 'whatsapp')
const relanceMessage = ref(DEFAULT_RELANCE.fr)
const relanceSel = ref({})
const relanceSending = ref(false)
const relanceResult = ref(null)

const ecoleName = computed(() => schoolStore.schoolSettings?.schoolName || (locale.value === 'en' ? 'the school' : "l'établissement"))
const fmtMoney = (n) => (n || 0).toLocaleString('fr-FR') + ' FCFA'
const fmtDate = (iso) => { try { return new Date(iso).toLocaleDateString(locale.value === 'en' ? 'en-GB' : 'fr-FR') } catch { return '' } }

const relanceCandidates = computed(() => elevesWithPayments.value
  .filter(r => r.balance > 0)
  .map(r => {
    const e = r.eleve
    const parent = (e.parentLastName && e.parentFirstName) ? `${e.parentFirstName} ${e.parentLastName}` : (e.parentName || '')
    return { eleve: e, balance: r.balance, parent, phone: (e.parentPhone || '').trim(), lastRelance: factStore.getLastRelance(e.id) }
  })
  .sort((a, b) => b.balance - a.balance))

const selectableCount = computed(() => relanceCandidates.value.filter(r => r.phone).length)
const selectedCount = computed(() => relanceCandidates.value.filter(r => relanceSel.value[r.eleve.id]).length)
const allSelected = computed(() => selectableCount.value > 0 && selectedCount.value === selectableCount.value)

function buildRelanceText(row) {
  return relanceMessage.value
    .replace(/\{parent\}/g, row.parent || (locale.value === 'en' ? 'dear parent' : 'cher parent'))
    .replace(/\{eleve\}/g, `${row.eleve.lastName} ${row.eleve.firstName}`)
    .replace(/\{classe\}/g, row.eleve.className || '')
    .replace(/\{montant\}/g, fmtMoney(row.balance))
    .replace(/\{ecole\}/g, ecoleName.value)
}
const relancePreview = computed(() => {
  const first = relanceCandidates.value.find(r => relanceSel.value[r.eleve.id]) || relanceCandidates.value[0]
  return first ? buildRelanceText(first) : ''
})

function toggleRelanceOne(id) { relanceSel.value = { ...relanceSel.value, [id]: !relanceSel.value[id] } }
function toggleRelanceAll() {
  const next = {}
  if (!allSelected.value) relanceCandidates.value.forEach(r => { if (r.phone) next[r.eleve.id] = true })
  relanceSel.value = next
}
function openRelance() {
  relanceResult.value = null
  relanceChannel.value = notif.settings.channel || 'whatsapp'
  if (relanceMessage.value === DEFAULT_RELANCE.fr || relanceMessage.value === DEFAULT_RELANCE.en) {
    relanceMessage.value = DEFAULT_RELANCE[locale.value === 'en' ? 'en' : 'fr']
  }
  const sel = {}
  relanceCandidates.value.forEach(r => { if (r.phone) sel[r.eleve.id] = true })
  relanceSel.value = sel
  showRelance.value = true
}
function closeRelance() { showRelance.value = false }

async function sendRelances() {
  if (relanceSending.value) return
  relanceSending.value = true
  notif.setChannel(relanceChannel.value)
  let sent = 0, simulated = 0, failed = 0
  const targets = relanceCandidates.value.filter(r => relanceSel.value[r.eleve.id] && r.phone)
  for (const row of targets) {
    const entry = await notif.sendAlert({
      to: row.phone,
      message: buildRelanceText(row),
      channel: relanceChannel.value,
      meta: { eleve: `${row.eleve.lastName} ${row.eleve.firstName}`, parent: row.parent, classe: row.eleve.className, template: 'relance' },
    })
    if (entry.status === 'envoyé') sent++
    else if (entry.status === 'simulé') simulated++
    else failed++
    factStore.recordRelance(row.eleve.id)
  }
  relanceResult.value = { total: targets.length, sent, simulated, failed }
  relanceSending.value = false
}

// ── Copilote MIAPO : applique les filtres passés en query (?focus/classe/q) ──
const route = useRoute()
function applyMiapoQuery() {
  const q = route.query
  if (!q || !q.miapo) return
  activeTab.value = 'eleves'
  const focus = String(q.focus || '')
  if (focus === 'impayes') filterStatus.value = PAYMENT_STATUS.UNPAID
  else if (focus === 'partiels') filterStatus.value = PAYMENT_STATUS.PARTIAL
  else if (focus === 'payes') filterStatus.value = PAYMENT_STATUS.PAID
  if (q.classe) filterClass.value = String(q.classe)
  if (q.q) searchQuery.value = String(q.q)
  currentPage.value = 1
  if (q.relance) nextTick(() => openRelance())
}

onMounted(async () => {
  // Charger classes et élèves AVANT la facturation (nécessaire pour générer les données démo)
  await classesStore.loadClasses()
  await elevesStore.loadEleves()
  await personnelStore.loadStaff()
  await factStore.loadFacturation()
  applyMiapoQuery()
})

watch(() => route.query, applyMiapoQuery)
</script>

<style scoped>
.facturation-page {
  display: flex;
  flex-direction: column;
  gap: 24px;
  padding: 24px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 24px;
}

.page-header-text h1 {
  font-size: 32px;
  font-weight: 700;
  margin: 0 0 8px 0;
}

.page-header-text p {
  font-size: 14px;
  color: var(--tx3);
  margin: 0;
}

.header-actions {
  display: flex;
  gap: 12px;
}

.setup-section {
  margin-bottom: 24px;
}

.setup-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 48px 24px;
  text-align: center;
}

.setup-icon {
  margin-bottom: 24px;
  color: var(--primary);
}

.setup-card h2 {
  font-size: 24px;
  font-weight: 600;
  margin: 0 0 12px 0;
}

.setup-card p {
  font-size: 14px;
  color: var(--tx3);
  margin: 0 0 24px 0;
}

.stat-bar {
  display: grid;
  gap: 16px;
  padding: 16px;
  background: var(--input-bg);
  border-radius: 8px;
}

.stat-bar-item {
  display: flex;
  align-items: center;
  gap: 12px;
}

.stat-bar-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  flex-shrink: 0;
}

.stat-bar-dot.blue {
  background: var(--blue, #4A90E2);
}

.stat-bar-dot.green {
  background: var(--success, #34A853);
}

.stat-bar-dot.orange {
  background: var(--gold, #F9AB00);
}

.stat-bar-value {
  font-size: 18px;
  font-weight: 700;
}

.stat-bar-label {
  font-size: 13px;
  color: var(--tx3);
}

.class-summary-bar {
  padding: 16px;
  background: var(--input-bg);
  border-radius: 8px;
  margin-bottom: 24px;
}

.class-summary-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 12px;
}

.class-summary-stats {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  font-size: 13px;
}

.cs-sep {
  color: var(--tx3);
}

.cs-green {
  color: var(--success, #34A853);
}

.cs-orange {
  color: var(--gold, #F9AB00);
}

.cs-red {
  color: var(--danger, #D93025);
}

.select {
  min-width: 140px;
}

.status-summary {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 20px;
}

.status-chip {
  padding: 6px 12px;
  border: 1px solid var(--card-border);
  border-radius: 6px;
  background: var(--card);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}

.status-chip:hover {
  border-color: var(--primary);
  color: var(--primary);
}

.status-chip.active {
  background: var(--primary);
  border-color: var(--primary);
  color: white;
}

.status-chip.chip-paid {
  --primary: var(--success, #34A853);
}

.status-chip.chip-partial {
  --primary: var(--gold, #F9AB00);
}

.status-chip.chip-unpaid {
  --primary: var(--danger, #D93025);
}

.table-row-clickable {
  cursor: pointer;
}

/* Detail modal */
.detail-section {
  margin-bottom: 16px;
}
.detail-title {
  font-size: 18px;
  font-weight: 700;
  margin: 0 0 4px;
}
.detail-subtitle {
  font-size: 13px;
  color: var(--tx2);
  margin: 0;
}
.detail-section-title {
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  color: var(--tx3);
  margin: 0 0 10px;
  letter-spacing: 0.5px;
}
.detail-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
  margin-bottom: 16px;
}
.detail-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.detail-label {
  font-size: 11px;
  text-transform: uppercase;
  font-weight: 600;
  color: var(--tx3);
  letter-spacing: 0.5px;
}
.detail-value {
  font-size: 14px;
  color: var(--tx);
  font-weight: 500;
}
.detail-payment-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: var(--input-bg);
  border-radius: 6px;
  margin-bottom: 6px;
  font-size: 13px;
}

.col-eleve {
  width: 25%;
}

.col-classe {
  width: 12%;
}

.col-montant {
  width: 130px;
}

.col-statut {
  width: 100px;
}

.col-actions {
  width: 100px;
}

.eleve-cell {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.matricule {
  font-size: 12px;
  color: var(--tx3);
}

.payment-badge, .method-badge, .fee-type-badge {
  display: inline-block;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}

.badge-payé {
  background: rgba(52, 168, 83, 0.1);
  color: var(--success, #34A853);
}

.badge-partiel {
  background: rgba(249, 171, 0, 0.1);
  color: var(--gold, #F9AB00);
}

.badge-impayé {
  background: rgba(217, 48, 37, 0.1);
  color: var(--danger, #D93025);
}

.method-badge {
  background: var(--input-bg);
  color: var(--tx2);
}

.fee-type-badge {
  background: rgba(74, 144, 226, 0.1);
  color: var(--blue, #4A90E2);
}

.text-right {
  text-align: right;
}

.text-center {
  text-align: center;
}

.text-muted {
  color: var(--tx3);
}

.font-mono {
  font-family: 'SF Mono', 'Fira Code', 'Consolas', monospace;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.3px;
}

.font-semibold {
  font-weight: 600;
}

.text-danger {
  color: var(--danger, #D93025);
}

.action-btns {
  display: flex;
  gap: 6px;
  justify-content: center;
}

.pagination-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  border-top: 1px solid var(--card-border);
  margin-top: 20px;
}

.pagination-info {
  font-size: 13px;
  color: var(--tx3);
}

.pagination-btns {
  display: flex;
  gap: 8px;
}

.empty-state {
  text-align: center;
  padding: 40px 24px;
  color: var(--tx3);
}

.empty-state p {
  margin: 0;
  font-size: 14px;
}

.salary-summary-bar, .charges-summary-bar {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  padding: 16px;
  background: var(--input-bg);
  border-radius: 8px;
  margin-bottom: 20px;
}

.salary-summary-item, .charges-summary-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.salary-summary-label, .charges-summary-label {
  font-size: 12px;
  color: var(--tx3);
  text-transform: uppercase;
  font-weight: 500;
}

.salary-summary-value, .charges-summary-value {
  font-size: 18px;
  font-weight: 700;
}

.level-summary {
  margin-top: 24px;
  padding-top: 24px;
  border-top: 1px solid var(--card-border);
}

.level-summary h4, .category-summary h4 {
  font-size: 14px;
  font-weight: 600;
  margin: 0 0 16px 0;
}

.level-grid, .category-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 12px;
}

.level-card, .category-card {
  padding: 12px;
  background: var(--input-bg);
  border-radius: 6px;
  text-align: center;
}

.level-name, .category-name {
  font-size: 12px;
  color: var(--tx3);
  margin-bottom: 8px;
}

.level-total, .category-total {
  font-size: 16px;
  font-weight: 700;
  margin-bottom: 4px;
}

.level-detail, .category-detail {
  font-size: 12px;
  color: var(--tx3);
}

.synthesis-section {
  margin-bottom: 24px;
}

.synthesis-section h4 {
  font-size: 14px;
  font-weight: 600;
  margin: 0 0 12px 0;
}

.synthesis-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.synthesis-grid-3 {
  grid-template-columns: repeat(3, 1fr);
}

.synthesis-item {
  padding: 16px;
  background: var(--input-bg);
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.synthesis-label {
  font-size: 12px;
  color: var(--tx3);
  text-transform: uppercase;
  font-weight: 500;
}

.synthesis-value {
  font-size: 18px;
  font-weight: 700;
}

.synthesis-value.green {
  color: var(--success, #34A853);
}

.synthesis-value.blue {
  color: var(--blue, #4A90E2);
}

.synthesis-balance {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 12px;
}

.balance-item {
  padding: 16px;
  background: var(--input-bg);
  border-radius: 6px;
}

.balance-item.positive {
  background: rgba(52,168,83,.08);
}

.balance-item.negative {
  background: rgba(217,48,37,.08);
}

.balance-label {
  display: block;
  font-size: 12px;
  color: var(--tx3);
  margin-bottom: 8px;
  text-transform: uppercase;
  font-weight: 500;
}

.balance-value {
  font-size: 18px;
  font-weight: 700;
}

.balance-item.positive .balance-value {
  color: var(--success, #34A853);
}

.balance-item.negative .balance-value {
  color: var(--danger, #D93025);
}

.modal-header-actions {
  display: flex;
  gap: 8px;
}

.field {
  margin-bottom: 16px;
}

.field-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-bottom: 16px;
}

.field label {
  display: block;
  font-size: 13px;
  font-weight: 500;
  margin-bottom: 6px;
}

.pay-eleve-info {
  padding: 12px;
  background: var(--input-bg);
  border-radius: 6px;
  margin-bottom: 16px;
}

.pay-info-row {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  padding: 6px 0;
}

.pay-info-highlight {
  padding: 8px 12px;
  background: var(--card);
  border-radius: 4px;
  font-weight: 600;
  margin-top: 6px;
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary {
  background: var(--primary, #4A90E2);
  color: white;
}

.btn-primary:hover {
  opacity: 0.9;
}

.btn-outline {
  border: 1px solid var(--card-border);
  background: var(--card);
  color: var(--tx1);
}

.btn-outline:hover {
  background: var(--input-bg);
}

.btn-danger {
  color: var(--danger, #D93025);
}

.btn-danger:hover {
  background: rgba(217, 48, 37, 0.1);
}

.btn-sm {
  padding: 6px 12px;
  font-size: 12px;
}

.btn-lg {
  padding: 12px 24px;
  font-size: 14px;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.setup-confirm {
  display: flex;
  justify-content: center;
  margin-top: 24px;
}

.echeance-warning {
  padding: 12px;
  background: rgba(217, 48, 37, 0.1);
  color: var(--danger, #D93025);
  border-radius: 6px;
  font-size: 13px;
  margin-top: 12px;
}

.bulletin-container {
  background: white;
  padding: 24px;
  border-radius: 6px;
}

.bulletin-header {
  text-align: center;
  margin-bottom: 24px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--card-border);
}

.bulletin-header h3 {
  margin: 0 0 4px 0;
  font-size: 16px;
}

.bulletin-header p {
  margin: 0;
  font-size: 12px;
  color: var(--tx3);
}

.bulletin-info {
  margin-bottom: 20px;
}

.bulletin-row {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  font-size: 13px;
}

.bulletin-label {
  font-weight: 500;
  color: var(--tx2);
}

.bulletin-value {
  text-align: right;
}

.bulletin-salary {
  padding: 16px;
  background: var(--input-bg);
  border-radius: 6px;
  text-align: center;
}

.bulletin-salary-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 13px;
}

.bulletin-value-large {
  font-size: 20px;
  font-weight: 700;
  color: var(--primary, #4A90E2);
}

.total-row td {
  background: var(--input-bg);
  font-weight: 600;
}

/* ═══ MOBILE RESPONSIVENESS ═══ */
@media (max-width: 768px) {
  /* Page layout on mobile */
  .facturation-page { padding: 8px; gap: 12px; }
  .page-header { flex-direction: column; align-items: flex-start; gap: 12px; }
  .page-header-text h1 { font-size: 24px; }
  .header-actions { width: 100%; flex-direction: column; }
  .header-actions .btn { width: 100%; }

  /* Stat bar 2 columns */
  .stat-bar { grid-template-columns: repeat(2, 1fr); gap: 8px; padding: 8px; }
  .stat-bar-item { gap: 6px; flex-wrap: wrap; }
  .stat-bar-dot { width: 8px; height: 8px; }
  .stat-bar-value { font-size: 14px; }
  .stat-bar-label { font-size: 10px; }

  /* Table scrollable */
  .table-wrapper { overflow-x: auto; -webkit-overflow-scrolling: touch; }
  table { font-size: 12px; }
  table th { padding: 8px 6px; font-size: 10px; }
  table td { padding: 6px; }

  /* Hide non-essential columns - keep: student name, amount, status */
  .col-class { display: none; }
  .col-date { display: none; }
  .col-details { display: none; }
  .col-notes { display: none; }

  /* Keep essential columns visible and sized for mobile */
  .col-student { min-width: 120px; }
  .col-amount { min-width: 80px; text-align: right; }
  .col-status { min-width: 70px; text-align: center; }

  /* Prevent text overflow */
  .eleve-cell { max-width: 120px; overflow: hidden; text-overflow: ellipsis; }
  .font-mono { font-size: 11px; letter-spacing: 0; }
  .col-montant { width: auto; min-width: 70px; }
  .col-statut { width: auto; min-width: 60px; }
  .col-actions { width: auto; min-width: 60px; }
  .col-eleve { width: auto; min-width: 100px; }

  /* Modal responsiveness */
  .modal-card { width: 95%; max-width: 100%; padding: 12px; margin: 8px auto; }
  .relance-item { flex-wrap: wrap; }
  .relance-item-side { align-items: flex-start; text-align: left; margin-left: 30px; }
  .modal-header { padding: 12px 16px; }
  .modal-header h2 { font-size: 16px; }
  .modal-body { padding: 16px; }

  /* Payment form stacks to 1 column */
  .form-grid { grid-template-columns: 1fr; gap: 12px; }
  .field { margin-bottom: 12px; }
  .input, select { width: 100%; font-size: 16px; min-height: 44px; padding: 12px; }

  /* Payment modal forms */
  .payment-form { display: flex; flex-direction: column; gap: 12px; }
  .payment-form .field { margin-bottom: 0; }
  .payment-form .field label { font-size: 12px; }

  /* Setup section on mobile */
  .setup-card { padding: 32px 16px; }
  .setup-icon { margin-bottom: 16px; }
  .setup-card h2 { font-size: 18px; margin-bottom: 8px; }
  .setup-card p { font-size: 13px; }

  /* Button styling for mobile */
  .btn { min-height: 44px; font-size: 14px; padding: 12px 16px; }
  .btn-sm { min-height: 40px; padding: 8px 12px; font-size: 12px; }
  .btn-lg { width: 100%; }

  /* Bulletin container on mobile */
  .bulletin-container { padding: 16px; }
  .bulletin-header { margin-bottom: 16px; padding-bottom: 8px; }
  .bulletin-header h3 { font-size: 14px; margin-bottom: 2px; }
  .bulletin-info { margin-bottom: 12px; }
  .bulletin-row { padding: 6px 0; font-size: 12px; }

  /* Echeance warning */
  .echeance-warning { padding: 10px; font-size: 12px; margin-top: 10px; }

  /* Warning and info banners */
  .info-banner { padding: 12px; font-size: 12px; }
  .warning-banner { padding: 12px; font-size: 12px; }

  .salary-summary-bar, .charges-summary-bar { grid-template-columns: 1fr 1fr; gap: 8px; padding: 8px; }
  .salary-summary-value, .charges-summary-value { font-size: 14px; }
  .salary-summary-label, .charges-summary-label { font-size: 10px; }
  .level-grid, .category-grid { grid-template-columns: repeat(2, 1fr); gap: 8px; }
  .level-total, .category-total { font-size: 14px; }
  .synthesis-grid { grid-template-columns: 1fr; }
  .detail-grid { grid-template-columns: 1fr; }
  .bulletin-value-large { font-size: 16px; }
}

/* ── Relances impayés (MIAPO) ── */
.btn-relance { margin-left: auto; white-space: nowrap; }
.relance-modal { max-width: 620px; width: 100%; display: flex; flex-direction: column; max-height: 88vh; }
.relance-modal .modal-body { overflow-y: auto; }
.relance-head { display: flex; align-items: center; gap: 12px; }
.relance-head h2 { margin: 0; }
.relance-spark {
  display: inline-flex; align-items: center; justify-content: center;
  width: 34px; height: 34px; border-radius: 10px; color: #fff; flex-shrink: 0;
  background: linear-gradient(135deg, var(--pr), #7c5cff);
  box-shadow: 0 3px 10px rgba(var(--pr-rgb), .35);
}
.relance-sub { margin: 3px 0 0; font-size: 12.5px; color: var(--tx3); }
.relance-row { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
.relance-label { font-size: 13px; font-weight: 600; color: var(--tx2); }
.relance-seg { display: inline-flex; border: 1px solid var(--divider); border-radius: 9px; overflow: hidden; }
.relance-seg button {
  border: none; background: transparent; padding: 7px 16px; font-size: 13px;
  font-family: inherit; color: var(--tx2); cursor: pointer; transition: .15s;
}
.relance-seg button.active { background: var(--pr); color: #fff; }
.relance-field { display: block; margin-bottom: 16px; }
.relance-field > span { display: block; font-size: 13px; font-weight: 600; color: var(--tx2); margin-bottom: 6px; }
.relance-field textarea {
  width: 100%; padding: 10px 12px; border: 1px solid var(--divider); border-radius: 10px;
  background: var(--input-bg); color: var(--tx); font-size: 14px; font-family: inherit;
  resize: vertical; outline: none; line-height: 1.5;
}
.relance-field textarea:focus { border-color: var(--pr); }
.relance-hint { display: block; margin-top: 6px; font-size: 11.5px; color: var(--tx3); }
.relance-preview {
  background: rgba(var(--pr-rgb), .06); border: 1px solid rgba(var(--pr-rgb), .18);
  border-radius: 10px; padding: 10px 14px; margin-bottom: 18px;
}
.relance-preview-label {
  display: inline-flex; align-items: center; gap: 5px; font-size: 11px; font-weight: 700;
  text-transform: uppercase; letter-spacing: .04em; color: var(--pr); margin-bottom: 4px;
}
.relance-preview p { margin: 2px 0 0; font-size: 13.5px; color: var(--tx); line-height: 1.5; }
.relance-listhead {
  display: flex; align-items: center; justify-content: space-between;
  padding: 4px 2px 8px; border-bottom: 1px solid var(--divider); margin-bottom: 6px;
}
.relance-check { display: inline-flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 600; color: var(--tx2); cursor: pointer; }
.relance-count { font-size: 12.5px; color: var(--tx3); }
.relance-list { display: flex; flex-direction: column; }
.relance-item {
  display: flex; align-items: center; gap: 12px; padding: 10px 2px;
  border-bottom: 1px solid var(--divider);
}
.relance-item.disabled { opacity: .55; }
.relance-item > input[type="checkbox"] { width: 17px; height: 17px; accent-color: var(--pr); flex-shrink: 0; cursor: pointer; }
.relance-item.disabled > input { cursor: not-allowed; }
.relance-item-main { display: flex; flex-direction: column; gap: 2px; min-width: 0; flex: 1; }
.relance-item-name { font-size: 14px; font-weight: 600; color: var(--tx); }
.relance-item-meta { font-size: 12.5px; color: var(--tx3); }
.relance-item-side { display: flex; flex-direction: column; gap: 2px; align-items: flex-end; text-align: right; flex-shrink: 0; }
.relance-item-phone { font-size: 12px; color: var(--tx2); }
.relance-item-nophone { display: inline-flex; align-items: center; gap: 4px; font-size: 12px; color: var(--warn); }
.relance-item-last { font-size: 11px; color: var(--tx3); }
.modal-actions { display: flex; justify-content: flex-end; gap: 10px; padding-top: 18px; }
.relance-done { text-align: center; padding: 18px 8px 8px; display: flex; flex-direction: column; align-items: center; gap: 8px; }
.relance-done-title { font-family: var(--font-display); font-weight: 700; font-size: 17px; color: var(--tx); margin: 4px 0 0; }
.relance-done-text { font-size: 14px; color: var(--tx2); margin: 0; line-height: 1.5; }
</style>
