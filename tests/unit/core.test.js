/* FIND MY CAR — tests/unit/core.test.js   (Lot : P2)
   Moteur de base : enregistrement des modules, création, requêtes, sauvegarde, réinitialisation.
   ⚠️ Utilise la vraie base IndexedDB « findmycar » de ce navigateur (puis la réinitialise). */
suite('P2 — Moteur de base de données (DB)', function () {
  before(function () { return TestApp.reset(); });

  test('init : tables et données de chaque module enregistré, empreinte enregistrée', async function () {
    DB.register({ name: 'test_marques', version: 1, schema: 'CREATE TABLE IF NOT EXISTS test_marques (id INTEGER PRIMARY KEY, nom TEXT NOT NULL);',
      seed: function (db) { db.run("INSERT INTO test_marques (nom) VALUES ('Renault'), ('Peugeot')"); } });
    DB.register({ name: 'test_modeles', version: 1, schema: 'CREATE TABLE IF NOT EXISTS test_modeles (id INTEGER PRIMARY KEY, marque_id INTEGER NOT NULL REFERENCES test_marques(id), nom TEXT);' });
    var info = await DB.init();
    assert.equal(info.restored, false);
    assert.ok(DB.modules().indexOf('test_marques') !== -1 && DB.modules().indexOf('test_modeles') !== -1);
    assert.equal(DB.all('SELECT * FROM test_marques').length, 2);
    assert.match(DB.get("SELECT value FROM fmc_meta WHERE key = 'modules'").value, /test_marques@1,test_modeles@1$/);
  });

  test('run / get / all et clés étrangères actives', function () {
    var r = DB.run('INSERT INTO test_modeles (marque_id, nom) VALUES (?, ?)', [1, 'Clio']);
    assert.equal(r.changes, 1);
    assert.equal(DB.get('SELECT nom FROM test_modeles WHERE id = ?', [r.lastId]).nom, 'Clio');
    assert.throws(function () { DB.run('INSERT INTO test_modeles (marque_id, nom) VALUES (999, ?)', ['X']); }, /FOREIGN KEY/);
  });

  test('save puis nouvel init : la base est retrouvée dans IndexedDB', async function () {
    await DB.save();
    if (!DB.isPersistent()) return; // navigation privée : rien à vérifier
    var info = await DB.init();
    assert.equal(info.restored, true);
    assert.equal(DB.all('SELECT * FROM test_modeles').length, 1);
  });

  test('reset recrée la base de démonstration', async function () {
    DB.run("INSERT INTO test_marques (nom) VALUES ('Dacia')");
    await DB.reset();
    assert.equal(DB.all('SELECT * FROM test_marques').length, 2);
    assert.equal(DB.all('SELECT * FROM test_modeles').length, 0);
  });

  test('register refuse un module sans nom', function () {
    assert.throws(function () { DB.register({}); }, /nom de module/);
  });

  after(function () { return TestApp.reset(); });
});
