/**
 * mapo-bridge.js
 * ==============
 * Module d'intégration MAPO → NOVA
 *
 * Permet à NOVA de rechercher et importer les données d'une école
 * déjà enregistrée sur MAPO, pour auto-remplir le formulaire ADN.
 *
 * Utilisation dans NOVA (vanilla JS + Firebase compat CDN) :
 *
 *   <script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js"></script>
 *   <script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore-compat.js"></script>
 *   <script src="mapo-bridge.js"></script>
 *
 *   // Ensuite dans votre code :
 *   const results = await MapoBridge.searchSchool("EDUFREM");
 *   if (results.length > 0) {
 *     MapoBridge.fillAdnForm(results[0]);
 *   }
 */

(function (global) {
  'use strict';

  // ── Configuration Firebase MAPO (lecture seule) ──
  const MAPO_FIREBASE_CONFIG = {
    apiKey: "AIzaSyDgX93HmpPglyGGfTcQr7_soQpvHWBU-L0",
    authDomain: "mapo-edufrem.firebaseapp.com",
    projectId: "mapo-edufrem",
    storageBucket: "mapo-edufrem.firebasestorage.app",
    messagingSenderId: "88266665819",
    appId: "1:88266665819:web:5dd91be9-0409-4085-b9bc-b15c839e026a"
  };

  let mapoApp = null;
  let mapoDb = null;

  /**
   * Initialise la connexion secondaire à Firebase MAPO.
   * Ne fait rien si déjà initialisé.
   */
  function init() {
    if (mapoApp) return;

    // Vérifier que Firebase compat est chargé
    if (typeof firebase === 'undefined') {
      console.error('[MapoBridge] Firebase compat SDK non chargé. Ajoutez les scripts firebase-app-compat et firebase-firestore-compat.');
      return;
    }

    try {
      // Initialiser comme app secondaire (NOVA a déjà sa propre app Firebase)
      mapoApp = firebase.initializeApp(MAPO_FIREBASE_CONFIG, 'mapo-reader');
      mapoDb = mapoApp.firestore();
      console.log('[MapoBridge] Connexion MAPO initialisée');
    } catch (err) {
      // Si déjà initialisé (rechargement hot)
      if (err.code === 'app/duplicate-app') {
        mapoApp = firebase.app('mapo-reader');
        mapoDb = mapoApp.firestore();
      } else {
        console.error('[MapoBridge] Erreur initialisation:', err);
      }
    }
  }

  /**
   * Recherche une école par nom dans la collection school_directory de MAPO.
   *
   * @param {string} query - Nom ou sigle de l'école à rechercher
   * @returns {Promise<Array>} - Liste des écoles correspondantes
   */
  async function searchSchool(query) {
    init();
    if (!mapoDb) return [];

    const results = [];
    const q = (query || '').toLowerCase().trim();
    if (!q) return [];

    try {
      // Stratégie 1 : recherche par slug exact
      const slug = slugify(query);
      if (slug) {
        const exactDoc = await mapoDb.collection('school_directory').doc(slug).get();
        if (exactDoc.exists) {
          results.push({ id: exactDoc.id, ...exactDoc.data() });
        }
      }

      // Stratégie 2 : scan et filtre côté client (pour recherche partielle)
      // Firestore ne supporte pas LIKE/contains, donc on charge tout et filtre
      // C'est acceptable car school_directory contient peu de documents
      if (results.length === 0) {
        const snapshot = await mapoDb.collection('school_directory').get();
        snapshot.forEach(function (doc) {
          const data = doc.data();
          const nom = (data.identite?.nom || '').toLowerCase();
          const sigle = (data.identite?.sigle || '').toLowerCase();
          const ville = (data.identite?.ville || '').toLowerCase();

          if (nom.includes(q) || sigle.includes(q) || q.includes(sigle)) {
            results.push({ id: doc.id, ...data });
          }
        });
      }
    } catch (err) {
      console.error('[MapoBridge] Erreur recherche:', err);
    }

    return results;
  }

  /**
   * Slugify identique à celui de MAPO (pour la recherche par slug exact)
   */
  function slugify(name) {
    return (name || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  /**
   * Auto-remplit le formulaire ADN de NOVA avec les données d'un profil MAPO.
   * Utilise les IDs de champs standard du formulaire NOVA.
   *
   * @param {Object} profile - Profil école retourné par searchSchool()
   */
  function fillAdnForm(profile) {
    if (!profile) return;

    const id = profile.identite || {};
    const eff = profile.effectifs || {};
    const infra = profile.infrastructure || {};
    const fin = profile.finances || {};
    const res = profile.resultats || {};

    // ── Tab 1 : Identité ──
    setField('nom', id.nom);
    setField('sigle', id.sigle);
    setSelect('typeEtablissement', id.typeEtablissement);
    setField('anneeCreation', id.anneeCreation);
    setField('pays', id.pays);
    setField('region', id.region);
    setField('ville', id.ville);
    setField('quartier', id.quartier);
    setField('adresse', id.adresseBP);
    setSelect('typeZone', id.typeZone);
    setField('telephone', id.telephone);
    setField('email', id.email);

    // Niveaux offerts (checkboxes)
    if (id.niveauxOfferts) {
      for (var level in id.niveauxOfferts) {
        if (id.niveauxOfferts[level]) {
          setCheckbox('niveau_' + level, true);
        }
      }
    }

    // Langues (checkboxes)
    if (id.langues && id.langues.length > 0) {
      id.langues.forEach(function (l) {
        var val = l.toLowerCase() === 'français' ? 'francais' : l.toLowerCase();
        setCheckbox('langue_' + val, true);
      });
    }

    // Système (francophone / anglophone / bilingue).
    // Deux noms acceptés : MAPO publie `systeme` depuis le 06/09/2026, mais les
    // documents écrits avant ne portent que `sousSysteme`. Lire les deux évite
    // de vider le champ pour une école dont le profil n'a pas été republié.
    setSelect('sousSysteme', id.systeme || id.sousSysteme);

    // Filières
    if (id.filieres && id.filieres.length > 0) {
      setField('filieres', id.filieres.join(', '));
    }

    // ── Tab 2 : Effectifs ──
    var eleves = eff.eleves || {};
    setField('totalEleves', eleves.total);
    setField('filles', eleves.filles);
    setField('garcons', eleves.garcons);
    setField('handicap', eleves.handicap);
    setField('redoublants', eleves.redoublants);
    setField('boursiers', eleves.boursiers);
    setField('orphelins', eleves.orphelins);
    setField('ageMoyen', eleves.ageMoyen);

    var ens = eff.enseignants || {};
    setField('totalEnseignants', ens.total);
    setField('enseignantsFemmes', ens.femmes);
    setField('enseignantsQualifies', ens.qualifies);
    setField('vacataires', ens.vacataires);
    setField('experienceMoyenne', ens.experienceMoyenne);
    setField('enseignantsPartis', ens.partis);

    var adm = eff.admin || {};
    setField('personnelAdmin', adm.administratif);
    setField('personnelAppui', adm.appui);
    setField('conseillerOrientation', adm.conseillerOrientation);
    setField('personnelSante', adm.personnelSante);

    // ── Tab 3 : Infrastructure ──
    setField('sallesClasse', infra.sallesClasse);
    setField('placesAssises', infra.placesAssises);

    // ── Tab 4 : Finances & Résultats ──
    setField('fraisScolarite', fin.fraisScolarite);
    setField('montantAttendu', fin.montantAttendu);
    setField('montantRecouvre', fin.montantRecouvre);

    setField('inscritsDebutAnnee', res.inscritsDebutAnnee);
    setField('abandons', res.abandons);

    // Notification visuelle
    showImportNotice(id.nom, profile.academicYear);
  }

  // ── Helpers DOM ──

  function setField(fieldId, value) {
    if (value === null || value === undefined || value === '') return;
    // Chercher par id, puis par name, puis par data-field
    var el = document.getElementById(fieldId)
      || document.querySelector('[name="' + fieldId + '"]')
      || document.querySelector('[data-field="' + fieldId + '"]');
    if (el) {
      el.value = value;
      // Déclencher les événements pour que les frameworks JS détectent le changement
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      // Marquer visuellement le champ comme auto-rempli
      el.classList.add('mapo-autofilled');
    }
  }

  function setSelect(fieldId, value) {
    if (!value) return;
    var el = document.getElementById(fieldId)
      || document.querySelector('[name="' + fieldId + '"]')
      || document.querySelector('[data-field="' + fieldId + '"]');
    if (el) {
      el.value = value;
      el.dispatchEvent(new Event('change', { bubbles: true }));
      el.classList.add('mapo-autofilled');
    }
  }

  function setCheckbox(fieldId, checked) {
    var el = document.getElementById(fieldId)
      || document.querySelector('[name="' + fieldId + '"]')
      || document.querySelector('[data-field="' + fieldId + '"]');
    if (el && el.type === 'checkbox') {
      el.checked = !!checked;
      el.dispatchEvent(new Event('change', { bubbles: true }));
      if (checked) el.classList.add('mapo-autofilled');
    }
  }

  /**
   * Affiche un bandeau de confirmation après l'import
   */
  function showImportNotice(schoolName, academicYear) {
    // Supprimer un éventuel bandeau précédent
    var existing = document.getElementById('mapo-import-notice');
    if (existing) existing.remove();

    var notice = document.createElement('div');
    notice.id = 'mapo-import-notice';
    notice.style.cssText = 'position:fixed;top:16px;right:16px;z-index:10000;background:#059669;color:#fff;padding:14px 20px;border-radius:10px;font-family:Poppins,sans-serif;font-size:14px;box-shadow:0 4px 20px rgba(0,0,0,.15);max-width:420px;animation:slideIn .3s ease;';
    notice.innerHTML = '<strong>Données importées depuis MAPO</strong><br><span style="opacity:.85;font-size:12px;">'
      + (schoolName || 'École') + (academicYear ? ' — ' + academicYear : '')
      + '<br>Les champs grisés ont été pré-remplis. Vous pouvez les modifier.</span>';

    document.body.appendChild(notice);

    // Fermer automatiquement après 6s
    setTimeout(function () {
      if (notice.parentNode) {
        notice.style.opacity = '0';
        notice.style.transition = 'opacity .3s ease';
        setTimeout(function () { notice.remove(); }, 300);
      }
    }, 6000);
  }

  // ── Styles CSS pour les champs auto-remplis ──
  (function injectStyles() {
    if (document.getElementById('mapo-bridge-styles')) return;
    var style = document.createElement('style');
    style.id = 'mapo-bridge-styles';
    style.textContent = [
      '.mapo-autofilled { background-color: #f0fdf4 !important; border-color: #86efac !important; }',
      '.mapo-autofilled:focus { background-color: #fff !important; border-color: #3b82f6 !important; }',
      '@keyframes slideIn { from { transform: translateX(100px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }',
    ].join('\n');
    document.head.appendChild(style);
  })();

  // ── NOVA → MAPO (sens inverse) ──

  /**
   * Publie les données ADN de NOVA vers la collection nova_directory
   * du projet Firebase NOVA, pour que MAPO puisse les lire.
   *
   * @param {Object} adnData - Les données du formulaire ADN complet
   * @param {string} schoolSlug - Le slug de l'école
   */
  async function publishToNovaDirectory(adnData, schoolSlug) {
    // Utiliser le Firestore NOVA (app par défaut)
    if (typeof firebase === 'undefined') return;

    var novaDb = firebase.firestore(); // app par défaut = NOVA
    if (!novaDb) return;

    try {
      await novaDb.collection('nova_directory').doc(schoolSlug).set({
        source: 'nova',
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        ...adnData
      }, { merge: true });
      console.log('[MapoBridge] ADN publié dans nova_directory/' + schoolSlug);
    } catch (err) {
      console.error('[MapoBridge] Erreur publication NOVA:', err);
    }
  }

  // ── API publique ──
  global.MapoBridge = {
    init: init,
    searchSchool: searchSchool,
    fillAdnForm: fillAdnForm,
    publishToNovaDirectory: publishToNovaDirectory,
    slugify: slugify,
  };

})(window);
