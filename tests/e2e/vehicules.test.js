/* FIND MY CAR — tests/e2e/vehicules.test.js   (Lot : P4)
   Onglet Véhicules : catalogue, photos + crédits (simulés), dessins de secours,
   filtres, fenêtre de détails, bouton « Réserver ». Dépend de P2 et P3. */
suite('P4 — Onglet Véhicules', function () {
  var A = TestApp;
  before(async function () {
    await A.reset();
    await A.open('vehicules', { photos: 'fake' });
    await A.waitFor(function () { return A.$$('.vehicle-card').length > 0; }, 'cartes véhicules');
  });

  test('affichage : 11 cartes complètes et chiffres d’accueil', function () {
    var cards = A.$$('.vehicle-card');
    assert.equal(cards.length, 11);
    cards.forEach(function (c) {
      assert.ok(c.querySelector('h3').textContent.trim().length > 0);
      assert.match(c.querySelector('.price strong').textContent, /€/);
      assert.ok(c.querySelector('.badge').textContent.length > 0);
    });
    assert.equal(A.text('#stat-count'), '11');
    assert.equal(A.clean(A.text('#stat-min')), '39,00€');
  });

  test('photos : chaque carte affiche la photo et son crédit (auteur + licence + source)', async function () {
    await A.waitFor(function () { return A.$$('.vehicle-card img').every(function (i) { return i.dataset.photo === '1'; }); }, 'photos');
    A.$$('.vehicle-card .photo-credit').forEach(function (c) {
      assert.match(c.textContent, /^Photo : Auteur Test \d+ — CC BY-SA 4\.0 — Wikimedia Commons$/);
      assert.equal(c.querySelectorAll('a').length, 2); // lien licence + lien source
    });
  });

  test('filtres : catégorie, prix, aucun résultat, réinitialisation', async function () {
    A.select('#filter-category', 'SUV');
    var cats = A.$$('.vehicle-card .badge').map(function (e) { return e.textContent; });
    assert.ok(cats.length > 0 && cats.every(function (c) { return c === 'SUV'; }));
    assert.match(A.text('#vehicle-count'), new RegExp('^' + cats.length + ' véhicule'));
    A.select('#filter-category', 'all');
    A.select('#filter-price', 'eco');
    var prices = A.$$('.vehicle-card .price strong').map(function (e) { return parseFloat(e.textContent.replace(/[^\d,]/g, '').replace(',', '.')); });
    assert.ok(prices.length > 0 && prices.every(function (x) { return x < 50; }));
    A.select('#filter-category', 'Utilitaire');
    assert.equal(A.$$('.vehicle-card').length, 0);
    assert.equal(A.$('#vehicle-empty').hidden, false);
    A.click('#filters button[type="reset"]');
    await A.waitFor(function () { return A.$$('.vehicle-card').length === 11; }, 'réinitialisation des filtres');
  });

  test('détails puis « Réserver » : ouvre l’onglet Réservation', async function () {
    A.click('button[data-action="details"][data-id="4"]');
    assert.equal(A.$('#vehicle-dialog').open, true);
    assert.equal(A.text('#dialog-title'), 'Volkswagen Golf 8');
    assert.match(A.clean(A.text('#dialog-price')), /55,00€/);
    assert.match(A.text('#dialog-credit'), /Photo : Auteur Test/);
    A.click('#dialog-reserve');
    assert.equal(A.$('#vehicle-dialog').open, false);
    assert.equal(A.visiblePanel(), 'reservation');
    if (A.win().App.isActive('reservation')) assert.equal(A.$('#res-vehicle').value, '4'); // si P7 est fusionné
    await A.goTab('vehicules');
    A.click('button[data-action="reserve"][data-id="7"]');
    assert.equal(A.visiblePanel(), 'reservation');
  });

  test('sans Internet : les dessins de secours remplacent les photos', async function () {
    await A.open('vehicules', { photos: 'off' });
    await A.waitFor(function () { return A.$$('.vehicle-card').length === 11; }, 'cartes');
    assert.ok(A.$$('.vehicle-card img').every(function (i) { return /^img\/vehicules\/.+\.svg$/.test(i.getAttribute('src')); }));
    assert.ok(A.$$('.vehicle-card .photo-credit').every(function (c) { return c.textContent === 'Illustration générique'; }));
  });

  test('aucune erreur JavaScript', function () { assert.deepEqual(A.errors, []); });
});
