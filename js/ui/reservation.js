/* ==========================================================================
   FIND MY CAR — js/ui/reservation.js
   --------------------------------------------------------------------------
   Lot : P7 (réservations).
   Rôle : onglet « Réservation » (objet Reservations).
     - Liste des véhicules dans le formulaire.
     - Calcul automatique du nombre de jours et du montant total
       (possible sans compte, pour simuler un prix).
     - Vérification des dates et de la disponibilité (chevauchement).
     - Enregistrement de la réservation dans SQLite au nom du COMPTE
       connecté (+ sauvegarde IndexedDB). Sans compte : redirection vers
       l'onglet Connexion, la sélection est conservée.
     - Liste « Mes réservations » (client) ou « Toutes les réservations »
       (administrateur), avec annulation selon les droits.
   Les contrôles sont faits DEUX fois : en direct pour informer l'utilisateur,
   puis au moment d'enregistrer (ReservationsRepo.create) — c'est ce second
   contrôle qui fait foi.
   HTML : pages/reservation.html — Styles : css/reservation.css
   Contrat : docs/CONTRAT-INTERFACES.md (section P7).
   Dépendances : App, UI, Utils (P1) · DB (P2) · VehiculesRepo (P3) ·
                 ReservationsRepo (P7) · Account (P6). Facultatif : Photos (P3).
   ========================================================================== */

