/* FIND MY CAR — tests/e2e/connexion.test.js   (Lot : P6)
   Onglet Connexion : inscription, connexion, session, déconnexion, message générique,
   blocage, administrateur, protection contre l'injection, réinitialisation. Dépend de P2 et P5. */
suite('P6 — Onglet Connexion', function () {
  var A = TestApp;
  var JEANNE = { name: 'Jeanne Testeuse', email: 'jeanne.test@exemple.fr', password: 'Voiture2026' };
  function register(name, email, pw, confirm) {
    A.setValue('#register-name', name);
    A.setValue('#register-email', email);
    A.setValue('#register-password', pw);
    A.setValue('#register-confirm', confirm === undefined ? pw : confirm);
    A.click('#register-submit');
  }
  before(async function () { await A.reset(); await A.open('connexion'); });

  test('inscription : 4 erreurs, puis e-mail déjà utilisé, puis succès', async function () {
    register('J', 'jeanne', 'abc', 'abd');
    await A.waitFor(function () { return !A.$('#register-message').hidden; }, 'message d’erreur');
    assert.equal(A.$$('#register-form [aria-invalid="true"]').length, 4);
    register(JEANNE.name, 'CLIENT@findmycar.example.com', JEANNE.password);
    await A.waitFor(function () { return /existe déjà/.test(A.text('#register-message')); }, 'e-mail déjà utilisé');
    register(JEANNE.name, JEANNE.email, JEANNE.password);
    await A.waitFor(function () { return !A.$('#auth-user').hidden; }, 'compte créé');
    assert.equal(A.text('#account-email'), JEANNE.email);
    assert.equal(A.text('#account-role'), 'Client');
    assert.match(A.text('#account-count'), /^(0|—)$/); // « — » tant que le lot P7 n'est pas fusionné
    assert.match(A.$('#user-chip').hidden ? '' : A.text('#user-chip'), /Jeanne Testeuse/);
    assert.equal(A.text('a.nav-link[data-tab="connexion"]'), 'Mon compte');
  });

  test('la session est conservée au rechargement, puis déconnexion', async function () {
    await A.reload();
    assert.equal(A.$('#auth-user').hidden, false);
    await A.logout();
    assert.equal(A.$('#user-chip').hidden, true);
    assert.equal(A.text('a.nav-link[data-tab="connexion"]'), 'Connexion');
  });

  test('mauvais mot de passe et compte inconnu : même message (pas d’énumération)', async function () {
    var wrong = await A.login('client@findmycar.example.com', 'Faux12345');
    var unknown = await A.login('personne@exemple.fr', 'Faux12345');
    assert.match(wrong, /E-mail ou mot de passe incorrect/);
    assert.equal(wrong, unknown);
  });

  test('blocage après 5 échecs, même avec le bon mot de passe', async function () {
    for (var i = 0; i < 5; i++) await A.login(JEANNE.email, 'Mauvais' + i + 'x');
    assert.match(await A.login(JEANNE.email, JEANNE.password), /Trop de tentatives/);
  });

  test('compte administrateur : badge et information', async function () {
    assert.equal(await A.login('admin@findmycar.example.com', 'AdminDemo2026!'), null);
    assert.match(A.text('#user-chip'), /Admin/);
    assert.equal(A.text('#account-role'), 'Administrateur');
    assert.equal(A.$('#account-admin-note').hidden, false);
    await A.logout();
  });

  test('sécurité : un nom piégé (HTML) est affiché comme du texte, jamais exécuté', async function () {
    await A.goTab('connexion');
    register('<img src=x onerror=alert(1)>', 'piege@exemple.fr', 'Voiture2026');
    await A.waitFor(function () { return !A.$('#auth-user').hidden; }, 'compte créé');
    assert.equal(A.$$('#user-chip img, #account-name img').length, 0);
    assert.match(A.text('#user-chip'), /<img src=x/);
    await A.logout();
  });

  test('réinitialisation : session fermée, comptes créés supprimés, comptes de démo conservés', async function () {
    assert.equal(await A.login('client@findmycar.example.com', 'ClientDemo2026!'), null);
    A.click('#reset-demo'); // la confirmation est acceptée automatiquement
    await A.waitFor(function () { return !A.$('#auth-guest').hidden; }, 'session fermée');
    assert.equal(A.$('#user-chip').hidden, true);
    await A.reload(); // remet aussi à zéro le compteur de blocage (en mémoire)
    assert.match(await A.login(JEANNE.email, JEANNE.password), /incorrect/);
    assert.equal(await A.login('client@findmycar.example.com', 'ClientDemo2026!'), null);
  });

  test('aucune erreur JavaScript', function () { assert.deepEqual(A.errors, []); });
});
