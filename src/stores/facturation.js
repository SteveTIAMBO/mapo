import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { db, auth } from '../firebase'
import { doc, setDoc, getDoc } from 'firebase/firestore'
import { useAuthStore } from './auth'
import { demoKey } from '../utils/demoScope'
import { useClassesStore } from './classes'
import { useElevesStore } from './eleves'
import { usePersonnelStore } from './personnel'
import { packPays, montantDemo } from '../data/paysDemo'
import { paysDemo } from '../utils/demoScope'

/**
 * Met un montant de démonstration à l'échelle du pays choisi.
 * Sans cela, une école française affichait des frais de scolarité de
 * 150 000 € — des francs CFA portant un symbole euro.
 */
/**
 * ⚠️ La clé de DONNÉES n'était pas suffixée, alors que sa clé de VERSION l'était.
 *
 * Conséquence : passer sur la France régénérait des factures en euros et les
 * écrivait par-dessus celles du Cameroun ; revenir au Cameroun relisait cette
 * même clé et affichait des euros dans une école de Yaoundé. Un demi-suffixe ne
 * cloisonne rien — il déplace juste le mélange.
 */
function cleFacturation() { return demoKey('mapo_facturation') }

function montantsPays(ligne) {
  return { ...ligne, amount: montantDemo(ligne.amount, packPays(paysDemo())) }
}

const DEMO_KEY = 'mapo_demo_facturation'
const DEMO_VERSION_KEY = 'mapo_demo_facturation_version'
const RELANCES_KEY = 'mapo_relances' // suivi des relances impayés : { [eleveId]: ISODate }
const DEMO_VERSION = 7

// Types de frais courants
export const FEE_TYPES = [
  { value: 'inscription', label: 'Frais d\'inscription' },
  { value: 'scolarite', label: 'Frais de scolarité' },
  { value: 'examen', label: 'Frais d\'examen' },
  { value: 'ape', label: 'Frais APE (Association Parents)' },
  { value: 'tenue', label: 'Tenue scolaire' },
  { value: 'transport', label: 'Transport' },
  { value: 'cantine', label: 'Cantine' },
  { value: 'autre', label: 'Autre' },
]

export const PAYMENT_METHODS = [
  { value: 'especes', label: 'Espèces' },
  { value: 'mobile_money', label: 'Mobile Money' },
  { value: 'virement', label: 'Virement bancaire' },
  { value: 'cheque', label: 'Chèque' },
]

export const PAYMENT_STATUS = {
  PAID: 'payé',
  PARTIAL: 'partiel',
  UNPAID: 'impayé',
}

