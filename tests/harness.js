/* ==========================================================================
   FIND MY CAR — tests/harness.js   (Lot : P1, socle)
   --------------------------------------------------------------------------
   Outils partagés par tous les tests (objet TestApp) :
     - freshDb(repos)  : base SQLite neuve EN MÉMOIRE pour les tests unitaires ;
     - open / reload   : ouvre l'application dans le cadre (iframe) de la page
                         de tests, comme le ferait un utilisateur ;
     - click, setValue, select, text, waitFor, goTab, login, logout… ;
     - reset           : efface les données de démonstration et la session.
   Photos : par défaut ?photos=off (dessins, aucune requête Internet) ;
   open(…, { photos: 'fake' }) affiche de fausses photos avec crédits.
   Contrat : docs/CONTRAT-INTERFACES.md (section « Tests »).
   ========================================================================== */

(function (global) {
  'use strict';

  var SQL = null;
  var frame = null;
  var serial = 0;

  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  /** Supprime la base IndexedDB de l'application (données de démo). */
  function deleteAppDatabase() {
    return new Promise(function (resolve) {
      try {
        var req = global.indexedDB.deleteDatabase('findmycar');
        req.onsuccess = req.onerror = function () { resolve(); };
        req.onblocked = function () { setTimeout(resolve, 300); };
      } catch (e) {
        resolve();
      }
    });
  }

  var TestApp = {
    errors: [],

    /* ------------------------- Tests unitaires ------------------------- */

    /** Base SQLite neuve, en mémoire, avec les tables et données des dépôts donnés (dans l'ordre). */
    freshDb: async function (repos) {
      if (!SQL) SQL = await global.initSqlJs({ locateFile: function (f) { return '../lib/' + f; } });
      var db = new SQL.Database();
      db.exec('PRAGMA foreign_keys = ON;');
      repos.forEach(function (r) { if (r.SCHEMA) db.exec(r.SCHEMA); });
      repos.forEach(function (r) { if (r.seed) r.seed(db); });
      return db;
    },
    loadSql: async function () {
      if (!SQL) SQL = await global.initSqlJs({ locateFile: function (f) { return '../lib/' + f; } });
      return SQL;
    },

    /** Date du jour fixe pour les tests unitaires, et dates relatives pour les tests de l'application. */
    TODAY: '2026-11-10',
    day: function (n) { return Utils.addDays(Utils.todayISO(), n); },
    clean: function (s) { return String(s).replace(/\s/g, ''); }, // ignore les espaces des montants

    /* ------------------------- Application dans le cadre ------------------------- */

    win: function () { return frame.contentWindow; },
    doc: function () { return frame.contentDocument; },
    $: function (sel) { return frame.contentDocument.querySelector(sel); },
    $$: function (sel) { return Array.prototype.slice.call(frame.contentDocument.querySelectorAll(sel)); },
    text: function (sel) {
      var el = TestApp.$(sel);
      if (!el) throw new Error('Élément introuvable : ' + sel);
      return el.textContent;
    },

    /** Attend qu'une condition soit vraie (ou échoue après un délai). */
    waitFor: async function (condition, message, timeoutMs) {
      var limit = Date.now() + (timeoutMs || 15000);
      var last;
      while (Date.now() < limit) {
        try { if (condition()) return; } catch (e) { last = e; }
        await sleep(50);
      }
      throw new Error('Attente trop longue : ' + (message || 'condition') + (last ? ' (' + last.message + ')' : ''));
    },

    /** Efface les données de démonstration et la session (état « premier lancement »). */
    reset: async function () {
      if (frame && frame.contentWindow && frame.src !== 'about:blank') {
        frame.src = 'about:blank';
        await sleep(150);
      }
      try { global.sessionStorage.clear(); } catch (e) { /* rien */ }
      await deleteAppDatabase();
      TestApp.errors = [];
    },

    /**
     * Ouvre l'application dans le cadre.
     * @param {string} [hash] onglet ou ancre (ex. 'contact')
     * @param {{photos?: 'off'|'fake', width?: number}} [options]
     */
    open: async function (hash, options) {
      options = options || {};
      TestApp.setWidth(options.width || 1280);
      var token = ++serial;
      if (frame.contentWindow) frame.contentWindow.__fmcOld = token;
      frame.src = '../index.html?photos=' + (options.photos || 'off') + '&t=' + token + (hash ? '#' + hash : '');
      await TestApp.waitReady(token);
    },

    /** Recharge la page de l'application (comme F5). */
    reload: async function () {
      var token = ++serial;
      frame.contentWindow.__fmcOld = token;
      frame.contentWindow.location.reload();
      await TestApp.waitReady(token);
    },

    /** Attend la fin du démarrage de l'application, puis branche les outils de test. */
    waitReady: async function (token) {
      await TestApp.waitFor(function () {
        var w = frame.contentWindow;
        return w && w.__fmcOld !== token && w.document && w.document.body && w.document.body.dataset.ready;
      }, 'démarrage de l’application', 30000);
      var w = frame.contentWindow;
      w.confirm = function () { return true; }; // accepte les demandes de confirmation
      w.addEventListener('error', function (e) { TestApp.errors.push('JS : ' + e.message); });
      w.addEventListener('unhandledrejection', function (e) { TestApp.errors.push('Promesse : ' + (e.reason && e.reason.message)); });
      var original = w.console.error;
      w.console.error = function () {
        TestApp.errors.push('Console : ' + Array.prototype.join.call(arguments, ' '));
        original.apply(w.console, arguments);
      };
    },

    /** Largeur du cadre = largeur d'écran simulée (smartphone 390, tablette 768, ordinateur 1280). */
    setWidth: function (px) {
      frame.style.width = px + 'px';
    },

    visiblePanel: function () {
      var p = TestApp.$('[data-panel]:not([hidden])');
      return p ? p.dataset.panel : null;
    },

    /** Clique sur un élément. */
    click: function (sel) {
      var el = TestApp.$(sel);
      if (!el) throw new Error('Élément introuvable : ' + sel);
      el.click();
    },

    /** Renseigne un champ et déclenche les événements, comme un utilisateur. */
    setValue: function (sel, value) {
      var el = TestApp.$(sel);
      if (!el) throw new Error('Champ introuvable : ' + sel);
      el.value = value;
      el.dispatchEvent(new frame.contentWindow.Event('input', { bubbles: true }));
      el.dispatchEvent(new frame.contentWindow.Event('change', { bubbles: true }));
    },
    select: function (sel, value) { TestApp.setValue(sel, value); },

    /** Clique sur un onglet de la barre de navigation et attend son affichage. */
    goTab: async function (tab) {
      TestApp.click('a.nav-link[data-tab="' + tab + '"]');
      await TestApp.waitFor(function () { return TestApp.visiblePanel() === tab; }, 'onglet ' + tab);
    },

    /** Connexion par le formulaire (onglet Connexion, lot P6). Renvoie le message d'erreur ou null. */
    login: async function (email, password) {
      await TestApp.goTab('connexion');
      TestApp.setValue('#login-email', email);
      TestApp.setValue('#login-password', password);
      TestApp.click('#login-submit');
      await TestApp.waitFor(function () {
        return !TestApp.$('#login-submit').disabled &&
          (TestApp.$('#auth-guest').hidden || !TestApp.$('#login-message').hidden);
      }, 'réponse à la connexion');
      var msg = TestApp.$('#login-message');
      return msg.hidden ? null : msg.textContent;
    },

    logout: async function () {
      await TestApp.goTab('connexion');
      TestApp.click('#logout-button');
      await TestApp.waitFor(function () { return !TestApp.$('#auth-guest').hidden; }, 'déconnexion');
    },

    /** Branche le cadre (appelé par la page de tests). */
    attach: function (iframe) { frame = iframe; }
  };

  global.TestApp = TestApp;
})(window);
