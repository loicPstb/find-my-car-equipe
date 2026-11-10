/* FIND MY CAR — tests/e2e/parcours.test.js   (Lot : P8, fusionné EN DERNIER)
   Test d'INTÉGRATION : parcours complet d'un client et de l'agence à travers
   les 4 onglets, sur ordinateur puis sur smartphone. Valide que les 8 lots
   fonctionnent ENSEMBLE. */
suite('P8 — Parcours complet (intégration des 8 lots)', function () {
  var A = TestApp;
  before(async function () { await A.reset(); await A.open('vehicules', { photos: 'fake' }); });

  test('tous les onglets sont actifs (aucun lot manquant)', function () {
    var App = A.win().App;
    assert.deepEqual(['vehicules', 'reservation', 'contact', 'connexion'].map(function (t) { return App.isActive(t); }), [true, true, true, true]);
    assert.equal(A.$$('.waiting-lots').length, 0);
  });

  test('parcours client : catalogue → détails → réserver → créer un compte → confirmer', async function () {
    A.select('#filter-category', 'Électrique');
    A.click('button[data-action="details"][data-id="7"]');
    assert.equal(A.$('#vehicle-dialog').open, true);
    A.click('#dialog-reserve');
    assert.equal(A.$('#res-vehicle').value, '7');
    A.setValue('#res-start', A.day(3));
    A.setValue('#res-end', A.day(5));
    assert.equal(A.clean(A.text('#summary-total')), '98,00€'); // 2 × 49 €
    A.click('#res-submit'); // pas encore de compte
    assert.equal(A.visiblePanel(), 'connexion');
    A.setValue('#register-name', 'Lucas Martin');
    A.setValue('#register-email', 'lucas.martin@exemple.fr');
    A.setValue('#register-password', 'Location2026');
    A.setValue('#register-confirm', 'Location2026');
    A.click('#register-submit');
    await A.waitFor(function () { return A.visiblePanel() === 'reservation'; }, 'retour à la réservation');
    A.click('#res-submit');
    await A.waitFor(function () { return /confirmée/.test(A.text('#reservation-message')); }, 'confirmation');
    assert.match(A.text('#reservation-list'), /Renault Zoe/);
  });

  test('parcours agence : l’administrateur voit la réservation de Lucas et l’annule', async function () {
    await A.logout();
    assert.equal(await A.login('admin@findmycar.example.com', 'AdminDemo2026!'), null);
    await A.goTab('reservation');
    assert.match(A.text('#reservation-list'), /lucas\.martin@exemple\.fr/);
    A.click('#reservation-list button[data-cancel]');
    await A.waitFor(function () { return !A.$('#list-message').hidden; }, 'annulation');
    assert.match(A.text('#reservation-list'), /Annulée/);
  });

  test('contact puis réinitialisation, sur smartphone', async function () {
    A.setWidth(390);
    await A.goTab('contact');
    A.win().Contact.openMailClient = function () {};
    A.setValue('#contact-name', 'Lucas Martin');
    A.setValue('#contact-email', 'lucas.martin@exemple.fr');
    A.setValue('#contact-subject', 'Facture');
    A.setValue('#contact-body', 'Bonjour, pouvez-vous m’envoyer la facture de ma location ?');
    A.click('#contact-form button[type="submit"]');
    assert.match(A.text('#contact-message'), /messagerie devrait s’ouvrir/);
    A.click('#reset-demo');
    await A.waitFor(function () { return A.$$('#reservation-list .reservation-item').length === 0; }, 'réinitialisation');
    assert.equal(A.$('#user-chip').hidden, true);
    A.setWidth(1280);
  });

  test('aucune erreur JavaScript sur tout le parcours', function () { assert.deepEqual(A.errors, []); });
});