export const useFacturationStore = defineStore('facturation', () => {
  const authStore = useAuthStore()

  // ── State ──
  const feeStructure = ref([])   // Grille tarifaire : [{ id, feeType, label, level, amount }]
  const payments = ref([])       // Paiements : [{ id, eleveId, feeId, amount, method, date, reference, note }]
  const echeances = ref([])      // Échéances : [{ id, label, dueDate, percent }]
  const salaryPayments = ref([]) // Paiements salaires : [{ id, staffId, month, amount, method, date, reference }]
  const charges = ref([])        // Charges fixes : [{ id, label, category, amount, frequency }]
  const loading = ref(false)
  const setupDone = ref(false)
  // Suivi des relances de paiement (par élève) — évite de relancer 2× la même famille.
  const relances = ref((() => { try { return JSON.parse(localStorage.getItem(RELANCES_KEY)) || {} } catch { return {} } })())

  function getLastRelance(eleveId) { return relances.value[eleveId] || null }
  function recordRelance(eleveId, at) {
    relances.value = { ...relances.value, [eleveId]: at || new Date().toISOString() }
    try { localStorage.setItem(RELANCES_KEY, JSON.stringify(relances.value)) } catch { /* silencieux */ }
  }

  // ── Computed ──

  // Total des frais pour un niveau donné
  function getFeesForLevel(level) {
    return feeStructure.value.filter(f => f.level === level || f.level === 'all')
  }

  function getTotalFeesForLevel(level) {
    return getFeesForLevel(level).reduce((sum, f) => sum + (f.amount || 0), 0)
  }

  // Paiements d'un élève
  function getElevePayments(eleveId) {
    return payments.value.filter(p => p.eleveId === eleveId)
  }

  function getEleveTotalPaid(eleveId) {
    return getElevePayments(eleveId).reduce((sum, p) => sum + (p.amount || 0), 0)
  }

  function getElevePaymentStatus(eleveId, level) {
    const totalDue = getTotalFeesForLevel(level)
    const totalPaid = getEleveTotalPaid(eleveId)
    if (totalDue === 0) return PAYMENT_STATUS.PAID
    if (totalPaid >= totalDue) return PAYMENT_STATUS.PAID
    if (totalPaid > 0) return PAYMENT_STATUS.PARTIAL
    return PAYMENT_STATUS.UNPAID
  }

  function getEleveBalance(eleveId, level) {
    return getTotalFeesForLevel(level) - getEleveTotalPaid(eleveId)
  }

  /**
   * Élèves EN RETARD DE PAIEMENT — la définition, une seule fois.
   *
   * ⚠️ Il y en avait deux, et elles ne pouvaient pas coïncider :
   *   - le tableau de bord comptait les élèves ayant payé ZÉRO (`unpaidCount`) ;
   *   - le modal de relance listait tous ceux dont le SOLDE restait positif.
   * Le directeur lisait donc « 48 familles en retard », cliquait, et tombait sur
   * une liste plus longue. Un compteur qui n'ouvre pas sur ce qu'il annonce
   * abîme la confiance dans tous les autres chiffres de l'écran.
   *
   * La bonne définition est celle du solde : une famille qui a payé la moitié
   * doit encore l'autre moitié, elle est bien en retard.
   *
   * ⚠️ `due > 0` n'est pas décoratif : tant que l'école n'a pas configuré ses
   * frais, `due` vaut 0 et TOUS les élèves basculaient dans « impayés ». Rien
   * n'est dû, donc personne n'est en retard — un zéro n'est pas une dette.
   */
  const elevesEnRetard = computed(() => {
    const classesStore = useClassesStore()
    const elevesStore = useElevesStore()
    const out = []
    for (const eleve of elevesStore.eleves) {
      if (eleve.status !== 'inscrit') continue
      const cls = classesStore.classes.find(c => c.name === eleve.className)
      if (!cls) continue
      const due = getTotalFeesForLevel(cls.level)
      if (!(due > 0)) continue
      const paid = getEleveTotalPaid(eleve.id)
      const balance = due - paid
      if (balance <= 0) continue
      out.push({ eleve, due, paid, balance, level: cls.level })
    }
    return out.sort((a, b) => b.balance - a.balance)
  })

  /** Nombre de familles en retard — le MÊME que la liste ci-dessus. */
  const retardCount = computed(() => elevesEnRetard.value.length)

  // Stats globales
  const globalStats = computed(() => {
    const classesStore = useClassesStore()
    const elevesStore = useElevesStore()
    const inscrits = elevesStore.eleves.filter(e => e.status === 'inscrit')

    let totalExpected = 0
    let totalCollected = 0
    let paidCount = 0
    let partialCount = 0
    let unpaidCount = 0

    for (const eleve of inscrits) {
      const cls = classesStore.classes.find(c => c.name === eleve.className)
      if (!cls) continue
      const due = getTotalFeesForLevel(cls.level)
      const paid = getEleveTotalPaid(eleve.id)
      totalExpected += due
      totalCollected += Math.min(paid, due)

      if (paid >= due && due > 0) paidCount++
      else if (paid > 0) partialCount++
      else unpaidCount++
    }

    return {
      totalExpected,
      totalCollected,
      totalOutstanding: totalExpected - totalCollected,
      collectionRate: totalExpected > 0 ? Math.round((totalCollected / totalExpected) * 100) : 0,
      paidCount,
      partialCount,
      unpaidCount,
      // Familles en retard : solde restant dû. À ne pas confondre avec
      // `unpaidCount`, qui ne compte que celles n'ayant RIEN payé.
      retardCount: elevesEnRetard.value.length,
      totalEleves: inscrits.length,
    }
  })

  // ── Actions ──

  function addFee(fee) {
    const id = 'fee-' + Date.now()
    feeStructure.value.push({ id, ...fee })
    saveAll()
    return id
  }

  function updateFee(id, data) {
    const idx = feeStructure.value.findIndex(f => f.id === id)
    if (idx >= 0) {
      feeStructure.value[idx] = { ...feeStructure.value[idx], ...data }
      saveAll()
    }
  }

  function deleteFee(id) {
    feeStructure.value = feeStructure.value.filter(f => f.id !== id)
    saveAll()
  }

  function addPayment(payment) {
    const id = 'pay-' + Date.now()
    payments.value.unshift({ id, date: new Date().toISOString(), ...payment })
    saveAll()
    logPaymentActivity(payment)
    return id
  }

  function deletePayment(id) {
    payments.value = payments.value.filter(p => p.id !== id)
    saveAll()
  }

  async function logPaymentActivity(payment) {
    try {
      const { useActivityStore } = await import('./activity')
      const elevesStore = useElevesStore()
      const eleve = elevesStore.eleves.find(e => e.id === payment.eleveId)
      const name = eleve ? `${eleve.lastName} ${eleve.firstName}` : payment.eleveId
      const actStore = useActivityStore()
      actStore.log('payment', `Paiement de ${payment.amount?.toLocaleString()} XAF reçu de ${name}`)
    } catch {}
  }

  // Échéances
  function addEcheance(ech) {
    const id = 'ech-' + Date.now()
    echeances.value.push({ id, ...ech })
    echeances.value.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
    saveAll()
    return id
  }

  function updateEcheance(id, data) {
    const idx = echeances.value.findIndex(e => e.id === id)
    if (idx !== -1) {
      echeances.value[idx] = { ...echeances.value[idx], ...data }
      echeances.value.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
      saveAll()
    }
  }

  function deleteEcheance(id) {
    echeances.value = echeances.value.filter(e => e.id !== id)
    saveAll()
  }

  // Salary payments
  function getSalaryPayments(staffId, month) {
    return salaryPayments.value.filter(p => p.staffId === staffId && p.month === month)
  }

  function addSalaryPayment(payment) {
    const id = 'sal-' + Date.now()
    salaryPayments.value.unshift({ id, date: new Date().toISOString(), ...payment })
    saveAll()
    logSalaryActivity(payment)
    return id
  }

  async function logSalaryActivity(payment) {
    try {
      const { useActivityStore } = await import('./activity')
      const { usePersonnelStore } = await import('./personnel')
      const personnelStore = usePersonnelStore()
      const staff = personnelStore.staff.find(s => s.id === payment.staffId)
      const name = staff ? `${staff.lastName} ${staff.firstName}` : payment.staffId
      const actStore = useActivityStore()
      actStore.log('payment', `Salaire de ${payment.amount?.toLocaleString()} XAF versé à ${name}`)
    } catch {}
  }

  // Charges fixes
  function addCharge(charge) {
    const id = 'chg-' + Date.now()
    charges.value.push({ id, ...charge })
    saveAll()
    return id
  }

  function updateCharge(id, data) {
    const idx = charges.value.findIndex(c => c.id === id)
    if (idx >= 0) {
      charges.value[idx] = { ...charges.value[idx], ...data }
      saveAll()
    }
  }

  function deleteCharge(id) {
    charges.value = charges.value.filter(c => c.id !== id)
    saveAll()
  }

  // Synthèse financière
  const financialSynthesis = computed(() => {
    let personnelStore
    try { personnelStore = usePersonnelStore() } catch { personnelStore = { staff: [] } }

    // Recettes
    const recettesScolarite = globalStats.value.totalCollected
    const recettesPrevisionnelles = globalStats.value.totalExpected

    // Charges salariales annuelles
    const masseSalarialeMensuelle = (personnelStore.staff || []).reduce((s, m) => s + (m.salary || 0), 0)
    const masseSalarialeAnnuelle = masseSalarialeMensuelle * 12

    // Charges fixes
    const chargesMensuellesDirectes = charges.value
      .filter(c => c.frequency === 'mensuel')
      .reduce((s, c) => s + (c.amount || 0), 0)
    const chargesTrimestriellesDirectes = charges.value
      .filter(c => c.frequency === 'trimestriel')
      .reduce((s, c) => s + (c.amount || 0), 0)
    const chargesAnnuellesDirectes = charges.value
      .filter(c => c.frequency === 'annuel')
      .reduce((s, c) => s + (c.amount || 0), 0)
    const chargesFixesMensuelles = chargesMensuellesDirectes + (chargesTrimestriellesDirectes / 3) + (chargesAnnuellesDirectes / 12)
    const totalChargesFixesAnnuel = Math.round(chargesFixesMensuelles * 12)

    // Total des salaires effectivement versés
    const totalSalairesVerses = salaryPayments.value.reduce((s, p) => s + (p.amount || 0), 0)
    const totalChargesPayees = totalSalairesVerses + totalChargesFixesAnnuel

    // Résultat
    const resultatActuel = recettesScolarite - totalChargesPayees
    const resultatPrevisionnel = recettesPrevisionnelles - masseSalarialeAnnuelle - totalChargesFixesAnnuel

    return {
      recettesScolarite,
      recettesPrevisionnelles,
      masseSalarialeMensuelle,
      masseSalarialeAnnuelle,
      totalSalairesVerses,
      totalChargesFixesAnnuel,
      chargesFixesMensuelles,
      totalDepenses: totalChargesPayees,
      resultatActuel,
      resultatPrevisionnel,
    }
  })

  function completeSetup() {
    setupDone.value = true
    saveAll()
  }

  // ── Persistence ──

  async function saveAll() {
    const data = {
      feeStructure: feeStructure.value,
      payments: payments.value,
      echeances: echeances.value,
      salaryPayments: salaryPayments.value,
      charges: charges.value,
      setupDone: setupDone.value,
    }

    if (authStore.isDemo) {
      localStorage.setItem(demoKey(DEMO_KEY), JSON.stringify(data))
      return
    }

    try {
      if (authStore.schoolId) {
        const docRef = doc(db, 'schools', authStore.schoolId, 'facturation', 'data')
        await setDoc(docRef, data, { merge: true })
      }
      localStorage.setItem(cleFacturation(), JSON.stringify(data))
    } catch {
      localStorage.setItem(cleFacturation(), JSON.stringify(data))
    }
  }

  async function loadFacturation() {
    loading.value = true
    try {
      if (authStore.isDemo) {
        const storedVersion = parseInt(localStorage.getItem(demoKey(DEMO_VERSION_KEY)) || '0')
        if (storedVersion >= DEMO_VERSION) {
          const stored = localStorage.getItem(demoKey(DEMO_KEY))
          if (stored) {
            const data = JSON.parse(stored)
            feeStructure.value = data.feeStructure || []
            payments.value = data.payments || []
            echeances.value = data.echeances || []
            salaryPayments.value = data.salaryPayments || []
            charges.value = data.charges || []
            setupDone.value = data.setupDone || false
            loading.value = false
            return
          }
        }
        // Generate demo data
        generateDemoData()
        localStorage.setItem(demoKey(DEMO_VERSION_KEY), DEMO_VERSION.toString())
        saveAll()
        loading.value = false
        return
      }

      if (authStore.schoolId) {
        const docRef = doc(db, 'schools', authStore.schoolId, 'facturation', 'data')
        const docSnap = await getDoc(docRef)
        if (docSnap.exists()) {
          const data = docSnap.data()
          feeStructure.value = data.feeStructure || []
          payments.value = data.payments || []
          echeances.value = data.echeances || []
          salaryPayments.value = data.salaryPayments || []
          setupDone.value = data.setupDone || false
        } else {
          const stored = localStorage.getItem(cleFacturation())
          if (stored) {
            const data = JSON.parse(stored)
            feeStructure.value = data.feeStructure || []
            payments.value = data.payments || []
            echeances.value = data.echeances || []
            salaryPayments.value = data.salaryPayments || []
            charges.value = data.charges || []
            setupDone.value = data.setupDone || false
          }
        }
      }
    } catch {
      const stored = localStorage.getItem(cleFacturation())
      if (stored) {
        const data = JSON.parse(stored)
        feeStructure.value = data.feeStructure || []
        payments.value = data.payments || []
        echeances.value = data.echeances || []
        salaryPayments.value = data.salaryPayments || []
        setupDone.value = data.setupDone || false
      }
    }
    loading.value = false
  }

  function generateDemoData() {
    const classesStore = useClassesStore()
    const elevesStore = useElevesStore()

    // Grille tarifaire réaliste (école privée Cameroun)
    feeStructure.value = [
      ...[
      { id: 'fee-1', feeType: 'inscription', label: 'Frais d\'inscription', level: 'all', amount: 25000 },
      { id: 'fee-2', feeType: 'scolarite', label: 'Scolarité - Collège', level: '6e', amount: 150000 },
      { id: 'fee-3', feeType: 'scolarite', label: 'Scolarité - Collège', level: '5e', amount: 150000 },
      { id: 'fee-4', feeType: 'scolarite', label: 'Scolarité - Collège', level: '4e', amount: 160000 },
      { id: 'fee-5', feeType: 'scolarite', label: 'Scolarité - Collège', level: '3e', amount: 175000 },
      { id: 'fee-6', feeType: 'scolarite', label: 'Scolarité - Lycée', level: '2nde', amount: 200000 },
      { id: 'fee-7', feeType: 'scolarite', label: 'Scolarité - Lycée', level: '1ere', amount: 200000 },
      { id: 'fee-8', feeType: 'scolarite', label: 'Scolarité - Lycée', level: 'Tle', amount: 225000 },
      { id: 'fee-9', feeType: 'ape', label: 'Frais APE', level: 'all', amount: 10000 },
      ].map(montantsPays),
      { id: 'fee-10', feeType: 'examen', label: 'Frais d\'examen', level: 'all', amount: 5000 },
    ]

    // Générer des paiements démo pour les 6 premières classes
    const demoPayments = []
    const methods = ['especes', 'mobile_money', 'virement', 'especes', 'mobile_money']
    const inscrits = elevesStore.eleves.filter(e => e.status === 'inscrit')
    let payId = 1

    for (const eleve of inscrits) {
      const cls = classesStore.classes.find(c => c.name === eleve.className)
      if (!cls) continue

      const totalDue = getTotalFeesForLevel(cls.level)
      const rand = Math.random()

      // 60% ont payé la totalité, 25% partiel, 15% impayé
      let amountPaid = 0
      if (rand < 0.60) {
        amountPaid = totalDue
      } else if (rand < 0.85) {
        // Paiement partiel : 30-80% du total
        amountPaid = Math.round(totalDue * (0.3 + Math.random() * 0.5))
      }
      // else: impayé = 0

      if (amountPaid > 0) {
        // Split en 1-3 versements
        const nbVersements = amountPaid === totalDue ? (Math.random() < 0.5 ? 1 : 2) : (Math.random() < 0.6 ? 1 : 2)
        let remaining = amountPaid

        for (let v = 0; v < nbVersements; v++) {
          const isLast = v === nbVersements - 1
          const versement = isLast ? remaining : Math.round(remaining * (0.4 + Math.random() * 0.3))
          remaining -= versement

          const month = 8 + v * 2 + Math.floor(Math.random() * 2) // Sept à Fév
          const day = 1 + Math.floor(Math.random() * 28)
          const dateStr = `2025-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}T10:00:00.000Z`

          const agents = ['Teussop Michel', 'Nkoulou Marie', 'Essomba Pierre']
          const tranches = ['Acompte à l\'inscription', '2e tranche (janvier)', '3e tranche (avril)', 'Paiement intégral']
          const tranche = nbVersements === 1 && amountPaid === totalDue
            ? 'Paiement intégral'
            : (v < tranches.length - 1 ? tranches[v] : `Versement ${v + 1}`)
          demoPayments.push({
            id: `pay-${payId++}`,
            eleveId: eleve.id,
            amount: versement,
            method: methods[Math.floor(Math.random() * methods.length)],
            date: dateStr,
            reference: `REC-${String(payId).padStart(5, '0')}`,
            tranche,
            note: v === 0 ? 'Premier versement' : `Versement ${v + 1}`,
            recordedBy: agents[Math.floor(Math.random() * agents.length)],
          })
        }
      }
    }

    // === Forcer les paiements des enfants du parent démo ===
    // Trouver les enfants du parent démo
    const parentChildren = inscrits.filter(e => e.parentEmail === 'parent@demo')
    if (parentChildren.length >= 2) {
      // Enfant 1 (6eme A) : payé intégralement
      const child1 = parentChildren[0]
      const cls1 = classesStore.classes.find(c => c.name === child1.className)
      if (cls1) {
        // Supprimer les paiements générés aléatoirement pour cet enfant
        const otherPayments = demoPayments.filter(p => p.eleveId !== child1.id && p.eleveId !== parentChildren[1]?.id)
        const totalDue1 = getTotalFeesForLevel(cls1.level)
        otherPayments.push({
          id: `pay-parent-1a`, eleveId: child1.id, amount: Math.round(totalDue1 * 0.5),
          method: 'mobile_money', date: '2025-09-15T10:00:00.000Z',
          reference: 'REC-P001', tranche: 'Acompte à l\'inscription', note: 'Premier versement', recordedBy: 'Teussop Michel',
        })
        otherPayments.push({
          id: `pay-parent-1b`, eleveId: child1.id, amount: totalDue1 - Math.round(totalDue1 * 0.5),
          method: 'especes', date: '2026-01-10T10:00:00.000Z',
          reference: 'REC-P002', tranche: '2e tranche (janvier)', note: 'Solde complet', recordedBy: 'Nkoulou Marie',
        })
        // Enfant 2 (3eme B) : paiement partiel (retard)
        const child2 = parentChildren[1]
        const cls2 = classesStore.classes.find(c => c.name === child2.className)
        if (cls2) {
          const totalDue2 = getTotalFeesForLevel(cls2.level)
          otherPayments.push({
            id: `pay-parent-2a`, eleveId: child2.id, amount: Math.round(totalDue2 * 0.4),
            method: 'mobile_money', date: '2025-09-20T10:00:00.000Z',
            reference: 'REC-P003', tranche: 'Acompte à l\'inscription', note: 'Premier versement', recordedBy: 'Teussop Michel',
          })
          // Reste impayé → retard de paiement
        }
        demoPayments.length = 0
        demoPayments.push(...otherPayments)
      }
    }

    // Trier par date décroissante
    demoPayments.sort((a, b) => new Date(b.date) - new Date(a.date))
    payments.value = demoPayments

    // Échéances démo
    echeances.value = [
      { id: 'ech-1', label: 'Acompte à l\'inscription', dueDate: '2025-09-01', percent: 40 },
      { id: 'ech-2', label: '2e tranche (janvier)', dueDate: '2026-01-05', percent: 35 },
      { id: 'ech-3', label: '3e tranche (avril)', dueDate: '2026-04-01', percent: 25 },
    ]

    // Charges fixes démo
    charges.value = [
      ...[
      { id: 'chg-1', label: 'Loyer locaux', category: 'immobilier', amount: 500000, frequency: 'mensuel' },
      { id: 'chg-2', label: 'Électricité', category: 'energie', amount: 120000, frequency: 'mensuel' },
      { id: 'chg-3', label: 'Eau', category: 'energie', amount: 45000, frequency: 'mensuel' },
      { id: 'chg-4', label: 'Internet et téléphone', category: 'telecom', amount: 35000, frequency: 'mensuel' },
      { id: 'chg-5', label: 'Assurance établissement', category: 'assurance', amount: 800000, frequency: 'annuel' },
      { id: 'chg-6', label: 'Fournitures bureau', category: 'fournitures', amount: 75000, frequency: 'trimestriel' },
      { id: 'chg-7', label: 'Entretien et réparations', category: 'maintenance', amount: 100000, frequency: 'trimestriel' },
      { id: 'chg-8', label: 'Produits d\'entretien', category: 'fournitures', amount: 40000, frequency: 'mensuel' },
      ].map(montantsPays),
    ]

    // Salaires démo pour les mois passés (sept 2025 → mars 2026)
    let personnelStore
    try { personnelStore = usePersonnelStore() } catch { personnelStore = { staff: [] } }
    const DEMO_SALARIES = {
      'Directeur': 350000, 'Censeur': 280000, 'Surveillant Général': 250000,
      'Professeur Principal': 220000, 'Professeur': 180000, 'Comptable': 200000,
      'Secrétaire': 150000, 'Intendant': 160000, 'Agent de sécurité': 80000,
      "Agent d'entretien": 75000, 'Chauffeur': 85000, 'Cuisinier': 75000,
    }
    const demoSalary = []
    const salMonths = ['2025-09', '2025-10', '2025-11', '2025-12', '2026-01', '2026-02', '2026-03']
    let salId = 1
    for (const month of salMonths) {
      const staffList = personnelStore.staff.length > 0 ? personnelStore.staff : []
      for (const s of staffList) {
        // `s.salary` est déjà à l'échelle du pays (personnel.js). Le repli, lui,
        // ne l'était pas : il aurait réintroduit des francs CFA en euros.
        const pack = packPays(paysDemo())
        const salary = s.salary || montantDemo(DEMO_SALARIES[s.role] || 150000, pack, { min: pack.salaireMin })
        // 95% payés sur les mois passés, sauf mars (mois en cours) 70%
        const isPaid = month === '2026-03' ? Math.random() < 0.7 : Math.random() < 0.95
        if (isPaid) {
          const [y, m] = month.split('-')
          demoSalary.push({
            id: `sal-${salId++}`,
            staffId: s.id,
            month,
            amount: salary,
            method: 'virement',
            date: `${y}-${m}-28T10:00:00.000Z`,
            reference: `SAL-${month.replace('-', '')}-${String(salId).padStart(3, '0')}`,
          })
        }
      }
    }
    salaryPayments.value = demoSalary

    setupDone.value = true
  }

  return {
    feeStructure, payments, echeances, salaryPayments, charges, loading, setupDone,
    getFeesForLevel, getTotalFeesForLevel,
    getElevePayments, getEleveTotalPaid, getElevePaymentStatus, getEleveBalance,
    globalStats, financialSynthesis, elevesEnRetard, retardCount,
    addFee, updateFee, deleteFee,
    addPayment, deletePayment,
    addEcheance, updateEcheance, deleteEcheance,
    getSalaryPayments, addSalaryPayment,
    addCharge, updateCharge, deleteCharge,
    relances, getLastRelance, recordRelance,
    completeSetup, loadFacturation, saveAll,
  }
})
