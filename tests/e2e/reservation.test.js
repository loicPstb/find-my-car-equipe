/* FIND MY CAR — tests/e2e/reservation.test.js   (Lot : P7)
   Onglet Réservation : connexion requise, prix, dates, chevauchement, sauvegarde,
   annulation, droits client / administrateur. Dépend de P2, P3, P5 et P6. */
suite('P7 — Onglet Réservation', function () {
  var A = TestApp;
  function fill(vehicleId, start, end) {
    A.setValue('#res-vehicle', String(vehicleId));
    A.setValue('#res-start', start);
    A.setValue('#res-end', end);
  }
  async function submit() {
    A.click('#res-submit');
    await A.waitFor(function () { return !A.$('#reservation-message').hidden && !A.$('#res-submit').disabled; }, 'message de réservation');
    return { cls: A.$('#reservation-message').className, text: A.text('#reservation-message') };
  }
  function count() { return A.$$('#reservation-list .reservation-item').length; }
  before(async function () { await A.reset(); await A.open('reservation'); });

  test('sans compte : prix simulé, puis connexion demandée et retour avec la sélection', async function () {
    fill(4, A.day(10), A.day(13));
    assert.equal(A.text('#summary-days'), '3 jours');
    assert.equal(A.clean(A.text('#summary-total')), '165,00€'); // 3 × 55 €
    assert.match(A.text('#res-account'), /pas connecté/);
    assert.equal(A.text('#reservation-empty'), 'Connectez-vous pour voir vos réservations.');
    A.click('#res-submit');
    assert.equal(A.visiblePanel(), 'connexion');
    assert.match(A.text('#auth-notice'), /Connectez-vous ou créez un compte/);
    A.setValue('#login-email', 'client@findmycar.example.com');
    A.setValue('#login-password', 'ClientDemo2026!');
    A.click('#login-submit');
    await A.waitFor(function () { return A.visiblePanel() === 'reservation'; }, 'retour à la réservation');
    assert.equal(A.$('#res-vehicle').value, '4');
    assert.equal(A.$('#res-start').value, A.day(10));
    assert.match(A.text('#res-account'), /Client Démo/);
  });

  test('réservation valide et prix calculé automatiquement', async function () {
    assert.match(A.text('#summary-availability'), /disponible/);
    assert.equal(A.$('#summary-total input'), null); // montant non modifiable
    var msg = await submit();
    assert.match(msg.cls, /alert-success/);
    assert.match(msg.text, /confirmée/);
    assert.match(A.clean(msg.text), /165,00€/);
    assert.equal(count(), 1);
    var item = A.text('#reservation-list .reservation-item');
    assert.match(item, /Volkswagen Golf 8/);
    assert.match(item, /Confirmée/);
    assert.match(item, /Client Démo/);
  });

  test('dates incorrectes refusées', async function () {
    fill(1, A.day(-1), A.day(2));
    assert.match((await submit()).text, /antérieure à aujourd'hui/);
    fill(1, A.day(5), A.day(5));
    assert.match((await submit()).text, /postérieure à la date de début/);
    fill(1, A.day(8), A.day(6));
    assert.match((await submit()).text, /postérieure à la date de début/);
    assert.equal(count(), 1);
  });

  test('chevauchement refusé, réservation bout à bout acceptée', async function () {
    fill(4, A.day(12), A.day(15));
    assert.match(A.$('#summary-availability').className, /is-error/);
    assert.match((await submit()).text, /déjà réservé/);
    fill(4, A.day(13), A.day(14));
    assert.match((await submit()).cls, /alert-success/);
    assert.equal(count(), 2);
  });

  test('sauvegarde : tout est retrouvé après rechargement (session comprise)', async function () {
    await A.reload();
    assert.equal(A.visiblePanel(), 'reservation');
    assert.equal(count(), 2);
    fill(4, A.day(11), A.day(12));
    assert.match(A.text('#summary-availability'), /déjà réservé/);
  });

  test('annulation : statut sauvegardé, créneau libéré, compteur de « Mon compte » à jour', async function () {
    var id = A.$('#reservation-list .reservation-item').dataset.id;
    A.click('button[data-cancel="' + id + '"]');
    await A.waitFor(function () { return !A.$('#list-message').hidden; }, 'annulation');
    assert.match(A.text('#list-message'), /annulée/);
    await A.reload();
    assert.match(A.text('#reservation-list .reservation-item[data-id="' + id + '"]'), /Annulée/);
    fill(4, A.day(10), A.day(13));
    assert.match(A.text('#summary-availability'), /disponible/);
    await A.goTab('connexion');
    assert.equal(A.text('#account-count'), '1');
  });

  test('droits : un autre client ne voit rien mais le chevauchement reste contrôlé ; l’admin voit et annule tout', async function () {
    await A.logout();
    A.setValue('#register-name', 'Jeanne Testeuse');
    A.setValue('#register-email', 'jeanne.test@exemple.fr');
    A.setValue('#register-password', 'Voiture2026');
    A.setValue('#register-confirm', 'Voiture2026');
    A.click('#register-submit');
    await A.waitFor(function () { return !A.$('#auth-user').hidden; }, 'compte créé');
    await A.goTab('reservation');
    assert.equal(count(), 0);
    fill(4, A.day(13), A.day(14)); // déjà pris par Client Démo
    assert.match((await submit()).text, /déjà réservé/);
    await A.logout();
    assert.equal(await A.login('admin@findmycar.example.com', 'AdminDemo2026!'), null);
    await A.goTab('reservation');
    assert.equal(A.text('#my-res-title'), 'Toutes les réservations');
    assert.equal(count(), 2);
    assert.match(A.text('#reservation-list'), /client@findmycar\.example\.com/);
    A.click('#reservation-list button[data-cancel]');
    await A.waitFor(function () { return !A.$('#list-message').hidden; }, 'annulation admin');
    assert.equal(A.$$('#reservation-list button[data-cancel]').length, 0);
  });

  test('aucune erreur JavaScript', function () { assert.deepEqual(A.errors, []); });
});
