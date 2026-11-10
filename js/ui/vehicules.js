/* ==========================================================================
   FIND MY CAR — js/ui/vehicules.js
   --------------------------------------------------------------------------
   Lot : P4 (onglet Véhicules).
   Rôle : chiffres d'accueil, filtres (catégorie, prix), cartes véhicules
   avec PHOTO RÉELLE + crédit (ou dessin de secours), fenêtre de détails,
   bouton « Réserver » qui ouvre l'onglet Réservation.
   HTML : pages/vehicules.html — Styles : css/vehicules.css
   Contrat : docs/CONTRAT-INTERFACES.md (section P4).
   Dépendances : App, UI, Utils (P1) · DB (P2) · VehiculesRepo, Photos (P3).
   Facultatif : Reservations (P7) pour présélectionner le véhicule.
   ========================================================================== */

(function (global) {
  'use strict';

  var els = {};
  var currentDialogId = null;

  /** Bloc image + crédit d'un véhicule (photo si disponible, sinon dessin). */
  function mediaHTML(v) {
    var e = Utils.escapeHTML;
    var img = Photos.imageFor(v);
    return (
      '<div class="vehicle-media">' +
        '<img src="' + e(img.src) + '" alt="' + e(img.alt) + '" loading="lazy" width="400" height="240" ' +
          'data-fallback="' + e(v.image) + '" data-photo="' + (img.isPhoto ? '1' : '0') + '">' +
      '</div>' +
      '<p class="photo-credit">' + img.creditHTML + '</p>'
    );
  }

  function cardHTML(v) {
    var e = Utils.escapeHTML;
    var name = e(v.brand + ' ' + v.model);
    return (
      '<article class="vehicle-card" data-id="' + v.id + '">' +
        mediaHTML(v) +
        '<div class="vehicle-body">' +
          '<span class="badge">' + e(v.category) + '</span>' +
          '<h3>' + e(v.brand) + ' <span>' + e(v.model) + '</span></h3>' +
          '<p class="vehicle-specs">' + v.seats + ' places · ' + e(v.transmission) + ' · ' + e(v.fuel) + '</p>' +
          '<div class="vehicle-footer">' +
            '<p class="price"><strong>' + Utils.formatPrice(v.daily_price) + '</strong> / jour</p>' +
            '<div class="vehicle-actions">' +
              '<button type="button" class="btn btn-light btn-sm" data-action="details" data-id="' + v.id + '" aria-label="Voir les détails de ' + name + '">Détails</button>' +
              '<button type="button" class="btn btn-primary btn-sm" data-action="reserve" data-id="' + v.id + '" aria-label="Réserver ' + name + '">Réserver</button>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</article>'
    );
  }

  /**
   * Si une photo ne se charge pas (hors ligne, fichier supprimé…), on
   * affiche le dessin de secours. L'événement "error" ne remonte pas :
   * on l'écoute en phase de capture.
   */
  function onImageError(event) {
    var img = event.target;
    if (img.tagName !== 'IMG' || !img.dataset.fallback || img.dataset.photo !== '1') return;
    img.dataset.photo = '0';
    img.src = img.dataset.fallback;
    var credit = img.closest('.vehicle-media, .dialog-media');
    credit = credit && credit.parentElement.querySelector('.photo-credit');
    if (credit) credit.textContent = 'Illustration générique';
  }

  function fillFilters() {
    VehiculesRepo.getCategories().forEach(function (cat) {
      var opt = document.createElement('option');
      opt.value = cat;
      opt.textContent = cat;
      els.category.appendChild(opt);
    });
    Object.keys(VehiculesRepo.PRICE_RANGES).forEach(function (key) {
      var opt = document.createElement('option');
      opt.value = key;
      opt.textContent = VehiculesRepo.PRICE_RANGES[key].label;
      els.price.appendChild(opt);
    });
  }

  function updateStats() {
    var all = VehiculesRepo.getVehicles({});
    var min = all.reduce(function (m, v) { return Math.min(m, v.daily_price); }, Infinity);
    document.getElementById('stat-count').textContent = all.length;
    document.getElementById('stat-min').textContent = all.length ? Utils.formatPrice(min) : '–';
    document.getElementById('stat-categories').textContent = VehiculesRepo.getCategories().length;
  }

  function fillDialog(v) {
    var img = Photos.imageFor(v);
    var dImg = document.getElementById('dialog-image');
    dImg.dataset.fallback = v.image;
    dImg.dataset.photo = img.isPhoto ? '1' : '0';
    dImg.src = img.src;
    dImg.alt = img.alt;
    document.getElementById('dialog-credit').innerHTML = img.creditHTML;
    document.getElementById('dialog-category').textContent = v.category;
    document.getElementById('dialog-title').textContent = v.brand + ' ' + v.model;
    document.getElementById('dialog-description').textContent = v.description;
    document.getElementById('dialog-seats').textContent = v.seats;
    document.getElementById('dialog-transmission').textContent = v.transmission;
    document.getElementById('dialog-fuel').textContent = v.fuel;
    document.getElementById('dialog-price').textContent = Utils.formatPrice(v.daily_price) + ' / jour';
  }

  function openDetails(id) {
    var v = VehiculesRepo.getVehicleById(id);
    if (!v) return;
    currentDialogId = v.id;
    fillDialog(v);
    els.dialog.showModal(); // <dialog> gère le focus et la touche Échap
  }

  function closeDetails() {
    if (els.dialog.open) els.dialog.close();
  }

  /** Ouvre l'onglet Réservation avec le véhicule présélectionné (si le lot P7 est là). */
  function reserve(id) {
    closeDetails();
    if (global.Reservations && App.isActive('reservation')) Reservations.selectVehicle(id);
    App.showTab('reservation', { focusId: 'res-start' });
  }

  var Vehicles = {
    init: function () {
      els.form = document.getElementById('filters');
      els.category = document.getElementById('filter-category');
      els.price = document.getElementById('filter-price');
      els.grid = document.getElementById('vehicle-grid');
      els.empty = document.getElementById('vehicle-empty');
      els.count = document.getElementById('vehicle-count');
      els.dialog = document.getElementById('vehicle-dialog');

      fillFilters();
      updateStats();

      els.form.addEventListener('change', Vehicles.render);
      els.form.addEventListener('reset', function () { setTimeout(Vehicles.render, 0); });
      els.grid.addEventListener('click', function (event) {
        var btn = event.target.closest('button[data-action]');
        if (!btn) return;
        if (btn.dataset.action === 'details') openDetails(btn.dataset.id);
        if (btn.dataset.action === 'reserve') reserve(btn.dataset.id);
      });
      els.grid.addEventListener('error', onImageError, true);
      els.dialog.addEventListener('error', onImageError, true);
      els.dialog.addEventListener('click', function (event) {
        if (event.target.hasAttribute('data-close') || event.target === els.dialog) closeDetails();
      });
      document.getElementById('dialog-reserve').addEventListener('click', function () { reserve(currentDialogId); });
      document.addEventListener('fmc:data-reset', Vehicles.refresh);

      Vehicles.render();

      // Photos réelles : chargées en arrière-plan, puis les cartes sont redessinées
      var files = VehiculesRepo.getVehicles({}).map(function (v) { return v.photo_file; });
      Photos.load(files).then(function (n) {
        if (n === 0) return;
        Vehicles.render();
        if (els.dialog.open && currentDialogId) fillDialog(VehiculesRepo.getVehicleById(currentDialogId));
      });
    },

    /** Affiche les véhicules correspondant aux filtres. */
    render: function () {
      var vehicles = VehiculesRepo.getVehicles({ category: els.category.value, priceRange: els.price.value });
      els.grid.innerHTML = vehicles.map(cardHTML).join('');
      els.empty.hidden = vehicles.length > 0;
      els.count.textContent = vehicles.length + (vehicles.length > 1 ? ' véhicules trouvés' : ' véhicule trouvé');
    },

    refresh: function () {
      updateStats();
      Vehicles.render();
    }
  };

  global.Vehicles = Vehicles;
  App.registerTab('vehicules', { init: Vehicles.init, requires: ['DB', 'VehiculesRepo', 'Photos'] });
})(window);
