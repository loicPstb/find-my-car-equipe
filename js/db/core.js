/* ==========================================================================
   FIND MY CAR — js/db/core.js
   --------------------------------------------------------------------------
   Lot : P2 (base de données).
   Rôle : moteur SQLite partagé par tous les dépôts (js/db/*.repo.js).
     - Charge sql.js (SQLite en WebAssembly).
     - Chaque dépôt s'enregistre avec DB.register({ name, version, schema, seed }).
     - Au démarrage : recharge la base sauvegardée dans IndexedDB, ou crée une
       base neuve (tables de chaque module enregistré + données de démo).
     - « Empreinte » des modules : si un nouveau module a été fusionné (ou si
       la version d'un module change), la base locale est recréée.
     - Sauvegarde : après chaque modification, la base complète est exportée
       et réenregistrée dans IndexedDB.
   Contrat : docs/CONTRAT-INTERFACES.md (section P2).
   Dépendances : lib/sql-wasm.js (initSqlJs), js/utils.js.
   ========================================================================== */

(function (global) {
  'use strict';

  var Utils = global.Utils;

  var IDB_NAME = 'findmycar';
  var IDB_STORE = 'sqlite';
  var IDB_KEY = 'database';
  var META_TABLE = 'CREATE TABLE IF NOT EXISTS fmc_meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);';

  var modules = [];       // modules enregistrés, dans l'ordre de chargement des scripts
  var SQL = null;         // module sql.js
  var db = null;          // base SQLite ouverte
  var persistent = false; // true si IndexedDB fonctionne

  /* ---------------------------- IndexedDB ---------------------------- */

  function openIDB() {
    return new Promise(function (resolve, reject) {
      if (!global.indexedDB) {
        reject(new Error('IndexedDB indisponible dans ce navigateur.'));
        return;
      }
      var req = global.indexedDB.open(IDB_NAME, 1);
      req.onupgradeneeded = function () { req.result.createObjectStore(IDB_STORE); };
      req.onsuccess = function () { resolve(req.result); };
      req.onerror = function () { reject(req.error); };
    });
  }

  /** Exécute une opération dans IndexedDB (lecture / écriture / suppression). */
  function idb(mode, action) {
    return openIDB().then(function (idbDb) {
      return new Promise(function (resolve, reject) {
        var tx = idbDb.transaction(IDB_STORE, mode);
        var store = tx.objectStore(IDB_STORE);
        var req = action(store);
        var result = null;
        if (req) req.onsuccess = function () { result = req.result; };
        tx.oncomplete = function () { idbDb.close(); resolve(result); };
        tx.onerror = function () { reject(tx.error); };
      });
    });
  }

  /* ---------------------------- Base ---------------------------- */

  /** Empreinte des modules : "vehicules@1,utilisateurs@1,…". */
  function fingerprint() {
    return modules.map(function (m) { return m.name + '@' + m.version; }).join(',');
  }

  function storedFingerprint(database) {
    try {
      var row = Utils.sqlGet(database, "SELECT value FROM fmc_meta WHERE key = 'modules'");
      return row ? row.value : null;
    } catch (e) {
      return null; // ancienne base sans table fmc_meta
    }
  }

  /** Crée les tables puis insère les données de démo de chaque module. */
  function buildFreshDatabase() {
    var fresh = new SQL.Database();
    fresh.exec('PRAGMA foreign_keys = ON;');
    fresh.exec(META_TABLE);
    modules.forEach(function (m) { if (m.schema) fresh.exec(m.schema); });
    modules.forEach(function (m) { if (m.seed) m.seed(fresh); });
    Utils.sqlRun(fresh, "INSERT OR REPLACE INTO fmc_meta (key, value) VALUES ('modules', ?)", [fingerprint()]);
    return fresh;
  }

  var DB = {
    /**
     * Enregistre un module de données (appelé par chaque js/db/*.repo.js).
     * @param {{name: string, version?: number, schema: string, seed?: function(db)}} module
     */
    register: function (module) {
      if (!module || !module.name) throw new Error('DB.register : nom de module manquant.');
      modules = modules.filter(function (m) { return m.name !== module.name; });
      modules.push({ name: module.name, version: module.version || 1, schema: module.schema || '', seed: module.seed || null });
    },

    /** Noms des modules enregistrés (utile pour le débogage). */
    modules: function () { return modules.map(function (m) { return m.name; }); },

    /**
     * Démarre la base. Renvoie { restored, persistent, upgraded }.
     * upgraded = true si l'ancienne base locale a dû être recréée.
     */
    init: function () {
      if (typeof global.initSqlJs !== 'function') {
        return Promise.reject(new Error('sql.js introuvable : vérifiez que lib/sql-wasm.js est chargé.'));
      }
      return global.initSqlJs({
        locateFile: function (file) { return 'lib/' + file; } // emplacement du .wasm
      }).then(function (loaded) {
        SQL = loaded;
        return idb('readonly', function (store) { return store.get(IDB_KEY); })
          .then(function (bytes) { persistent = true; return bytes; })
          .catch(function (err) {
            console.warn('[FIND MY CAR] Sauvegarde locale indisponible :', err);
            persistent = false;
            return null;
          });
      }).then(function (bytes) {
        var upgraded = false;
        if (bytes) {
          try {
            var saved = new SQL.Database(new Uint8Array(bytes));
            if (storedFingerprint(saved) === fingerprint()) {
              saved.exec('PRAGMA foreign_keys = ON;');
              db = saved;
              return { restored: true, persistent: persistent, upgraded: false };
            }
            saved.close();
            upgraded = true;
          } catch (e) {
            console.warn('[FIND MY CAR] Base sauvegardée illisible, recréation.', e);
            upgraded = true;
          }
        }
        db = buildFreshDatabase();
        return DB.save().then(function () {
          return { restored: false, persistent: persistent, upgraded: upgraded };
        });
      });
    },

    /** Base sql.js ouverte (pour les fonctions des dépôts). */
    handle: function () {
      if (!db) throw new Error('Base non initialisée : appelez DB.init() d’abord.');
      return db;
    },

    /** Raccourcis de requêtes sur la base ouverte. */
    all: function (sql, params) { return Utils.sqlAll(DB.handle(), sql, params); },
    get: function (sql, params) { return Utils.sqlGet(DB.handle(), sql, params); },
    run: function (sql, params) { return Utils.sqlRun(DB.handle(), sql, params); },

    /** Exporte la base et l'enregistre dans IndexedDB (à appeler après chaque modification). */
    save: function () {
      if (!persistent) return Promise.resolve(false);
      var bytes = DB.handle().export();
      return idb('readwrite', function (store) { store.put(bytes, IDB_KEY); }).then(function () { return true; });
    },

    /** Supprime la sauvegarde et recrée la base de démonstration. */
    reset: function () {
      if (db) db.close();
      db = buildFreshDatabase();
      var p = persistent ? idb('readwrite', function (store) { store.delete(IDB_KEY); }) : Promise.resolve();
      return p.then(function () { return DB.save(); });
    },

    isPersistent: function () { return persistent; }
  };

  global.DB = DB;
})(window);
