/* ==========================================================================
   FIND MY CAR — js/db/vehicules.repo.js
   --------------------------------------------------------------------------
   Lot : P3 (données véhicules et photos).
   Rôle : table « vehicles », catalogue de démonstration (11 véhicules) et
   requêtes du catalogue (catégories, filtres, détail).
   Chaque véhicule a :
     - image       : dessin générique de secours (img/vehicules/*.svg)
     - photo_file  : nom d'un fichier Wikimedia Commons (photo réelle sous
                     licence libre, affichée avec son crédit par js/photos.js)
   Organisation (même modèle pour tous les dépôts) :
     - Q : fonctions SQL « pures » qui reçoivent la base en paramètre
           → testables dans la page tests/ (tests/unit/vehicules.test.js)
     - API navigateur : mêmes fonctions appliquées à la base ouverte (DB).
   Contrat : docs/CONTRAT-INTERFACES.md (section P3).
   Dépendances : js/utils.js, js/db/core.js (DB).
   ========================================================================== */

(function (global) {
  'use strict';

  var Utils = global.Utils;

  var CATEGORIES = ['Citadine', 'Compacte', 'SUV', 'Électrique', 'Monospace', 'Utilitaire', 'Premium'];

  var SCHEMA = [
    'CREATE TABLE IF NOT EXISTS vehicles (',
    '  id            INTEGER PRIMARY KEY,',
    '  brand         TEXT    NOT NULL,',
    '  model         TEXT    NOT NULL,',
    "  category      TEXT    NOT NULL CHECK (category IN ('" + CATEGORIES.join("','") + "')),",
    '  daily_price   REAL    NOT NULL CHECK (daily_price > 0),',
    '  seats         INTEGER NOT NULL CHECK (seats BETWEEN 1 AND 9),',
    "  transmission  TEXT    NOT NULL CHECK (transmission IN ('Manuelle','Automatique')),",
    '  fuel          TEXT    NOT NULL,',
    '  image         TEXT    NOT NULL,',   // dessin de secours (toujours disponible)
    '  photo_file    TEXT,',               // fichier Wikimedia Commons (facultatif)
    "  description   TEXT    NOT NULL DEFAULT ''",
    ');'
  ].join('\n');

  /**
   * Catalogue fictif. Les photos sont des fichiers Wikimedia Commons sous licence
   * libre : l'auteur et la licence sont lus à l'affichage via l'API Commons
   * (voir js/photos.js) et vérifiables avec la page outils/verifier-photos.html
   */
  var SEED = [
    { id: 1,  brand: 'Renault',    model: 'Clio V',        category: 'Citadine',   daily_price: 39,  seats: 5, transmission: 'Manuelle',    fuel: 'Essence',    image: 'img/vehicules/renault-clio.svg',      photo_file: 'Renault Clio V 1X7A0392.jpg',                    description: 'Citadine agile et économique, idéale pour la ville et les trajets courts.' },
    { id: 2,  brand: 'Peugeot',    model: '208',           category: 'Citadine',   daily_price: 42,  seats: 5, transmission: 'Automatique', fuel: 'Essence',    image: 'img/vehicules/peugeot-208.svg',       photo_file: 'Peugeot 208 II GT Line rouge (avant).jpg',       description: 'Boîte automatique et équipements modernes pour circuler en toute sérénité.' },
    { id: 3,  brand: 'Toyota',     model: 'Yaris Hybride', category: 'Citadine',   daily_price: 45,  seats: 5, transmission: 'Automatique', fuel: 'Hybride',    image: 'img/vehicules/toyota-yaris.svg',      photo_file: 'Toyota Yaris Hybrid (XP210) 1X7A0353.jpg',       description: 'Motorisation hybride très sobre, parfaite pour la circulation urbaine.' },
    { id: 4,  brand: 'Volkswagen', model: 'Golf 8',        category: 'Compacte',   daily_price: 55,  seats: 5, transmission: 'Manuelle',    fuel: 'Diesel',     image: 'img/vehicules/volkswagen-golf.svg',   photo_file: 'Volkswagen Golf VIII Facelift IMG 8947.jpg',     description: 'Compacte polyvalente et confortable, à l’aise sur autoroute.' },
    { id: 5,  brand: 'Dacia',      model: 'Duster',        category: 'SUV',        daily_price: 59,  seats: 5, transmission: 'Manuelle',    fuel: 'Diesel',     image: 'img/vehicules/dacia-duster.svg',      photo_file: 'Dacia Duster II Facelift IAA 2021 1X7A0133.jpg', description: 'SUV robuste au meilleur rapport qualité-prix, pour la ville comme la campagne.' },
    { id: 6,  brand: 'Peugeot',    model: '3008',          category: 'SUV',        daily_price: 79,  seats: 5, transmission: 'Automatique', fuel: 'Hybride',    image: 'img/vehicules/peugeot-3008.svg',      photo_file: 'Peugeot 3008 BlueHDi 150 Allure (II) – Frontansicht (1), 2. Dezember 2017, Düsseldorf.jpg', description: 'SUV familial spacieux avec grand coffre, idéal pour les vacances.' },
    { id: 7,  brand: 'Renault',    model: 'Zoe',           category: 'Électrique', daily_price: 49,  seats: 5, transmission: 'Automatique', fuel: 'Électrique', image: 'img/vehicules/renault-zoe.svg',       photo_file: '2020 Renault Zoe Intens R135 Z.E. 50.jpg',       description: '100 % électrique, silencieuse, autonomie adaptée aux trajets quotidiens.' },
    { id: 8,  brand: 'Tesla',      model: 'Model 3',       category: 'Électrique', daily_price: 95,  seats: 5, transmission: 'Automatique', fuel: 'Électrique', image: 'img/vehicules/tesla-model3.svg',      photo_file: '2019 Tesla Model 3 Long Range Dual Motor in Red Multi-Coat, front left, 2021-05-30.jpg', description: 'Berline électrique performante avec grande autonomie pour les longs trajets.' },
    { id: 9,  brand: 'Citroën',    model: 'Berlingo',      category: 'Monospace',  daily_price: 65,  seats: 7, transmission: 'Manuelle',    fuel: 'Diesel',     image: 'img/vehicules/citroen-berlingo.svg',  photo_file: 'Citroën Berlingo III IMG 9223.jpg',              description: 'Ludospace 7 places, pratique pour les familles nombreuses et les bagages.' },
    { id: 10, brand: 'Renault',    model: 'Trafic',        category: 'Utilitaire', daily_price: 85,  seats: 3, transmission: 'Manuelle',    fuel: 'Diesel',     image: 'img/vehicules/renault-trafic.svg',    photo_file: 'Renault Trafic III (2017).jpg',                  description: 'Fourgon utilitaire 6 m³, pour déménagements et transports de matériel.' },
    { id: 11, brand: 'Mercedes',   model: 'Classe C',      category: 'Premium',    daily_price: 120, seats: 5, transmission: 'Automatique', fuel: 'Diesel',     image: 'img/vehicules/mercedes-classe-c.svg', photo_file: 'Mercedes-Benz C 200 AVANTGARDE (W206) front.jpg', description: 'Berline haut de gamme au confort raffiné, pour vos déplacements d’affaires.' }
  ];

  /** Gammes de prix du filtre. */
  var PRICE_RANGES = {
    all:  { label: 'Tous les prix',      min: 0,     max: null },
    eco:  { label: 'Moins de 50 €/jour', min: 0,     max: 49.99 },
    mid:  { label: '50 € à 80 €/jour',   min: 50,    max: 80 },
    high: { label: 'Plus de 80 €/jour',  min: 80.01, max: null }
  };

  /** Insère le catalogue (si la table est vide). */
  function seed(db) {
    if (Utils.sqlGet(db, 'SELECT COUNT(*) AS n FROM vehicles').n > 0) return;
    db.exec('BEGIN TRANSACTION;');
    try {
      SEED.forEach(function (v) {
        Utils.sqlRun(db,
          'INSERT INTO vehicles (id, brand, model, category, daily_price, seats, transmission, fuel, image, photo_file, description) ' +
          'VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [v.id, v.brand, v.model, v.category, v.daily_price, v.seats, v.transmission, v.fuel, v.image, v.photo_file, v.description]);
      });
      db.exec('COMMIT;');
    } catch (e) {
      db.exec('ROLLBACK;');
      throw e;
    }
  }

  /* ---------------- Requêtes « pures » (base en paramètre) ---------------- */
  var Q = {
    /** Catégories triées à la française (« Électrique » avant « Monospace »). */
    getCategories: function (db) {
      return Utils.sqlAll(db, 'SELECT DISTINCT category FROM vehicles')
        .map(function (r) { return r.category; })
        .sort(function (a, b) { return a.localeCompare(b, 'fr'); });
    },

    /** @param {{category?: string, priceRange?: string}} filters */
    getVehicles: function (db, filters) {
      filters = filters || {};
      var sql = 'SELECT * FROM vehicles WHERE 1 = 1';
      var params = [];
      if (filters.category && filters.category !== 'all') {
        sql += ' AND category = ?';
        params.push(filters.category);
      }
      var range = PRICE_RANGES[filters.priceRange];
      if (range) {
        sql += ' AND daily_price >= ?';
        params.push(range.min);
        if (range.max !== null) {
          sql += ' AND daily_price <= ?';
          params.push(range.max);
        }
      }
      return Utils.sqlAll(db, sql + ' ORDER BY daily_price, brand, model', params);
    },

    getVehicleById: function (db, id) {
      return Utils.sqlGet(db, 'SELECT * FROM vehicles WHERE id = ?', [Number(id)]);
    }
  };

  /* ---------------- API navigateur (base ouverte par DB) ---------------- */
  var VehiculesRepo = {
    NAME: 'vehicules',
    VERSION: 2,
    SCHEMA: SCHEMA,
    SEED: SEED,
    CATEGORIES: CATEGORIES,
    PRICE_RANGES: PRICE_RANGES,
    seed: seed,
    Q: Q,
    getCategories:  function ()        { return Q.getCategories(global.DB.handle()); },
    getVehicles:    function (filters) { return Q.getVehicles(global.DB.handle(), filters); },
    getVehicleById: function (id)      { return Q.getVehicleById(global.DB.handle(), id); }
  };

  global.VehiculesRepo = VehiculesRepo;
  // Enregistrement auprès du moteur de base (si le lot P2 est déjà fusionné)
  if (global.DB) global.DB.register({ name: VehiculesRepo.NAME, version: VehiculesRepo.VERSION, schema: SCHEMA, seed: seed });
})(window);
