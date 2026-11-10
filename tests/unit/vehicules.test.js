/* FIND MY CAR — tests/unit/vehicules.test.js   (Lot : P3)
   Table vehicles, catalogue de démonstration, filtres, photos Wikimedia Commons. */
suite('P3 — Données véhicules et photos', function () {
  var Q = VehiculesRepo.Q;

  test('catalogue : au moins 8 véhicules, tous avec dessin de secours et photo Commons', async function () {
    var db = await TestApp.freshDb([VehiculesRepo]);
    var all = Q.getVehicles(db, {});
    assert.ok(all.length >= 8);
    assert.equal(all.length, VehiculesRepo.SEED.length);
    all.forEach(function (v) {
      assert.match(v.image, /^img\/vehicules\/.+\.svg$/);
      assert.match(v.photo_file, /\.(jpe?g|png)$/i, 'photo_file pour ' + v.model);
    });
    VehiculesRepo.seed(db); // pas de doublon si rappelé
    assert.equal(Q.getVehicles(db, {}).length, VehiculesRepo.SEED.length);
  });

  test('contraintes CHECK : catégorie et prix invalides refusés', async function () {
    var db = await TestApp.freshDb([VehiculesRepo]);
    assert.throws(function () { db.run("INSERT INTO vehicles (brand, model, category, daily_price, seats, transmission, fuel, image) VALUES ('A','B','Avion',10,5,'Manuelle','Essence','x')"); }, /CHECK/);
    assert.throws(function () { db.run("INSERT INTO vehicles (brand, model, category, daily_price, seats, transmission, fuel, image) VALUES ('A','B','SUV',0,5,'Manuelle','Essence','x')"); }, /CHECK/);
  });

  test('catégories triées à la française et filtres catégorie / prix', async function () {
    var db = await TestApp.freshDb([VehiculesRepo]);
    assert.deepEqual(Q.getCategories(db), ['Citadine', 'Compacte', 'Électrique', 'Monospace', 'Premium', 'SUV', 'Utilitaire']);
    var suv = Q.getVehicles(db, { category: 'SUV' });
    assert.ok(suv.length > 0 && suv.every(function (v) { return v.category === 'SUV'; }));
    assert.ok(Q.getVehicles(db, { priceRange: 'eco' }).every(function (v) { return v.daily_price < 50; }));
    assert.ok(Q.getVehicles(db, { priceRange: 'mid' }).every(function (v) { return v.daily_price >= 50 && v.daily_price <= 80; }));
    assert.ok(Q.getVehicles(db, { priceRange: 'high' }).every(function (v) { return v.daily_price > 80; }));
    var total = ['eco', 'mid', 'high'].reduce(function (n, r) { return n + Q.getVehicles(db, { priceRange: r }).length; }, 0);
    assert.equal(total, VehiculesRepo.SEED.length); // chaque véhicule dans exactement une gamme
    assert.deepEqual(Q.getVehicles(db, { category: 'Utilitaire', priceRange: 'eco' }), []);
    assert.equal(Q.getVehicleById(db, 4).model, 'Golf 8');
    assert.equal(Q.getVehicleById(db, 999), null);
  });

  test('photos : adresse de l’API Commons (une seule requête, crédits demandés)', function () {
    var url = Photos.buildApiUrl(['Renault Clio V 1X7A0392.jpg', 'Citroën Berlingo III IMG 9223.jpg']);
    assert.ok(url.indexOf('https://commons.wikimedia.org/w/api.php?') === 0);
    assert.match(url, /origin=\*/);       // autorise l'appel depuis le navigateur (CORS)
    assert.match(url, /extmetadata/);     // auteur et licence
    assert.match(url, /iiurlwidth=640/);  // vignette légère
    assert.equal(new URL(url).searchParams.get('titles'), 'File:Renault Clio V 1X7A0392.jpg|File:Citroën Berlingo III IMG 9223.jpg');
  });

  test('photos : lecture de la réponse Commons (auteur, licence, fichiers absents ou sans crédit)', function () {
    var out = Photos.parseApiResponse({ query: {
      normalized: [{ from: 'File:Renault_Clio_V_1X7A0392.jpg', to: 'File:Renault Clio V 1X7A0392.jpg' }],
      pages: [
        { title: 'File:Renault Clio V 1X7A0392.jpg', imageinfo: [{ thumburl: 'https://upload.wikimedia.org/a.jpg', descriptionurl: 'https://commons.wikimedia.org/wiki/File:A',
          extmetadata: { Artist: { value: '<a href="//x">Jean&nbsp;Dupont</a>' }, LicenseShortName: { value: 'CC BY-SA 4.0' }, LicenseUrl: { value: 'https://creativecommons.org/licenses/by-sa/4.0' } } }] },
        { title: 'File:Inexistant.jpg', missing: true },
        { title: 'File:Sans credit.jpg', imageinfo: [{ thumburl: 'https://upload.wikimedia.org/b.jpg', extmetadata: {} }] }
      ] } });
    assert.deepEqual(Object.keys(out), ['Renault Clio V 1X7A0392.jpg']);
    var p = out['Renault Clio V 1X7A0392.jpg'];
    assert.equal(p.author, 'Jean Dupont');
    assert.equal(p.licence, 'CC BY-SA 4.0');
    assert.equal(p.src, 'https://upload.wikimedia.org/a.jpg');
    assert.deepEqual(Photos.parseApiResponse({}), {});
  });

  test('photos : dessin de secours si pas de photo, texte HTML nettoyé', function () {
    Photos.clear();
    var img = Photos.imageFor({ brand: 'Renault', model: 'Clio V', image: 'img/vehicules/renault-clio.svg', photo_file: 'X.jpg' });
    assert.equal(img.isPhoto, false);
    assert.equal(img.src, 'img/vehicules/renault-clio.svg');
    assert.equal(img.creditHTML, 'Illustration générique');
    assert.equal(Photos.textFromHtml('<b>A</b> &amp; <i>B</i>'), 'A & B');
  });
});
