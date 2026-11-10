/* FIND MY CAR — tests/unit/utilisateurs.test.js   (Lot : P5)
   Table users, comptes de démonstration, inscription et connexion.
   N'a PAS besoin du lot P2 : une petite « fausse » DB est utilisée. */
suite('P5 — Comptes (Users)', function () {
  var Q = Users.Q;

  test('comptes de démonstration : mots de passe documentés valides, rôles corrects', async function () {
    var db = await TestApp.freshDb([Users]);
    var client = Q.getUserByEmail(db, 'client@findmycar.example.com');
    var admin = Q.getUserByEmail(db, 'ADMIN@findmycar.example.com'); // insensible à la casse
    assert.equal(client.role, 'client');
    assert.equal(admin.role, 'admin');
    assert.equal(await Auth.verifyPassword('ClientDemo2026!', client), true);
    assert.equal(await Auth.verifyPassword('AdminDemo2026!', admin), true);
    assert.equal(await Auth.verifyPassword('AdminDemo2026!', client), false);
    var pub = Q.getUserById(db, admin.id);
    assert.equal(pub.password_hash, undefined); // jamais exposé
    assert.equal(pub.password_salt, undefined);
  });

  test('contraintes : mot de passe en clair, rôle inconnu et e-mail en double refusés', async function () {
    var db = await TestApp.freshDb([Users]);
    assert.throws(function () { db.run("INSERT INTO users (name, email, password_hash, password_salt, password_iterations, created_at) VALUES ('Test', 't@t.fr', 'motdepasse', ?, 600000, 'now')", ['c'.repeat(32)]); }, /CHECK/);
    assert.throws(function () { db.run("INSERT INTO users (name, email, password_hash, password_salt, password_iterations, role, created_at) VALUES ('Test', 't@t.fr', ?, ?, 600000, 'superadmin', 'now')", ['a'.repeat(64), 'c'.repeat(32)]); }, /CHECK/);
    var u = { name: 'Nouveau', email: 'Nouveau@Exemple.fr', password_hash: 'a'.repeat(64), password_salt: 'b'.repeat(32), password_iterations: 600000 };
    assert.equal(Q.insertUser(db, u).ok, true);
    assert.equal(Q.getUserByEmail(db, 'nouveau@exemple.fr').email, 'nouveau@exemple.fr'); // normalisé
    var doublon = Q.insertUser(db, Object.assign({}, u, { email: ' NOUVEAU@exemple.fr ' }));
    assert.equal(doublon.ok, false);
    assert.match(doublon.errors[0], /existe déjà/);
  });

  test('Users.register / login : rôle client imposé, message générique, blocage', async function () {
    var db = await TestApp.freshDb([Users]);
    var realDB = window.DB;
    window.DB = { handle: function () { return db; }, save: function () { return Promise.resolve(true); } }; // fausse DB
    try {
      var dup = await Users.register({ name: 'Jeanne Test', email: 'client@findmycar.example.com', password: 'Voiture2026', passwordConfirm: 'Voiture2026' });
      assert.equal(dup.ok, false);
      assert.match(dup.errors[0].message, /existe déjà/);
      var reg = await Users.register({ name: 'Jeanne Test', email: 'Jeanne.Unit@Exemple.fr', password: 'Voiture2026', passwordConfirm: 'Voiture2026' });
      assert.equal(reg.ok, true);
      assert.equal(reg.user.role, 'client');
      assert.equal(reg.user.password_hash, undefined);
      assert.equal((await Users.login('jeanne.unit@exemple.fr', 'Voiture2026')).ok, true);
      var wrong = await Users.login('jeanne.unit@exemple.fr', 'Mauvais123');
      var unknown = await Users.login('inconnu.unit@exemple.fr', 'Voiture2026');
      assert.equal(wrong.ok, false);
      assert.equal(wrong.error, unknown.error); // ne révèle pas si le compte existe
      for (var i = 0; i < 4; i++) await Users.login('jeanne.unit@exemple.fr', 'Mauvais123');
      var locked = await Users.login('jeanne.unit@exemple.fr', 'Voiture2026');
      assert.equal(locked.ok, false);
      assert.match(locked.error, /Trop de tentatives/);
      assert.equal((await Users.login('admin@findmycar.example.com', 'AdminDemo2026!')).user.role, 'admin');
    } finally {
      window.DB = realDB;
    }
  });
});
