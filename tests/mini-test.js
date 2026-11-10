/* ==========================================================================
   FIND MY CAR — tests/mini-test.js   (Lot : P1, socle)
   --------------------------------------------------------------------------
   Mini outil de test qui fonctionne DANS LE NAVIGATEUR (rien à installer).
   Chaque fichier de test déclare ses tests ainsi :

     suite('P3 — Données véhicules', function () {
       test('le catalogue contient 11 véhicules', async function () {
         const db = await TestApp.freshDb([VehiculesRepo]);
         assert.equal(VehiculesRepo.Q.getVehicles(db, {}).length, 11);
       });
     });

   Vérifications disponibles : assert.ok, equal, notEqual, deepEqual, match,
   doesNotMatch, throws. Les tests s'exécutent un par un, dans l'ordre.
   ========================================================================== */

(function (global) {
  'use strict';

  var suites = [];
  var current = null;

  /* ---------------------------- Déclaration ---------------------------- */

  global.suite = function (name, fn) {
    current = { name: name, tests: [], before: [], after: [] };
    suites.push(current);
    fn();
    current = null;
  };
  global.test = function (name, fn) {
    if (!current) throw new Error('test() doit être appelé dans une suite().');
    current.tests.push({ name: name, fn: fn });
  };
  global.before = function (fn) { current.before.push(fn); };
  global.after = function (fn) { current.after.push(fn); };

  /* ---------------------------- Vérifications ---------------------------- */

  function fail(message) {
    var err = new Error(message);
    err.name = 'Échec';
    throw err;
  }
  function show(v) {
    try { return JSON.stringify(v); } catch (e) { return String(v); }
  }

  global.assert = {
    ok: function (value, message) {
      if (!value) fail(message || 'Valeur attendue vraie, obtenue : ' + show(value));
    },
    equal: function (actual, expected, message) {
      if (actual !== expected) fail((message ? message + ' — ' : '') + 'attendu ' + show(expected) + ', obtenu ' + show(actual));
    },
    notEqual: function (actual, unexpected, message) {
      if (actual === unexpected) fail((message ? message + ' — ' : '') + 'ne devait pas valoir ' + show(unexpected));
    },
    deepEqual: function (actual, expected, message) {
      if (show(actual) !== show(expected)) fail((message ? message + ' — ' : '') + 'attendu ' + show(expected) + ', obtenu ' + show(actual));
    },
    match: function (text, regex, message) {
      if (!regex.test(String(text))) fail((message ? message + ' — ' : '') + show(String(text)) + ' ne correspond pas à ' + regex);
    },
    doesNotMatch: function (text, regex, message) {
      if (regex.test(String(text))) fail((message ? message + ' — ' : '') + show(String(text)) + ' ne devait pas correspondre à ' + regex);
    },
    throws: function (fn, regex, message) {
      try { fn(); } catch (e) {
        if (regex && !regex.test(String(e.message || e))) fail((message ? message + ' — ' : '') + 'erreur inattendue : ' + e.message);
        return;
      }
      fail(message || 'Une erreur était attendue.');
    }
  };

  /* ---------------------------- Exécution ---------------------------- */

  var TEST_TIMEOUT_MS = 60000;

  function withTimeout(promise, ms, label) {
    var timer;
    return Promise.race([
      promise,
      new Promise(function (_, reject) {
        timer = setTimeout(function () { reject(new Error('Délai dépassé (' + ms / 1000 + ' s) : ' + label)); }, ms);
      })
    ]).finally(function () { clearTimeout(timer); });
  }

  /**
   * Lance toutes les suites. onEvent(type, data) permet d'afficher la progression.
   * @returns {Promise<{pass: number, fail: number, failures: string[]}>}
   */
  async function run(onEvent) {
    var result = { pass: 0, fail: 0, failures: [] };
    for (var s = 0; s < suites.length; s++) {
      var suite = suites[s];
      onEvent('suite', { suite: suite.name });
      var setupError = null;
      for (var b = 0; b < suite.before.length; b++) {
        try { await withTimeout(Promise.resolve().then(suite.before[b]), TEST_TIMEOUT_MS, 'préparation'); } catch (e) { setupError = e; break; }
      }
      for (var t = 0; t < suite.tests.length; t++) {
        var tc = suite.tests[t];
        var started = performance.now();
        try {
          if (setupError) throw setupError;
          await withTimeout(Promise.resolve().then(tc.fn), TEST_TIMEOUT_MS, tc.name);
          result.pass++;
          onEvent('pass', { suite: suite.name, test: tc.name, ms: performance.now() - started });
        } catch (e) {
          result.fail++;
          result.failures.push(suite.name + ' › ' + tc.name + ' : ' + (e && e.message ? e.message : e));
          onEvent('fail', { suite: suite.name, test: tc.name, error: e, ms: performance.now() - started });
        }
      }
      for (var a = 0; a < suite.after.length; a++) {
        try { await suite.after[a](); } catch (e) { /* le nettoyage ne doit pas masquer les résultats */ }
      }
    }
    return result;
  }

  global.MiniTest = { run: run, suites: function () { return suites; } };
})(window);
