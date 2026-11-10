/* ==========================================================================
   FIND MY CAR — js/utils.js
   --------------------------------------------------------------------------
   Lot : P1 (socle) — fichier partagé, modifié uniquement par P1.
   Rôle : fonctions "pures" réutilisées par tous les lots : dates, calcul
   du prix, chevauchement, e-mail, formatage, protection HTML, et petits
   raccourcis SQL (sqlAll / sqlGet / sqlRun) utilisés par les dépôts js/db/.
   Testées dans le navigateur : page tests/ (fichier tests/unit/utils.test.js).
   Dépendances : aucune.
   ========================================================================== */

(function (global) {
  'use strict';

  /** Nombre de millisecondes dans une journée. */
  var MS_PER_DAY = 24 * 60 * 60 * 1000;

  /**
   * Vérifie qu'une chaîne est une date au format AAAA-MM-JJ et qu'elle existe
   * réellement (ex. "2026-02-30" est refusée).
   * @param {string} value
   * @returns {boolean}
   */
  function isValidISODate(value) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return false;
    }
    var parts = value.split('-').map(Number);
    var d = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
    return (
      d.getUTCFullYear() === parts[0] &&
      d.getUTCMonth() === parts[1] - 1 &&
      d.getUTCDate() === parts[2]
    );
  }

  /**
   * Convertit "AAAA-MM-JJ" en nombre de millisecondes (minuit UTC).
   * On travaille en UTC pour éviter les décalages dus au changement d'heure.
   */
  function toUTCms(isoDate) {
    var p = isoDate.split('-').map(Number);
    return Date.UTC(p[0], p[1] - 1, p[2]);
  }

  /**
   * Renvoie la date du jour (heure locale de l'utilisateur) au format AAAA-MM-JJ.
   * @param {Date} [now] - date de référence (utile pour les tests)
   */
  function todayISO(now) {
    var d = now || new Date();
    var m = String(d.getMonth() + 1).padStart(2, '0');
    var day = String(d.getDate()).padStart(2, '0');
    return d.getFullYear() + '-' + m + '-' + day;
  }

  /**
   * Ajoute un nombre de jours à une date AAAA-MM-JJ.
   */
  function addDays(isoDate, nbDays) {
    var d = new Date(toUTCms(isoDate) + nbDays * MS_PER_DAY);
    return d.toISOString().slice(0, 10);
  }

  /**
   * Nombre de jours facturés entre deux dates.
   * Règle métier : on facture le nombre de nuits (du 10 au 12 = 2 jours).
   * La date de fin correspond au jour de restitution du véhicule.
   */
  function countDays(startDate, endDate) {
    return Math.round((toUTCms(endDate) - toUTCms(startDate)) / MS_PER_DAY);
  }

  /**
   * Montant total = nombre de jours × prix journalier, arrondi au centime.
   */
  function computeTotal(dailyPrice, days) {
    return Math.round(dailyPrice * days * 100) / 100;
  }

  /**
   * Contrôle les dates saisies. Renvoie un tableau de messages d'erreur
   * (tableau vide = dates valides).
   * @param {string} startDate
   * @param {string} endDate
   * @param {string} today - date du jour AAAA-MM-JJ
   */
  function validateDates(startDate, endDate, today) {
    var errors = [];
    if (!isValidISODate(startDate)) {
      errors.push('Veuillez saisir une date de début valide.');
    }
    if (!isValidISODate(endDate)) {
      errors.push('Veuillez saisir une date de fin valide.');
    }
    if (errors.length > 0) {
      return errors;
    }
    // Les dates AAAA-MM-JJ se comparent correctement comme des chaînes.
    if (startDate < today) {
      errors.push("La date de début ne peut pas être antérieure à aujourd'hui.");
    }
    if (endDate <= startDate) {
      errors.push('La date de fin doit être postérieure à la date de début.');
    }
    return errors;
  }

  /**
   * Deux périodes [début, fin[ se chevauchent si chacune commence avant
   * la fin de l'autre. La fin est exclue : un véhicule rendu le 12 peut
   * être repris le 12 par un autre client.
   */
  function periodsOverlap(startA, endA, startB, endB) {
    return startA < endB && startB < endA;
  }

  /**
   * Format d'e-mail simple : texte@texte.extension, sans espace.
   */
  function isValidEmail(value) {
    return typeof value === 'string' &&
      /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim());
  }

  /** Formate un montant en euros : 1234.5 -> "1 234,50 €" */
  function formatPrice(amount) {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  }

  /** Formate une date AAAA-MM-JJ en JJ/MM/AAAA. */
  function formatDateFR(isoDate) {
    if (!isValidISODate(isoDate)) return isoDate;
    var p = isoDate.split('-');
    return p[2] + '/' + p[1] + '/' + p[0];
  }

  /**
   * Protège un texte avant de l'insérer dans du HTML (évite l'injection
   * de code via un nom ou un e-mail saisi par l'utilisateur).
   */
  function escapeHTML(text) {
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /* ---------------- Raccourcis SQL (base sql.js passée en paramètre) ---------------- */

  /** SELECT → tableau d'objets. */
  function sqlAll(db, sql, params) {
    var stmt = db.prepare(sql);
    var rows = [];
    try {
      stmt.bind(params || []);
      while (stmt.step()) rows.push(stmt.getAsObject());
    } finally {
      stmt.free(); // libère la mémoire WebAssembly
    }
    return rows;
  }

  /** SELECT → première ligne ou null. */
  function sqlGet(db, sql, params) {
    return sqlAll(db, sql, params)[0] || null;
  }

  /** INSERT / UPDATE / DELETE → { changes, lastId }. */
  function sqlRun(db, sql, params) {
    db.run(sql, params || []);
    var changes = db.getRowsModified();
    var lastId = sqlGet(db, 'SELECT last_insert_rowid() AS id').id;
    return { changes: changes, lastId: lastId };
  }

  var Utils = {
    isValidISODate: isValidISODate,
    todayISO: todayISO,
    addDays: addDays,
    countDays: countDays,
    computeTotal: computeTotal,
    validateDates: validateDates,
    periodsOverlap: periodsOverlap,
    isValidEmail: isValidEmail,
    formatPrice: formatPrice,
    formatDateFR: formatDateFR,
    escapeHTML: escapeHTML,
    sqlAll: sqlAll,
    sqlGet: sqlGet,
    sqlRun: sqlRun
  };

  global.Utils = Utils;
})(window);
