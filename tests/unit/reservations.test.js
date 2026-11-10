/* FIND MY CAR — tests/unit/reservations.test.js   (Lot : P7)
   Règles de réservation : prix, dates, chevauchement, compte, droits, persistance. */
suite('P7 — Règles de réservation (ReservationsRepo)', function () {
  var Q = ReservationsRepo.Q;
  var TODAY = TestApp.TODAY;
  var CLIENT_ID = 1; // comptes de démo : 1 = client, 2 = admin
  var ADMIN_ID = 2;
  var client = { userId: CLIENT_ID };
  function base() { return TestApp.freshDb([VehiculesRepo, Users, ReservationsRepo]); }
  function addClient(db, email) {
    return Users.Q.insertUser(db, { name: 'Autre Client', email: email, password_hash: 'a'.repeat(64), password_salt: 'b'.repeat(32), password_iterations: 600000 }).user;
  }
  function data(extra) { return Object.assign({}, client, extra); }

  test('réservation valide : au nom du compte, jours et prix calculés depuis la base', async function () {
    var db = await base();
    var res = Q.create(db, data({ vehicleId: 1, startDate: '2026-12-01', endDate: '2026-12-04', total_price: 1, customerName: 'Pirate' }), TODAY);
    assert.equal(res.ok, true, res.errors.join());
    assert.equal(res.reservation.days, 3);
    assert.equal(res.reservation.total_price, 117); // 3 × 39 € — le total fourni est ignoré
    assert.equal(res.reservation.customer_name, 'Client Démo'); // repris du compte
    assert.equal(res.reservation.status, 'active');
  });

  test('refus : dates incorrectes', async function () {
    var db = await base();
    assert.match(Q.create(db, data({ vehicleId: 1, startDate: '2026-11-01', endDate: '2026-11-12' }), TODAY).errors.join(), /antérieure à aujourd'hui/);
    assert.match(Q.create(db, data({ vehicleId: 1, startDate: '2026-12-05', endDate: '2026-12-01' }), TODAY).errors.join(), /postérieure/);
    assert.equal(Q.list(db).length, 0);
  });

  test('refus : sans compte, compte inconnu ou véhicule absent', async function () {
    var db = await base();
    var r = Q.create(db, { vehicleId: '', startDate: '2026-12-01', endDate: '2026-12-02' }, TODAY);
    assert.equal(r.ok, false);
    assert.equal(r.errors.length, 2);
    assert.equal(Q.create(db, { userId: 999, vehicleId: 1, startDate: '2026-12-01', endDate: '2026-12-02' }, TODAY).ok, false);
  });

  test('chevauchement refusé (tous comptes), bout à bout et autre véhicule acceptés', async function () {
    var db = await base();
    var autre = addClient(db, 'autre@exemple.fr');
    assert.equal(Q.create(db, data({ vehicleId: 2, startDate: '2026-12-10', endDate: '2026-12-15' }), TODAY).ok, true);
    var chevauche = Q.create(db, { userId: autre.id, vehicleId: 2, startDate: '2026-12-14', endDate: '2026-12-18' }, TODAY);
    assert.equal(chevauche.ok, false);
    assert.match(chevauche.errors.join(), /déjà réservé du 10\/12\/2026 au 15\/12\/2026/);
    assert.equal(Q.create(db, data({ vehicleId: 2, startDate: '2026-12-01', endDate: '2026-12-31' }), TODAY).ok, false);
    assert.equal(Q.create(db, data({ vehicleId: 2, startDate: '2026-12-15', endDate: '2026-12-17' }), TODAY).ok, true);
    assert.equal(Q.create(db, data({ vehicleId: 3, startDate: '2026-12-10', endDate: '2026-12-15' }), TODAY).ok, true);
  });

  test('contraintes SQLite : fin avant début, véhicule ou compte inexistant', async function () {
    var db = await base();
    function insert(v, u, s, e) {
      db.run("INSERT INTO reservations (vehicle_id, user_id, customer_name, customer_email, start_date, end_date, days, total_price, created_at) VALUES (?, ?, 'X', 'x@y.fr', ?, ?, 1, 39, 'now')", [v, u, s, e]);
    }
    assert.throws(function () { insert(1, 1, '2026-12-05', '2026-12-01'); }, /CHECK/);
    assert.throws(function () { insert(999, 1, '2026-12-01', '2026-12-02'); }, /FOREIGN KEY/);
    assert.throws(function () { insert(1, 999, '2026-12-01', '2026-12-02'); }, /FOREIGN KEY/);
  });

  test('droits : un client voit / annule ses réservations, l’admin tout', async function () {
    var db = await base();
    var autre = addClient(db, 'autre@exemple.fr');
    var c1 = Q.getUser(db, CLIENT_ID);
    var admin = Q.getUser(db, ADMIN_ID);
    var r1 = Q.create(db, { userId: c1.id, vehicleId: 1, startDate: '2026-12-01', endDate: '2026-12-03' }, TODAY).reservation;
    var r2 = Q.create(db, { userId: autre.id, vehicleId: 2, startDate: '2026-12-01', endDate: '2026-12-03' }, TODAY).reservation;
    assert.deepEqual(Q.listFor(db, c1).map(function (r) { return r.id; }), [r1.id]);
    assert.equal(Q.listFor(db, admin).length, 2);
    assert.deepEqual(Q.listFor(db, null), []);
    assert.equal(Q.countActiveForUser(db, c1.id), 1);
    assert.match(Q.cancel(db, r2.id, c1).error, /propres réservations/);
    assert.equal(Q.cancel(db, r2.id, null).ok, false);
    assert.equal(Q.cancel(db, r2.id, admin).ok, true);
    assert.equal(Q.getById(db, r2.id).status, 'cancelled');
    assert.ok(Q.getById(db, r2.id).cancelled_at);
    assert.match(Q.cancel(db, r2.id, admin).error, /déjà annulée/);
    assert.equal(Q.create(db, { userId: c1.id, vehicleId: 2, startDate: '2026-12-01', endDate: '2026-12-03' }, TODAY).ok, true);
  });

  test('persistance : export puis rechargement de la base (mécanisme IndexedDB)', async function () {
    var db = await base();
    Q.create(db, data({ vehicleId: 5, startDate: '2026-12-20', endDate: '2026-12-27' }), TODAY);
    var bytes = db.export();
    db.close();
    var SQL = await TestApp.loadSql();
    var reloaded = new SQL.Database(bytes);
    var list = Q.list(reloaded);
    assert.equal(list.length, 1);
    assert.equal(list[0].total_price, 7 * 59);
    assert.equal(Users.Q.getUserByEmail(reloaded, 'client@findmycar.example.com').role, 'client');
  });
});
