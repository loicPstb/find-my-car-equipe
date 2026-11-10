/* ==========================================================================
   FIND MY CAR — js/db/reservations.repo.js
   --------------------------------------------------------------------------
   Lot : P7 (réservations).
   Rôle : table « reservations » et règles métier :
     - calcul du nombre de jours et du prix (toujours depuis la base) ;
     - contrôles : dates valides, début ≥ aujourd'hui, fin > début ;
     - pas de chevauchement avec une réservation ACTIVE du même véhicule
       (tous comptes confondus) ;
     - réservation au nom du compte connecté ;
     - droits : un client ne voit / n'annule que ses réservations, l'admin tout.
   Q : fonctions SQL « pures » (base en paramètre) → testables dans la page tests/.
   ReservationsRepo : API navigateur (base ouverte par DB, + sauvegarde).
   Contrat : docs/CONTRAT-INTERFACES.md (section P7).
   Dépendances : js/utils.js, js/db/core.js (DB). Les tables vehicles (P3) et
   users (P5) doivent exister : ce module s'enregistre APRÈS eux.
   ========================================================================== */

(function (global) {
  'use strict';

  var Utils = global.Utils;

  var SCHEMA = [
    'CREATE TABLE IF NOT EXISTS reservations (',
    '  id             INTEGER PRIMARY KEY AUTOINCREMENT,',
    '  vehicle_id     INTEGER NOT NULL REFERENCES vehicles(id) ON DELETE RESTRICT,',
    '  user_id        INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,',
    // Nom et e-mail recopiés depuis le compte (historique conservé)
    '  customer_name  TEXT    NOT NULL CHECK (length(trim(customer_name)) > 0),',
    "  customer_email TEXT    NOT NULL CHECK (customer_email LIKE '%_@_%._%'),",
    '  start_date     TEXT    NOT NULL CHECK (date(start_date) IS NOT NULL),',  // AAAA-MM-JJ
    '  end_date       TEXT    NOT NULL CHECK (date(end_date) IS NOT NULL),',    // jour de restitution
    '  days           INTEGER NOT NULL CHECK (days > 0),',
    '  total_price    REAL    NOT NULL CHECK (total_price > 0),',
    "  status         TEXT    NOT NULL DEFAULT 'active' CHECK (status IN ('active','cancelled')),",
    '  created_at     TEXT    NOT NULL,',
    '  cancelled_at   TEXT,',
    '  CHECK (end_date > start_date)',
    ');',
    'CREATE INDEX IF NOT EXISTS idx_reservations_vehicle ON reservations (vehicle_id, status, start_date, end_date);',
    'CREATE INDEX IF NOT EXISTS idx_reservations_user ON reservations (user_id);'
  ].join('\n');

  var SELECT_WITH_VEHICLE =
    'SELECT r.*, v.brand, v.model, v.image, v.photo_file, v.daily_price FROM reservations r ' +
    'JOIN vehicles v ON v.id = r.vehicle_id';

  /* ---------------- Requêtes « pures » (base en paramètre) ---------------- */
  var Q = {
    getVehicle: function (db, id) {
      return Utils.sqlGet(db, 'SELECT * FROM vehicles WHERE id = ?', [Number(id)]);
    },
    getUser: function (db, id) {
      return Utils.sqlGet(db, 'SELECT id, name, email, role FROM users WHERE id = ?', [Number(id)]);
    },

    /** Réservations ACTIVES du véhicule qui chevauchent [start, end[ (fin exclue). */
    findOverlapping: function (db, vehicleId, startDate, endDate) {
      return Utils.sqlAll(db,
        "SELECT * FROM reservations WHERE vehicle_id = ? AND status = 'active' " +
        'AND start_date < ? AND ? < end_date ORDER BY start_date',
        [Number(vehicleId), endDate, startDate]);
    },

    /**
     * Devis : contrôles + jours + prix. NE MODIFIE PAS la base.
     * @returns {{ok, errors, vehicle, days, total, conflicts}}
     */
    quote: function (db, data, today) {
      var errors = [];
      var vehicle = data.vehicleId ? Q.getVehicle(db, data.vehicleId) : null;
      if (!vehicle) errors.push('Veuillez sélectionner un véhicule.');
      var dateErrors = Utils.validateDates(data.startDate, data.endDate, today);
      errors = errors.concat(dateErrors);

      var result = { ok: false, errors: errors, vehicle: vehicle, days: 0, total: 0, conflicts: [] };
      if (vehicle && dateErrors.length === 0) {
        result.days = Utils.countDays(data.startDate, data.endDate);
        result.total = Utils.computeTotal(vehicle.daily_price, result.days); // prix lu dans la base
        result.conflicts = Q.findOverlapping(db, vehicle.id, data.startDate, data.endDate);
        if (result.conflicts.length > 0) {
          var c = result.conflicts[0];
          errors.push('Ce véhicule est déjà réservé du ' + Utils.formatDateFR(c.start_date) +
            ' au ' + Utils.formatDateFR(c.end_date) + '. Choisissez une autre période ou un autre véhicule.');
        }
      }
      result.ok = errors.length === 0;
      return result;
    },

    /**
     * Crée une réservation au nom du compte data.userId, après TOUS les contrôles.
     * @param {{vehicleId, startDate, endDate, userId}} data
     */
    create: function (db, data, today) {
      var errors = [];
      var user = data.userId ? Q.getUser(db, data.userId) : null;
      if (!user) errors.push('Vous devez être connecté pour réserver.');
      var q = Q.quote(db, data, today);
      errors = errors.concat(q.errors);
      if (errors.length > 0) return { ok: false, errors: errors };
      var res = Utils.sqlRun(db,
        'INSERT INTO reservations (vehicle_id, user_id, customer_name, customer_email, start_date, end_date, days, total_price, status, created_at) ' +
        "VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', ?)",
        [q.vehicle.id, user.id, user.name, user.email, data.startDate, data.endDate, q.days, q.total, new Date().toISOString()]);
      return { ok: true, errors: [], reservation: Q.getById(db, res.lastId) };
    },

    getById: function (db, id) {
      return Utils.sqlGet(db, SELECT_WITH_VEHICLE + ' WHERE r.id = ?', [Number(id)]);
    },

    /** Réservations (actives d'abord). filter.userId : seulement ce compte. */
    list: function (db, filter) {
      var sql = SELECT_WITH_VEHICLE;
      var params = [];
      if (filter && filter.userId) {
        sql += ' WHERE r.user_id = ?';
        params.push(Number(filter.userId));
      }
      return Utils.sqlAll(db, sql + " ORDER BY CASE r.status WHEN 'active' THEN 0 ELSE 1 END, r.start_date, r.id", params);
    },

    /** Ce qu'un compte a le droit de voir : tout pour l'admin, les siennes sinon. */
    listFor: function (db, user) {
      if (!user) return [];
      return user.role === 'admin' ? Q.list(db) : Q.list(db, { userId: user.id });
    },

    countActiveForUser: function (db, userId) {
      return Utils.sqlGet(db, "SELECT COUNT(*) AS n FROM reservations WHERE user_id = ? AND status = 'active'", [Number(userId)]).n;
    },

    /** Annulation (historique conservé). Un client : ses réservations ; l'admin : toutes. */
    cancel: function (db, id, user) {
      var r = Q.getById(db, id);
      if (!user) return { ok: false, error: 'Vous devez être connecté.' };
      if (!r) return { ok: false, error: 'Réservation introuvable.' };
      if (user.role !== 'admin' && r.user_id !== user.id) {
        return { ok: false, error: 'Vous ne pouvez annuler que vos propres réservations.' };
      }
      if (r.status !== 'active') return { ok: false, error: 'Cette réservation est déjà annulée.' };
      var res = Utils.sqlRun(db,
        "UPDATE reservations SET status = 'cancelled', cancelled_at = ? WHERE id = ? AND status = 'active'",
        [new Date().toISOString(), Number(id)]);
      return { ok: res.changes === 1 };
    }
  };

  /* ---------------- API navigateur ---------------- */
  function db() { return global.DB.handle(); }

  var ReservationsRepo = {
    NAME: 'reservations',
    VERSION: 1,
    SCHEMA: SCHEMA,
    Q: Q,
    quote:              function (data)     { return Q.quote(db(), data, Utils.todayISO()); },
    listFor:            function (user)     { return Q.listFor(db(), user); },
    countActiveForUser: function (userId)   { return Q.countActiveForUser(db(), userId); },

    /** Crée puis sauvegarde. → Promise<{ok, errors, reservation?}> */
    create: function (data) {
      var result = Q.create(db(), data, Utils.todayISO());
      if (!result.ok) return Promise.resolve(result);
      return global.DB.save().then(function () { return result; });
    },

    /** Annule (si autorisé) puis sauvegarde. → Promise<{ok, error?}> */
    cancel: function (id, user) {
      var result = Q.cancel(db(), id, user);
      if (!result.ok) return Promise.resolve(result);
      return global.DB.save().then(function () { return result; });
    }
  };

  global.ReservationsRepo = ReservationsRepo;
  // Enregistrement auprès du moteur de base (si le lot P2 est déjà fusionné)
  if (global.DB) global.DB.register({ name: ReservationsRepo.NAME, version: ReservationsRepo.VERSION, schema: SCHEMA });
})(window);
