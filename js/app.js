/* ==========================================================================
   FIND MY CAR — js/app.js
   --------------------------------------------------------------------------
   Lot : P1 (socle).
   Rôle : chef d'orchestre de l'application.
     - Outils d'affichage partagés (objet UI : messages, champs en erreur).
     - Registre des onglets : chaque écran (js/ui/*.js) s'enregistre avec
       App.registerTab(nom, { init, requires }).
     - Démarrage : charge pages/*.html dans les 4 sections, initialise la
       base (si le lot P2 est fusionné), puis chaque onglet dont les
       dépendances sont présentes. Un onglet dont un lot manque affiche
       « en construction » : LE SITE RESTE FONCTIONNEL À CHAQUE FUSION.
     - Navigation par l'adresse (#vehicules, #reservation, #contact, #connexion).
     - Bouton « Réinitialiser les données de démonstration ».
   Contrat d'interface : docs/CONTRAT-INTERFACES.md
   Dépendances : js/utils.js. Les autres modules sont facultatifs.
   ========================================================================== */

(function (global) {
  'use strict';

  /* ------------------------------------------------------------------------
     OUTILS D'AFFICHAGE PARTAGÉS (utilisés par tous les écrans)
     ------------------------------------------------------------------------ */
  var UI = {
    /** Affiche un message (type : success | error | info | warning). Le HTML doit déjà être protégé. */
    showAlert: function (el, type, html) {
      el.className = 'alert alert-' + type;
      el.innerHTML = html;
      el.hidden = false;
      el.setAttribute('tabindex', '-1'); // permet d'y déplacer le focus
    },
    hideAlert: function (el) {
      el.hidden = true;
      el.innerHTML = '';
    },
    /** Marque (ou démarque) un champ comme invalide. */
    setFieldError: function (input, isError) {
      input.classList.toggle('is-invalid', isError);
      input.setAttribute('aria-invalid', isError ? 'true' : 'false');
    },
    clearFieldErrors: function (form) {
      form.querySelectorAll('.is-invalid').forEach(function (input) { UI.setFieldError(input, false); });
    }
  };
  global.UI = UI;

  /* ------------------------------------------------------------------------
     ONGLETS
     ------------------------------------------------------------------------ */
  var TABS = {
    vehicules:   { title: 'Véhicules',      lot: 'P4' },
    reservation: { title: 'Réservation',    lot: 'P7' },
    contact:     { title: 'Nous contacter', lot: 'P8' },
    connexion:   { title: 'Connexion',      lot: 'P6' }
  };
  /** Ordre d'initialisation (connexion avant réservation : la session doit être connue). */
  var INIT_ORDER = ['vehicules', 'connexion', 'reservation', 'contact'];
  var DEFAULT_TAB = 'vehicules';

  /** Lot qui fournit chaque objet global (pour les messages « en attente de… »). */
  var PROVIDERS = {
    DB: 'P2 — base de données', VehiculesRepo: 'P3 — données véhicules', Photos: 'P3 — photos',
    Auth: 'P5 — sécurité', Users: 'P5 — comptes', ReservationsRepo: 'P7 — réservations',
    Account: 'P6 — connexion', Reservations: 'P7 — réservation'
  };

  var registry = {};  // nom d'onglet -> { init, requires, active }
  var ready = false;

  var App = {
    /**
     * Appelé par chaque écran au chargement de son script.
     * @param {string} name  vehicules | reservation | contact | connexion
     * @param {{init: Function, requires?: string[]}} module
     */
    registerTab: function (name, module) {
      registry[name] = { init: module.init, requires: module.requires || [], active: false };
    },

    /** Noms des objets globaux requis qui ne sont pas encore disponibles. */
    missing: function (requires) {
      return (requires || []).filter(function (name) { return !global[name]; });
    },

    /** true si l'onglet est réellement en service (lot fusionné et démarré). */
    isActive: function (name) {
      return !!(registry[name] && registry[name].active);
    },

    /**
     * Affiche un onglet et masque les autres.
     * @param {string} name
     * @param {{focusId?: string, scrollToId?: string}} [options]
     */
    showTab: function (name, options) {
      options = options || {};
      if (!TABS[name]) name = DEFAULT_TAB;
      document.querySelectorAll('[data-panel]').forEach(function (panel) {
        panel.hidden = panel.dataset.panel !== name;
      });
      document.querySelectorAll('.nav-link').forEach(function (link) {
        if (link.dataset.tab === name) link.setAttribute('aria-current', 'page');
        else link.removeAttribute('aria-current');
      });
      document.title = TABS[name].title + ' — FIND MY CAR';
      if (global.location.hash !== '#' + name && !options.scrollToId) {
        history.replaceState(null, '', '#' + name);
      }
      if (options.scrollToId) {
        var target = document.getElementById(options.scrollToId);
        if (target) target.scrollIntoView({ behavior: 'smooth' });
      } else {
        global.scrollTo(0, 0);
      }
      if (options.focusId) {
        var field = document.getElementById(options.focusId);
        if (field) field.focus();
      }
    },

    /** Lit l'adresse (#...) et affiche le bon onglet. */
    route: function () {
      if (!ready) return;
      var hash = decodeURIComponent(global.location.hash.replace('#', ''));
      if (TABS[hash] || hash === '') {
        App.showTab(hash || DEFAULT_TAB);
        return;
      }
      var el = document.getElementById(hash); // lien vers un élément interne (ex. #catalogue)
      var panel = el && el.closest('[data-panel]');
      if (panel) App.showTab(panel.dataset.panel, { scrollToId: hash });
      else App.showTab(DEFAULT_TAB);
    }
  };
  global.App = App;

  /* ------------------------------------------------------------------------
     DÉMARRAGE
     ------------------------------------------------------------------------ */
  function setStatus(type, html) {
    var el = document.getElementById('app-status');
    if (!type) { el.hidden = true; return; }
    el.className = 'app-status app-status-' + type;
    el.innerHTML = html;
    el.hidden = false;
  }

  /** Charge pages/<onglet>.html dans chaque section. */
  function loadPages() {
    return Promise.all(Object.keys(TABS).map(function (name) {
      return fetch('pages/' + name + '.html', { cache: 'no-store' }).then(function (res) {
        if (!res.ok) throw new Error('pages/' + name + '.html : HTTP ' + res.status);
        return res.text();
      }).then(function (html) {
        document.querySelector('[data-panel="' + name + '"]').innerHTML = html;
      });
    }));
  }

  /** Affiche dans l'onglet la liste des lots qui manquent. */
  function showWaiting(name, missing) {
    var lots = missing.map(function (m) { return PROVIDERS[m] || m; });
    var box = document.createElement('div');
    box.className = 'container';
    box.innerHTML = '<div class="alert alert-info waiting-lots"><strong>Onglet en attente.</strong> ' +
      'Il sera actif après la fusion de : ' + lots.map(Utils.escapeHTML).join(', ') + '.</div>';
    document.querySelector('[data-panel="' + name + '"]').prepend(box);
  }

  /** Initialise chaque onglet dont les dépendances sont disponibles. */
  function initTabs(dbOk) {
    INIT_ORDER.forEach(function (name) {
      var mod = registry[name];
      if (!mod) return; // lot pas encore fusionné : la page « en construction » reste affichée
      var missing = App.missing(mod.requires);
      if (!dbOk && mod.requires.indexOf('DB') !== -1 && missing.indexOf('DB') === -1) missing.push('DB');
      if (missing.length > 0) { showWaiting(name, missing); return; }
      try {
        mod.init();
        mod.active = true;
      } catch (err) {
        console.error('[FIND MY CAR] Échec de l’onglet ' + name + ' :', err);
        showWaiting(name, ['initialisation (voir la console F12)']);
      }
    });
  }

  function setupReset() {
    var btn = document.getElementById('reset-demo');
    if (!global.DB) return; // pas de base : rien à réinitialiser
    btn.hidden = false;
    btn.addEventListener('click', function () {
      if (!global.confirm('Supprimer toutes les réservations et tous les comptes créés dans ce navigateur, et revenir aux données de démonstration ?')) return;
      DB.reset().then(function () {
        // Chaque onglet écoute cet événement pour se remettre à jour
        document.dispatchEvent(new CustomEvent('fmc:data-reset'));
        setStatus('success', 'Données de démonstration réinitialisées.');
        setTimeout(function () { setStatus(null); }, 4000);
      });
    });
  }

  function start() {
    global.addEventListener('hashchange', App.route);

    loadPages().then(function () {
      if (!global.DB) return { ok: false, absent: true };
      return DB.init().then(function (info) {
        return { ok: true, info: info };
      }).catch(function (err) {
        console.error('[FIND MY CAR] Base de données indisponible :', err);
        return { ok: false, error: err };
      });
    }).then(function (db) {
      initTabs(db.ok);
      setupReset();
      ready = true;
      App.route();

      if (db.error) {
        setStatus('error', '<strong>Impossible de charger la base de données.</strong> ' +
          'Vérifiez que <code>lib/sql-wasm.js</code> et <code>lib/sql-wasm.wasm</code> sont présents, puis rechargez la page.');
      } else if (db.absent) {
        setStatus('info', 'Socle en place : les onglets s’activeront au fur et à mesure des fusions (voir docs/MODE-OPERATOIRE.md).');
      } else if (db.info.upgraded) {
        setStatus('warning', '<strong>Base de données mise à jour</strong> (nouveaux modules fusionnés). ' +
          'Les données de démonstration de ce navigateur ont été recréées.');
      } else if (!db.info.persistent) {
        setStatus('warning', '<strong>Sauvegarde locale indisponible</strong> (navigation privée ou stockage bloqué). ' +
          'L’application fonctionne, mais les données seront perdues à la fermeture de la page.');
      } else {
        setStatus(null);
      }
      document.body.dataset.ready = 'true'; // repère utilisé par les tests E2E
    }).catch(function (err) {
      console.error('[FIND MY CAR] Échec du démarrage :', err);
      var hint = global.location.protocol === 'file:'
        ? 'La page a été ouverte directement depuis le disque (file://). Lancez l’application avec un serveur local ' +
          '(extension Live Server dans VS Code) — voir README.'
        : 'Un fichier du dossier <code>pages/</code> est introuvable. Vérifiez votre copie du dépôt.';
      setStatus('error', '<strong>Impossible de démarrer l’application.</strong> ' + hint);
      document.body.dataset.ready = 'error';
    });
  }

  document.addEventListener('DOMContentLoaded', start);
})(window);
