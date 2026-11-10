/* FIND MY CAR — tests/unit/utils.test.js   (Lot : P1, socle)
   Règles de calcul partagées : dates, prix, chevauchement, e-mail, HTML, raccourcis SQL. */
suite('P1 — Outils partagés (Utils)', function () {
  var TODAY = TestApp.TODAY;

  test('isValidISODate accepte les vraies dates et refuse les fausses', function () {
    assert.equal(Utils.isValidISODate('2026-12-31'), true);
    assert.equal(Utils.isValidISODate('2028-02-29'), true); // année bissextile
    assert.equal(Utils.isValidISODate('2026-02-30'), false);
    assert.equal(Utils.isValidISODate('31/12/2026'), false);
    assert.equal(Utils.isValidISODate(''), false);
  });

  test('countDays compte les nuits, y compris au changement d’heure', function () {
    assert.equal(Utils.countDays('2026-12-10', '2026-12-12'), 2);
    assert.equal(Utils.countDays('2026-12-31', '2027-01-01'), 1);
    assert.equal(Utils.countDays('2027-03-27', '2027-03-29'), 2);
  });

  test('computeTotal : prix × jours, arrondi au centime', function () {
    assert.equal(Utils.computeTotal(39, 3), 117);
    assert.equal(Utils.computeTotal(19.99, 3), 59.97);
  });

  test('validateDates : passé, fin = début, fin < début, date vide', function () {
    assert.deepEqual(Utils.validateDates('2026-11-10', '2026-11-11', TODAY), []);
    assert.match(Utils.validateDates('2026-11-09', '2026-11-12', TODAY)[0], /antérieure à aujourd'hui/);
    assert.match(Utils.validateDates('2026-11-15', '2026-11-15', TODAY)[0], /postérieure/);
    assert.match(Utils.validateDates('2026-11-15', '2026-11-12', TODAY)[0], /postérieure/);
    assert.equal(Utils.validateDates('', '2026-11-12', TODAY).length, 1);
  });

  test('periodsOverlap : fin exclue (départ le jour d’une restitution autorisé)', function () {
    assert.equal(Utils.periodsOverlap('2026-12-01', '2026-12-05', '2026-12-04', '2026-12-08'), true);
    assert.equal(Utils.periodsOverlap('2026-12-01', '2026-12-05', '2026-12-05', '2026-12-08'), false);
  });

  test('isValidEmail et escapeHTML (protection contre l’injection de code)', function () {
    assert.equal(Utils.isValidEmail('nom@exemple.fr'), true);
    assert.equal(Utils.isValidEmail('nom@exemple'), false);
    assert.equal(Utils.escapeHTML('<img src=x onerror=alert(1)>'), '&lt;img src=x onerror=alert(1)&gt;');
  });

  test('sqlAll / sqlGet / sqlRun sur une base SQLite en mémoire', async function () {
    var SQL = await TestApp.loadSql();
    var db = new SQL.Database();
    db.exec('CREATE TABLE t (id INTEGER PRIMARY KEY AUTOINCREMENT, nom TEXT)');
    assert.deepEqual(Utils.sqlRun(db, 'INSERT INTO t (nom) VALUES (?)', ['A']), { changes: 1, lastId: 1 });
    Utils.sqlRun(db, 'INSERT INTO t (nom) VALUES (?)', ['B']);
    assert.equal(Utils.sqlAll(db, 'SELECT * FROM t').length, 2);
    assert.equal(Utils.sqlGet(db, 'SELECT nom FROM t WHERE id = ?', [2]).nom, 'B');
    assert.equal(Utils.sqlGet(db, 'SELECT nom FROM t WHERE id = 99'), null);
  });
});
