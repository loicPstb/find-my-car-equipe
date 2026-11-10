/* ==========================================================================
   FIND MY CAR — js/db/utilisateurs.repo.js
   --------------------------------------------------------------------------
   Lot : P5 (comptes et sécurité).
   Rôle : table « users », comptes de démonstration, inscription et
   connexion (avec js/auth.js pour le hachage et l'anti force brute).
     - Q : fonctions SQL « pures » (base en paramètre) → testables dans la page tests/.
     - Users : API navigateur (base ouverte par DB) : register, login, getById.
   Contrat : docs/CONTRAT-INTERFACES.md (section P5).
   Dépendances : js/utils.js, js/auth.js (Auth), js/db/core.js (DB).
   ========================================================================== */

(function (global) {
  'use strict';

  var Utils = global.Utils;
  var Auth = global.Auth;

  var SCHEMA = [
    // Le mot de passe n'est JAMAIS stocké en clair : seulement son empreinte et son sel.
    'CREATE TABLE IF NOT EXISTS users (',
    '  id                  INTEGER PRIMARY KEY AUTOINCREMENT,',
    '  name                TEXT    NOT NULL CHECK (length(trim(name)) >= 2),',
    "  email               TEXT    NOT NULL UNIQUE COLLATE NOCASE CHECK (email LIKE '%_@_%._%'),",
    '  password_hash       TEXT    NOT NULL CHECK (length(password_hash) = 64),',  // SHA-256 en hexadécimal
    '  password_salt       TEXT    NOT NULL CHECK (length(password_salt) = 32),',  // 16 octets en hexadécimal
    '  password_iterations INTEGER NOT NULL CHECK (password_iterations >= 100000),',
    "  role                TEXT    NOT NULL DEFAULT 'client' CHECK (role IN ('client','admin')),",
    '  created_at          TEXT    NOT NULL',
    ');'
  ].join('\n');

  /**
   * Comptes de DÉMONSTRATION (fictifs). Empreintes pré-calculées avec
   * Auth.hashPassword pour ne pas ralentir le premier chargement.
   *   client@findmycar.example.com  /  ClientDemo2026!
   *   admin@findmycar.example.com   /  AdminDemo2026!
   */
  var SEED = [
    { name: 'Client Démo', email: 'client@findmycar.example.com', role: 'client',
      password_salt: '79905cca4d3465066cdd0b202b98c554',
      password_hash: '92d51988fe4200b63f4e236a576a87361a9c72c119e6c7cfe22f92166fde2644',
      password_iterations: 600000 },
    { name: 'Admin Démo', email: 'admin@findmycar.example.com', role: 'admin',
      password_salt: 'f21b24dddedab86a38280a12a8495bd5',
      password_hash: '85c9a070e081bfc3c086c9d4654a3be2a270485f7daf29d1cfdb271b6f8dc5a9',
      password_iterations: 600000 }
  ];

  /* ---------------- Requêtes « pures » (base en paramètre) ---------------- */
  var Q = {
    /** Insère un compte dont le mot de passe est DÉJÀ haché. → { ok, errors, user } */
    insertUser: function (db, u) {
      var email = Auth.normalizeEmail(u.email);
      if (Q.getUserByEmail(db, email)) {
        return { ok: false, errors: ['Un compte existe déjà avec cette adresse e-mail.'] };
      }
      var res = Utils.sqlRun(db,
        'INSERT INTO users (name, email, password_hash, password_salt, password_iterations, role, created_at) ' +
        'VALUES (?, ?, ?, ?, ?, ?, ?)',
        [String(u.name).trim(), email, u.password_hash, u.password_salt, u.password_iterations,
          u.role || 'client', new Date().toISOString()]);
      return { ok: true, errors: [], user: Q.getUserById(db, res.lastId) };
    },

    /** Compte complet (avec empreinte) : usage interne pour la connexion. */
    getUserByEmail: function (db, email) {
      return Utils.sqlGet(db, 'SELECT * FROM users WHERE email = ?', [Auth.normalizeEmail(email)]);
    },

    /** Compte SANS les informations de mot de passe (pour l'affichage). */
    getUserById: function (db, id) {
      return Utils.sqlGet(db, 'SELECT id, name, email, role, created_at FROM users WHERE id = ?', [Number(id)]);
    }
  };

  /** Insère les comptes de démonstration (si aucun compte). */
  function seed(db) {
    if (Utils.sqlGet(db, 'SELECT COUNT(*) AS n FROM users').n > 0) return;
    SEED.forEach(function (u) { Q.insertUser(db, u); });
  }

  /* ---------------- API navigateur ---------------- */
  var limiter = Auth.createLoginLimiter(); // anti force brute (en mémoire)
  var DUMMY = SEED[0];                     // pour un temps de réponse identique si l'e-mail est inconnu

  var Users = {
    NAME: 'utilisateurs',
    VERSION: 1,
    SCHEMA: SCHEMA,
    SEED: SEED,
    seed: seed,
    Q: Q,

    getById: function (id) { return Q.getUserById(global.DB.handle(), id); },

    /**
     * Inscription : contrôles, hachage, enregistrement, sauvegarde.
     * @param {{name, email, password, passwordConfirm}} data
     * @returns {Promise<{ok: boolean, errors: {field, message}[], user?: object}>}
     */
    register: function (data) {
      var db = global.DB.handle();
      var errors = Auth.validateRegistration(data);
      if (errors.length === 0 && Q.getUserByEmail(db, data.email)) {
        errors.push({ field: 'email', message: 'Un compte existe déjà avec cette adresse e-mail.' });
      }
      if (errors.length > 0) return Promise.resolve({ ok: false, errors: errors });
      return Auth.hashPassword(data.password).then(function (h) {
        var res = Q.insertUser(db, {
          name: data.name, email: data.email, role: 'client', // jamais admin à l'inscription
          password_hash: h.hash, password_salt: h.salt, password_iterations: h.iterations
        });
        if (!res.ok) return { ok: false, errors: res.errors.map(function (m) { return { field: 'email', message: m }; }) };
        return global.DB.save().then(function () { return { ok: true, errors: [], user: res.user }; });
      });
    },

    /**
     * Connexion. Message volontairement identique que l'e-mail existe ou non.
     * @returns {Promise<{ok: boolean, error?: string, locked?: number, user?: object}>}
     */
    login: function (email, password) {
      var locked = limiter.secondsLocked(email);
      if (locked > 0) {
        return Promise.resolve({ ok: false, locked: locked, error: 'Trop de tentatives échouées. Réessayez dans ' + locked + ' s.' });
      }
      var db = global.DB.handle();
      var user = Q.getUserByEmail(db, email);
      return Auth.verifyPassword(String(password || ''), user || DUMMY).then(function (valid) {
        if (!user || !valid) {
          limiter.recordFailure(email);
          return { ok: false, error: 'E-mail ou mot de passe incorrect.' };
        }
        limiter.reset(email);
        return { ok: true, user: Q.getUserById(db, user.id) };
      });
    }
  };

  global.Users = Users;
  // Enregistrement auprès du moteur de base (si le lot P2 est déjà fusionné)
  if (global.DB) global.DB.register({ name: Users.NAME, version: Users.VERSION, schema: SCHEMA, seed: seed });
})(window);
