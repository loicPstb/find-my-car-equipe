/* FIND MY CAR — tests/e2e/contact.test.js   (Lot : P8)
   Onglet Nous contacter : coordonnées, contrôles, lien mailto, message honnête.
   Ne dépend d'aucun autre lot (hors socle). */
suite('P8 — Onglet Nous contacter', function () {
  var A = TestApp;
  before(async function () { await A.reset(); await A.open('contact'); });

  test('coordonnées fictives affichées', function () {
    assert.equal(A.visiblePanel(), 'contact');
    assert.match(A.text('#contact-details'), /contact@findmycar\.example\.com/);
  });

  test('formulaire vide : 4 champs en erreur ; e-mail invalide : seul ce champ', function () {
    A.click('#contact-form button[type="submit"]');
    assert.match(A.$('#contact-message').className, /alert-error/);
    assert.equal(A.$$('#contact-form [aria-invalid="true"]').length, 4);
    A.setValue('#contact-name', 'Client Démo');
    A.setValue('#contact-email', 'client.exemple.fr');
    A.setValue('#contact-subject', 'Question sur la Zoe');
    A.setValue('#contact-body', 'Bonjour, la Renault Zoe est-elle disponible avec un câble de recharge ?');
    A.click('#contact-form button[type="submit"]');
    assert.match(A.text('#contact-message'), /format de l’adresse e-mail est invalide/);
    assert.deepEqual(A.$$('#contact-form [aria-invalid="true"]').map(function (x) { return x.id; }), ['contact-email']);
  });

  test('formulaire valide : lien mailto correct, sans prétendre que le message est envoyé', function () {
    var opened = null;
    A.win().Contact.openMailClient = function (url) { opened = url; };
    A.setValue('#contact-email', 'client.demo@exemple.fr');
    A.click('#contact-form button[type="submit"]');
    assert.ok(opened && opened.indexOf('mailto:contact@findmycar.example.com?subject=') === 0);
    assert.match(decodeURIComponent(opened), /\[FIND MY CAR\] Question sur la Zoe/);
    assert.match(decodeURIComponent(opened), /E-mail : client\.demo@exemple\.fr/);
    assert.match(A.$('#contact-message').className, /alert-info/);
    assert.match(A.text('#contact-message'), /aucun message n’est parti/);
    assert.doesNotMatch(A.text('#contact-message'), /envoyé avec succès|a bien été envoyé/i);
  });

  test('sécurité : un texte piégé n’est jamais exécuté (protection HTML)', function () {
    A.setValue('#contact-name', '<img src=x onerror=alert(1)>');
    A.setValue('#contact-email', 'pas-un-email');
    A.click('#contact-form button[type="submit"]');
    assert.equal(A.$$('#contact-message img').length, 0);
  });

  test('aucune erreur JavaScript', function () { assert.deepEqual(A.errors, []); });
});