(function (global) {
  'use strict';

  var els = {};
  var saving = false; // évite un double clic sur « Confirmer »

  /** Récupère les valeurs du formulaire + le compte connecté. */
  function readForm() {
    var user = Account.currentUser();
    return {
      vehicleId: els.vehicle.value,
      startDate: els.start.value,
      endDate: els.end.value,
      userId: user ? user.id : null
    };
  }

  /** Bornes des champs date : pas de début avant aujourd'hui, fin > début. */
  function updateDateLimits() {
    var today = Utils.todayISO();
    els.start.min = today;
    var minEnd = Utils.isValidISODate(els.start.value) && els.start.value >= today
      ? Utils.addDays(els.start.value, 1)
      : Utils.addDays(today, 1);
    els.end.min = minEnd;
  }

  /** Encadré « Réservation au nom de… » et libellé du bouton. */
  function renderAccountBox() {
    var user = Account.currentUser();
    document.getElementById('res-guest-hint').hidden = !!user;
    if (user) {
      els.account.className = 'account-box is-connected';
      els.account.innerHTML = 'Réservation au nom de <strong>' + Utils.escapeHTML(user.name) +
        '</strong> (' + Utils.escapeHTML(user.email) + ')';
      els.submit.textContent = 'Confirmer la réservation';
    } else {
      els.account.className = 'account-box';
      els.account.innerHTML = 'Vous n’êtes pas connecté. <a href="#connexion">Connectez-vous ou créez un compte</a> ' +
        'pour confirmer une réservation.';
      els.submit.textContent = 'Se connecter pour réserver';
    }
  }

  /** Met à jour le récapitulatif (prix, jours, disponibilité) en direct. */
  function updateSummary() {
    updateDateLimits();
    var data = readForm();
    var vehicle = data.vehicleId ? VehiculesRepo.getVehicleById(data.vehicleId) : null;

    els.sumVehicle.textContent = vehicle
      ? vehicle.brand + ' ' + vehicle.model + ' — ' + vehicle.category
      : 'Aucun véhicule sélectionné';
    els.sumDaily.textContent = vehicle ? Utils.formatPrice(vehicle.daily_price) : '–';
    els.sumDays.textContent = '–';
    els.sumTotal.textContent = '–';
    els.availability.textContent = '';
    els.availability.className = 'availability';

    // Tant que les deux dates ne sont pas saisies, on n'affiche rien de plus.
    if (!data.startDate || !data.endDate) return;

    var q = ReservationsRepo.quote(data);
    if (q.days > 0) {
      els.sumDays.textContent = q.days + (q.days > 1 ? ' jours' : ' jour');
      els.sumTotal.textContent = Utils.formatPrice(q.total);
    }
    if (!vehicle) return;

    if (q.ok) {
      els.availability.textContent = '✓ Véhicule disponible sur cette période.';
      els.availability.classList.add('is-ok');
    } else {
      els.availability.textContent = q.errors.join(' ');
      els.availability.classList.add('is-error');
    }
  }

  /** Libellé et style du statut d'une réservation. */
  function statusOf(r) {
    if (r.status === 'cancelled') return { label: 'Annulée', css: 'status-cancelled' };
    if (r.end_date <= Utils.todayISO()) return { label: 'Terminée', css: 'status-done' };
    return { label: 'Confirmée', css: 'status-active' };
  }

  /** Affiche les réservations visibles par le compte connecté. */
  function renderList() {
    var user = Account.currentUser();
    var isAdmin = !!user && user.role === 'admin';
    els.title.textContent = isAdmin ? 'Toutes les réservations' : 'Mes réservations';
    els.subtitle.textContent = isAdmin
      ? 'Vue administrateur : réservations de tous les comptes de ce navigateur.'
      : 'Enregistrées dans la base SQLite de ce navigateur uniquement.';

    var list = ReservationsRepo.listFor(user);
    var e = Utils.escapeHTML;
    els.list.innerHTML = list.map(function (r) {
      var st = statusOf(r);
      var canCancel = r.status === 'active' && r.end_date > Utils.todayISO() &&
        (isAdmin || r.user_id === user.id);
      var src = global.Photos ? Photos.imageFor(r).src : r.image; // photo si déjà chargée
      return (
        '<li class="reservation-item ' + st.css + '" data-id="' + r.id + '">' +
          '<img src="' + e(src) + '" alt="" width="80" height="48" data-fallback="' + e(r.image) + '">' +
          '<div class="reservation-info">' +
            '<p class="reservation-title"><strong>' + e(r.brand + ' ' + r.model) + '</strong>' +
              ' <span class="status">' + st.label + '</span></p>' +
            '<p class="small">N° ' + r.id + ' · du ' + Utils.formatDateFR(r.start_date) +
              ' au ' + Utils.formatDateFR(r.end_date) + ' · ' + r.days + (r.days > 1 ? ' jours' : ' jour') + '</p>' +
            '<p class="small">' + e(r.customer_name) +
              (isAdmin ? ' (' + e(r.customer_email) + ')' : '') +
              ' · <strong>' + Utils.formatPrice(r.total_price) + '</strong></p>' +
          '</div>' +
          (canCancel
            ? '<button type="button" class="btn btn-danger btn-sm" data-cancel="' + r.id + '" ' +
              'aria-label="Annuler la réservation n° ' + r.id + '">Annuler</button>'
            : '') +
        '</li>'
      );
    }).join('');
    els.empty.textContent = user ? 'Aucune réservation pour le moment.' : 'Connectez-vous pour voir vos réservations.';
    els.empty.hidden = list.length > 0;
  }

  /** Enregistre la réservation. */
  function onSubmit(event) {
    event.preventDefault();
    if (saving) return;
    UI.hideAlert(els.message);
    UI.clearFieldErrors(els.form);

    var data = readForm();
    // Pas de compte : on envoie vers l'onglet Connexion en gardant la sélection
    if (!data.userId) {
      Account.requireLogin('reservation',
        'Connectez-vous ou créez un compte pour confirmer votre réservation. Votre sélection est conservée.');
      return;
    }

    // Signale visuellement les champs vides
    ['vehicle', 'start', 'end'].forEach(function (key) {
      if (!els[key].value.trim()) UI.setFieldError(els[key], true);
    });

    saving = true;
    els.submit.disabled = true;
    ReservationsRepo.create(data).then(function (result) {
      if (!result.ok) {
        UI.showAlert(els.message, 'error',
          '<strong>La réservation n’a pas été enregistrée :</strong><ul><li>' +
          result.errors.map(Utils.escapeHTML).join('</li><li>') + '</li></ul>');
        els.message.focus();
        return;
      }
      var r = result.reservation;
      var where = DB.isPersistent()
        ? 'Elle est enregistrée dans ce navigateur et sera conservée après rechargement de la page.'
        : 'Attention : la sauvegarde locale est indisponible, elle sera perdue à la fermeture de la page.';
      UI.showAlert(els.message, 'success',
        '<strong>Réservation n° ' + r.id + ' confirmée</strong> : ' +
        Utils.escapeHTML(r.brand + ' ' + r.model) + ' du ' + Utils.formatDateFR(r.start_date) +
        ' au ' + Utils.formatDateFR(r.end_date) + ' — ' + r.days + (r.days > 1 ? ' jours' : ' jour') +
        ' — <strong>' + Utils.formatPrice(r.total_price) + '</strong>.<br>' + where);
      els.start.value = '';
      els.end.value = '';
      updateSummary();
      renderList();
      Account.render();
      els.message.focus();
    }).catch(function (err) {
      console.error(err);
      UI.showAlert(els.message, 'error',
        'Erreur technique lors de l’enregistrement. Rechargez la page puis réessayez.');
    }).then(function () {
      saving = false;
      els.submit.disabled = false;
    });
  }

  /** Annulation d'une réservation (après confirmation). */
  function onListClick(event) {
    var btn = event.target.closest('button[data-cancel]');
    if (!btn) return;
    var id = btn.dataset.cancel;
    if (!global.confirm('Voulez-vous vraiment annuler la réservation n° ' + id + ' ?')) return;
    btn.disabled = true;
    ReservationsRepo.cancel(id, Account.currentUser()).then(function (result) {
      UI.showAlert(els.listMessage, result.ok ? 'success' : 'error',
        result.ok ? 'La réservation n° ' + id + ' a été annulée. Le véhicule est de nouveau disponible sur cette période.'
                  : Utils.escapeHTML(result.error));
      renderList();
      updateSummary();
      Account.render();
    }).catch(function (err) {
      console.error(err);
      UI.showAlert(els.listMessage, 'error', 'Erreur technique lors de l’annulation.');
      btn.disabled = false;
    });
  }

  var Reservations = {
    init: function () {
      els.form = document.getElementById('reservation-form');
      els.vehicle = document.getElementById('res-vehicle');
      els.start = document.getElementById('res-start');
      els.end = document.getElementById('res-end');
      els.account = document.getElementById('res-account');
      els.submit = document.getElementById('res-submit');
      els.message = document.getElementById('reservation-message');
      els.sumVehicle = document.getElementById('summary-vehicle');
      els.sumDaily = document.getElementById('summary-daily');
      els.sumDays = document.getElementById('summary-days');
      els.sumTotal = document.getElementById('summary-total');
      els.availability = document.getElementById('summary-availability');
      els.title = document.getElementById('my-res-title');
      els.subtitle = document.getElementById('my-res-subtitle');
      els.list = document.getElementById('reservation-list');
      els.empty = document.getElementById('reservation-empty');
      els.listMessage = document.getElementById('list-message');

      Reservations.fillVehicleSelect();
      els.form.addEventListener('input', updateSummary);
      els.form.addEventListener('change', updateSummary);
      els.form.addEventListener('submit', onSubmit);
      els.list.addEventListener('click', onListClick);
      // Vignette indisponible (hors ligne) : on affiche le dessin
      els.list.addEventListener('error', function (event) {
        var img = event.target;
        if (img.tagName === 'IMG' && img.dataset.fallback && img.getAttribute('src') !== img.dataset.fallback) img.src = img.dataset.fallback;
      }, true);
      document.addEventListener('fmc:data-reset', Reservations.refresh);

      // Connexion / déconnexion : on met à jour le titulaire et la liste
      document.addEventListener('account:change', function () {
        UI.hideAlert(els.message);
        UI.hideAlert(els.listMessage);
        renderAccountBox();
        renderList();
      });

      renderAccountBox();
      updateSummary();
      renderList();
    },

    /** Remplit la liste des véhicules du formulaire. */
    fillVehicleSelect: function () {
      els.vehicle.length = 1; // garde uniquement « — Sélectionnez — »
      VehiculesRepo.getVehicles({}).forEach(function (v) {
        var opt = document.createElement('option');
        opt.value = v.id;
        opt.textContent = v.brand + ' ' + v.model + ' (' + v.category + ') — ' + Utils.formatPrice(v.daily_price) + '/jour';
        els.vehicle.appendChild(opt);
      });
    },

    /** Présélectionne un véhicule (appelé depuis l'onglet Véhicules). */
    selectVehicle: function (id) {
      els.vehicle.value = String(id);
      UI.hideAlert(els.message);
      updateSummary();
    },

    /** Réaffiche tout (après réinitialisation des données). */
    refresh: function () {
      Reservations.fillVehicleSelect();
      UI.hideAlert(els.message);
      UI.hideAlert(els.listMessage);
      renderAccountBox();
      updateSummary();
      renderList();
    }
  };

  global.Reservations = Reservations;
  App.registerTab('reservation', {
    init: Reservations.init,
    requires: ['DB', 'VehiculesRepo', 'ReservationsRepo', 'Account']
  });
})(window);
