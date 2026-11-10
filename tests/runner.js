/* ==========================================================================
   FIND MY CAR — tests/runner.js   (Lot : P1, socle)
   --------------------------------------------------------------------------
   Charge les fichiers de test de chaque lot, puis lance les tests.
   Un fichier pas encore livré (lot non fusionné) est simplement signalé
   « pas encore livré » : ce n'est pas une erreur.
   Mode automatique (GitHub Actions) : tests/index.html?auto=1 lance tout seul
   et écrit le résultat dans le titre de la page : « FMC-TESTS OK 66/66 ».
   ========================================================================== */

(function (global) {
  'use strict';

  /** Liste FIXE des fichiers de test (un par lot) : personne n'a besoin de la modifier. */
  var FILES = [
    { file: 'unit/utils.test.js',          lot: 'P1' },
    { file: 'unit/core.test.js',           lot: 'P2' },
    { file: 'unit/vehicules.test.js',      lot: 'P3' },
    { file: 'unit/auth.test.js',           lot: 'P5' },
    { file: 'unit/utilisateurs.test.js',   lot: 'P5' },
    { file: 'unit/reservations.test.js',   lot: 'P7' },
    { file: 'e2e/socle.test.js',           lot: 'P1' },
    { file: 'e2e/vehicules.test.js',       lot: 'P4' },
    { file: 'e2e/contact.test.js',         lot: 'P8' },
    { file: 'e2e/connexion.test.js',       lot: 'P6' },
    { file: 'e2e/reservation.test.js',     lot: 'P7' },
    { file: 'e2e/parcours.test.js',        lot: 'P8' }
  ];

  var auto = new URLSearchParams(global.location.search).get('auto') === '1';
  var els = {};

  function loadScript(src) {
    return new Promise(function (resolve) {
      var s = document.createElement('script');
      s.src = src;
      s.onload = function () { resolve(true); };
      s.onerror = function () { resolve(false); };
      document.body.appendChild(s);
    });
  }

  function addRow(cls, html) {
    var li = document.createElement('li');
    li.className = cls;
    li.innerHTML = html;
    els.results.appendChild(li);
    return li;
  }

  async function loadAll() {
    var missing = [];
    for (var i = 0; i < FILES.length; i++) {
      var ok = await loadScript(FILES[i].file);
      FILES[i].loaded = ok;
      if (!ok) missing.push(FILES[i]);
    }
    els.files.innerHTML = FILES.map(function (f) {
      return '<li class="' + (f.loaded ? 'is-loaded' : 'is-missing') + '"><code>tests/' + f.file + '</code> — ' + f.lot +
        (f.loaded ? '' : ' <em>(pas encore livré)</em>') + '</li>';
    }).join('');
    return missing;
  }

  async function runAll() {
    els.run.disabled = true;
    els.results.innerHTML = '';
    els.summary.className = 'summary is-running';
    els.summary.textContent = 'Tests en cours… (l’application s’ouvre dans le cadre en bas de page)';
    document.title = 'Tests en cours — FIND MY CAR';
    var result = await MiniTest.run(function (type, data) {
      var e = Utils.escapeHTML;
      if (type === 'suite') addRow('suite', '<strong>' + e(data.suite) + '</strong>');
      if (type === 'pass') addRow('pass', '✅ ' + e(data.test) + ' <span class="ms">' + Math.round(data.ms) + ' ms</span>');
      if (type === 'fail') addRow('fail', '❌ ' + e(data.test) + '<br><span class="error">' + e(data.error && data.error.message ? data.error.message : String(data.error)) + '</span>');
    });
    var total = result.pass + result.fail;
    var ok = result.fail === 0 && total > 0;
    els.summary.className = 'summary ' + (ok ? 'is-ok' : 'is-ko');
    els.summary.textContent = (ok ? '✅ Tous les tests sont réussis : ' : '❌ Tests en échec : ') + result.pass + ' / ' + total + ' réussis.';
    document.body.dataset.result = ok ? 'ok' : 'ko';
    document.title = 'FMC-TESTS ' + (ok ? 'OK' : 'KO') + ' ' + result.pass + '/' + total +
      (result.failures.length ? ' — ' + result.failures[0].slice(0, 180) : '');
    console.log(document.title);
    els.run.disabled = false;
    return result;
  }

  document.addEventListener('DOMContentLoaded', async function () {
    els.run = document.getElementById('run');
    els.summary = document.getElementById('summary');
    els.results = document.getElementById('results');
    els.files = document.getElementById('files');
    TestApp.attach(document.getElementById('app-frame'));
    await loadAll();
    els.run.disabled = false;
    els.run.addEventListener('click', runAll);
    if (auto) runAll();
  });
})(window);
