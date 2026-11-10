/* ==========================================================================
   FIND MY CAR — js/auth.js
   --------------------------------------------------------------------------
   Lot : P5 (comptes et sécurité).
   Rôle : briques de SÉCURITÉ des comptes utilisateurs.
     - Hachage des mots de passe avec PBKDF2-SHA256 (Web Crypto API),
       sel aléatoire de 16 octets, 600 000 itérations (recommandation OWASP).
       Le mot de passe en clair n'est JAMAIS stocké.
     - Vérification en temps constant (évite les attaques par mesure du temps).
     - Politique de mot de passe et validation de l'inscription.
     - Limitation des tentatives de connexion (anti force brute).
   Aucune requête SQL ici : les comptes sont gérés par js/db/utilisateurs.repo.js.

   ⚠️ Limite : sans serveur, tout s'exécute dans le navigateur de
   l'utilisateur. Ce module rend les mots de passe illisibles dans la base,
   mais ne peut pas empêcher quelqu'un qui contrôle ce navigateur de
   modifier la base ou la session. Voir CADRAGE.md, partie 5.

   Dépendances : Web Crypto (navigateur en contexte sécurisé : https,
   localhost ou 127.0.0.1), js/utils.js.
   ========================================================================== */

(function (global) {
  'use strict';

  var Utils = global.Utils;

  /** Accès à Web Crypto (disponible en https, sur localhost ou 127.0.0.1). */
  function getSubtle() {
    var c = global.crypto;
    return c && c.subtle ? c : null;
  }

  var PBKDF2_ITERATIONS = 600000;
  var SALT_BYTES = 16;
  var HASH_BITS = 256;

  var PASSWORD_MIN = 8;
  var PASSWORD_MAX = 128;

  var MAX_FAILED_LOGINS = 5;          // tentatives avant blocage
  var LOCK_DURATION_MS = 30 * 1000;   // durée du blocage

  function toHex(buffer) {
    return Array.prototype.map.call(new Uint8Array(buffer), function (b) {
      return b.toString(16).padStart(2, '0');
    }).join('');
  }

  function fromHex(hex) {
    var bytes = new Uint8Array(hex.length / 2);
    for (var i = 0; i < bytes.length; i++) bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
    return bytes;
  }

  /** Comparaison en temps constant de deux chaînes hexadécimales. */
  function constantTimeEqual(a, b) {
    if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
    var diff = 0;
    for (var i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
    return diff === 0;
  }

  /** E-mail normalisé : sans espaces, en minuscules. */
  function normalizeEmail(email) {
    return String(email || '').trim().toLowerCase();
  }

  /** Vérifie que Web Crypto est disponible (sinon : message clair). */
  function isAvailable() {
    return getSubtle() !== null;
  }

  /**
   * Hache un mot de passe.
   * @param {string} password
   * @param {string} [saltHex] - sel existant (pour vérifier) ; sinon généré
   * @param {number} [iterations]
   * @returns {Promise<{salt: string, hash: string, iterations: number}>}
   */
  function hashPassword(password, saltHex, iterations) {
    var c = getSubtle();
    if (!c) {
      return Promise.reject(new Error(
        'Chiffrement indisponible : ouvrez l’application en https, sur localhost ou 127.0.0.1.'));
    }
    iterations = iterations || PBKDF2_ITERATIONS;
    var salt = saltHex ? fromHex(saltHex) : c.getRandomValues(new Uint8Array(SALT_BYTES));
    var enc = new TextEncoder();
    return c.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits'])
      .then(function (key) {
        return c.subtle.deriveBits(
          { name: 'PBKDF2', hash: 'SHA-256', salt: salt, iterations: iterations },
          key, HASH_BITS);
      })
      .then(function (bits) {
        return { salt: toHex(salt), hash: toHex(bits), iterations: iterations };
      });
  }

  /**
   * Vérifie un mot de passe par rapport à l'enregistrement stocké.
   * @param {string} password
   * @param {{password_salt: string, password_hash: string, password_iterations: number}} user
   * @returns {Promise<boolean>}
   */
  function verifyPassword(password, user) {
    return hashPassword(password, user.password_salt, user.password_iterations)
      .then(function (res) { return constantTimeEqual(res.hash, user.password_hash); });
  }

  /** Règles du mot de passe. Renvoie la liste des erreurs. */
  function validatePassword(password) {
    var errors = [];
    password = String(password || '');
    if (password.length < PASSWORD_MIN) errors.push('Le mot de passe doit contenir au moins ' + PASSWORD_MIN + ' caractères.');
    if (password.length > PASSWORD_MAX) errors.push('Le mot de passe ne doit pas dépasser ' + PASSWORD_MAX + ' caractères.');
    if (!/[A-Za-zÀ-ÿ]/.test(password)) errors.push('Le mot de passe doit contenir au moins une lettre.');
    if (!/\d/.test(password)) errors.push('Le mot de passe doit contenir au moins un chiffre.');
    return errors;
  }

  /**
   * Contrôle du formulaire d'inscription.
   * Renvoie [{field, message}] (vide si tout est correct).
   */
  function validateRegistration(data) {
    var errors = [];
    if (String(data.name || '').trim().length < 2) {
      errors.push({ field: 'name', message: 'Le nom est obligatoire (2 caractères minimum).' });
    }
    if (!Utils.isValidEmail(data.email)) {
      errors.push({ field: 'email', message: 'L’adresse e-mail est invalide (ex. : nom@exemple.fr).' });
    }
    validatePassword(data.password).forEach(function (m) {
      errors.push({ field: 'password', message: m });
    });
    if (data.password !== data.passwordConfirm) {
      errors.push({ field: 'passwordConfirm', message: 'Les deux mots de passe ne sont pas identiques.' });
    }
    return errors;
  }

  /**
   * Limiteur de tentatives : après 5 échecs pour un même e-mail, la
   * connexion est bloquée 30 secondes. (En mémoire : remis à zéro au
   * rechargement — un vrai blocage nécessiterait un serveur.)
   */
  function createLoginLimiter(maxFailures, lockMs) {
    var state = {}; // email -> { failures, lockedUntil }
    maxFailures = maxFailures || MAX_FAILED_LOGINS;
    lockMs = lockMs || LOCK_DURATION_MS;
    return {
      /** Nombre de secondes restantes de blocage (0 = autorisé). */
      secondsLocked: function (email, now) {
        var s = state[normalizeEmail(email)];
        now = now || Date.now();
        if (!s || !s.lockedUntil || s.lockedUntil <= now) return 0;
        return Math.ceil((s.lockedUntil - now) / 1000);
      },
      recordFailure: function (email, now) {
        var key = normalizeEmail(email);
        now = now || Date.now();
        var s = state[key] || { failures: 0, lockedUntil: 0 };
        if (s.lockedUntil && s.lockedUntil <= now) s.failures = 0; // blocage expiré
        s.failures += 1;
        if (s.failures >= maxFailures) s.lockedUntil = now + lockMs;
        state[key] = s;
      },
      reset: function (email) {
        delete state[normalizeEmail(email)];
      }
    };
  }

  var Auth = {
    PBKDF2_ITERATIONS: PBKDF2_ITERATIONS,
    MAX_FAILED_LOGINS: MAX_FAILED_LOGINS,
    LOCK_DURATION_MS: LOCK_DURATION_MS,
    isAvailable: isAvailable,
    normalizeEmail: normalizeEmail,
    hashPassword: hashPassword,
    verifyPassword: verifyPassword,
    constantTimeEqual: constantTimeEqual,
    validatePassword: validatePassword,
    validateRegistration: validateRegistration,
    createLoginLimiter: createLoginLimiter
  };

  global.Auth = Auth;
})(window);
