/* FIND MY CAR — tests/e2e/socle.test.js   (Lot : P1, socle)
   Doit réussir À CHAQUE ÉTAPE du projet (socle seul, puis après chaque fusion) :
   navigation entre les 4 onglets, affichage responsive, sécurité de la page, aucune erreur. */
suite('P1 — Socle : navigation, responsive, sécurité', function () {
  var A = TestApp;
  var TABS = ['vehicules', 'reservation', 'contact', 'connexion'];
  before(async function () { await A.reset(); await A.open(); });

  test('l’application démarre sans erreur', function () {
    assert.equal(A.doc().body.dataset.ready, 'true');
    assert.doesNotMatch(A.$('#app-status').className, /app-status-error/);
  });

  test('les 4 onglets s’affichent un par un, l’onglet actif est signalé', async function () {
    assert.equal(A.visiblePanel(), 'vehicules');
    for (var i = 0; i < TABS.length + 1; i++) {
      var tab = TABS[i % TABS.length];
      await A.goTab(tab);
      assert.equal(A.$$('[data-panel]:not([hidden])').length, 1);
      assert.equal(A.$('a.nav-link[aria-current="page"]').dataset.tab, tab);
      assert.ok(A.$('[data-panel="' + tab + '"]').textContent.trim().length > 0, 'onglet ' + tab + ' vide');
    }
  });

  test('accès direct par l’adresse, adresse inconnue → Véhicules', async function () {
    await A.open('contact');
    assert.equal(A.visiblePanel(), 'contact');
    await A.open('page-inexistante');
    assert.equal(A.visiblePanel(), 'vehicules');
  });

  test('responsive : pas de défilement horizontal sur smartphone, tablette, ordinateur', async function () {
    var sizes = [['smartphone', 390], ['tablette', 768], ['ordinateur', 1280]];
    for (var s = 0; s < sizes.length; s++) {
      for (var t = 0; t < TABS.length; t++) {
        await A.open(TABS[t], { width: sizes[s][1] });
        await new Promise(function (r) { setTimeout(r, 250); }); // fin des transitions CSS
        var overflow = A.doc().documentElement.scrollWidth - A.win().innerWidth;
        assert.ok(overflow <= 0, sizes[s][0] + ' / ' + TABS[t] + ' : défilement horizontal de ' + overflow + ' px');
        var w = A.win().innerWidth;
        assert.ok(A.$$('.nav-link').every(function (l) { var r = l.getBoundingClientRect(); return r.width > 0 && r.right <= w; }), sizes[s][0] + ' : onglets visibles');
      }
    }
    A.setWidth(1280);
  });

  test('sécurité : politique CSP stricte présente (aucun script en ligne autorisé)', function () {
    var csp = A.$('meta[http-equiv="Content-Security-Policy"]');
    assert.ok(csp, 'balise CSP absente');
    var c = csp.getAttribute('content');
    assert.match(c, /script-src 'self' 'wasm-unsafe-eval'(;|$)/);
    assert.doesNotMatch(c, /unsafe-inline/);
    assert.match(c, /object-src 'none'/);
    assert.equal(A.$$('script:not([src])').length, 0, 'aucun script en ligne dans la page');
    var handlers = A.$$('*').filter(function (el) {
      return Array.prototype.some.call(el.attributes, function (a) { return /^on/i.test(a.name); });
    });
    assert.equal(handlers.length, 0, 'aucun attribut onclick=, onerror=… dans la page');
  });

  test('aucune erreur JavaScript', function () {
    assert.deepEqual(A.errors, []);
  });
});
