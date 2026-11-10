/* ==========================================================================
   FIND MY CAR — js/ui/connexion.js
   --------------------------------------------------------------------------
   Lot : P6 (onglet Connexion).
   Rôle : onglet « Connexion » et gestion de la SESSION (objet Account).
     - Formulaires de connexion et d'inscription.
     - Mémorise le compte connecté pour l'onglet en cours (sessionStorage :
       la session se termine à la fermeture de l'onglet).
     - Affiche « Mon compte » et le bouton de déconnexion.
     - Prévient les autres écrans à chaque connexion / déconnexion
       (événement "account:change").
     - Après une connexion demandée par l'onglet Réservation, y renvoie
       l'utilisateur en conservant sa sélection.
   HTML : pages/connexion.html — Styles : css/connexion.css
   Contrat : docs/CONTRAT-INTERFACES.md (section P6).
   Dépendances : App, UI, Utils (P1) · DB (P2) · Auth, Users (P5).
   Facultatif : ReservationsRepo (P7) pour le nombre de réservations actives.

   ⚠️ Limite (sans serveur) : la session est stockée dans le navigateur.
   Une personne qui manipule les outils de développement peut la modifier :
   c'est une authentification de DÉMONSTRATION, pas une protection réelle.
   ========================================================================== */

(function (global) {
  'use strict';

  var SESSION_KEY = 'findmycar.session.userId';
  var els = {};
  var current = null;       // compte connecté (sans mot de passe) ou null
  var returnToTab = null;   // onglet à rouvrir après connexion

  /* ---------- Session (sessionStorage protégé par try/catch) ---------- */

  function readSession() {
    try { return global.sessionStorage.getItem(SESSION_KEY); } catch (e) { return null; }
  }
  function writeSession(id) {
    try { global.sessionStorage.setItem(SESSION_KEY, String(id)); } catch (e) { /* session limitée à la page */ }
  }
  function clearSession() {
    try { global.sessionStorage.removeItem(SESSION_KEY); } catch (e) { /* rien à faire */ }
  }

  /** Prévient les autres écrans d'un changement de compte. */
  function notifyChange() {
    document.dispatchEvent(new CustomEvent('account:change', { detail: { user: current } }));
  }

  /* ---------- Affichage ---------- */

  function render() {
    var loggedIn = !!current;
    els.guest.hidden = loggedIn;
    els.user.hidden = !loggedIn;

    if (loggedIn) {
      var fresh = Users.getById(current.id) || current;
      els.name.textContent = fresh.name;
      els.email.textContent = fresh.email;
      els.role.textContent = fresh.role === 'admin' ? 'Administrateur' : 'Client';
      // Le nombre de réservations n'est connu que si le lot P7 est fusionné
      els.count.textContent = global.ReservationsRepo ? ReservationsRepo.countActiveForUser(fresh.id) : '—';
      els.adminNote.hidden = fresh.role !== 'admin';
      els.chip.innerHTML = Utils.escapeHTML(fresh.name) +
        (fresh.role === 'admin' ? ' <span class="chip-role">Admin</span>' : '');
      els.chip.setAttribute('aria-label', 'Connecté : ' + fresh.name + ' — voir mon compte');
      els.chip.hidden = false;
      els.navLink.textContent = 'Mon compte';
    } else {
      els.chip.hidden = true;
      els.navLink.textContent = 'Connexion';
    }
  }

  /** Après une connexion ou une inscription réussie. */
  function startSession(user, message) {
    current = user;
    writeSession(user.id);
    els.loginForm.reset();
    els.registerForm.reset();
    UI.hideAlert(els.loginMessage);
    UI.hideAlert(els.registerMessage);
    render();
    notifyChange();

    if (returnToTab) {
      var tab = returnToTab;
      returnToTab = null;
      UI.hideAlert(els.notice);
      App.showTab(tab);
      return;
    }
    UI.showAlert(els.notice, 'success', message);
  }

  /* ---------- Formulaires ---------- */

  function setBusy(button, busy, label) {
    button.disabled = busy;
    if (busy) {
      button.dataset.label = button.textContent;
      button.textContent = label;
    } else if (button.dataset.label) {
      button.textContent = button.dataset.label;
    }
  }

  function onLogin(event) {
    event.preventDefault();
    UI.hideAlert(els.loginMessage);
    UI.clearFieldErrors(els.loginForm);
    var email = els.loginEmail.value;
    var password = els.loginPassword.value;
    if (!email.trim() || !password) {
      if (!email.trim()) UI.setFieldError(els.loginEmail, true);
      if (!password) UI.setFieldError(els.loginPassword, true);
      UI.showAlert(els.loginMessage, 'error', 'Saisissez votre adresse e-mail et votre mot de passe.');
      return;
    }
    setBusy(els.loginSubmit, true, 'Vérification…');
    Users.login(email, password).then(function (res) {
      if (!res.ok) {
        els.loginPassword.value = '';
        UI.setFieldError(els.loginPassword, true);
        UI.showAlert(els.loginMessage, 'error', Utils.escapeHTML(res.error));
        els.loginMessage.focus();
        return;
      }
      startSession(res.user, 'Bienvenue, <strong>' + Utils.escapeHTML(res.user.name) + '</strong> : vous êtes connecté.');
    }).catch(function (err) {
      console.error(err);
      UI.showAlert(els.loginMessage, 'error', Utils.escapeHTML(err.message || 'Erreur technique pendant la connexion.'));
    }).then(function () {
      setBusy(els.loginSubmit, false);
    });
  }

  function onRegister(event) {
    event.preventDefault();
    UI.hideAlert(els.registerMessage);
    UI.clearFieldErrors(els.registerForm);
    var data = {
      name: document.getElementById('register-name').value,
      email: document.getElementById('register-email').value,
      password: document.getElementById('register-password').value,
      passwordConfirm: document.getElementById('register-confirm').value
    };
    var fieldIds = { name: 'register-name', email: 'register-email', password: 'register-password', passwordConfirm: 'register-confirm' };

    setBusy(els.registerSubmit, true, 'Création du compte…');
    Users.register(data).then(function (res) {
      if (!res.ok) {
        res.errors.forEach(function (e) { UI.setFieldError(document.getElementById(fieldIds[e.field]), true); });
        UI.showAlert(els.registerMessage, 'error',
          '<strong>Le compte n’a pas été créé :</strong><ul><li>' +
          res.errors.map(function (e) { return Utils.escapeHTML(e.message); }).join('</li><li>') + '</li></ul>');
        els.registerMessage.focus();
        return;
      }
      startSession(res.user, 'Compte créé : bienvenue, <strong>' + Utils.escapeHTML(res.user.name) + '</strong> ! Vous êtes connecté.');
    }).catch(function (err) {
      console.error(err);
      UI.showAlert(els.registerMessage, 'error', Utils.escapeHTML(err.message || 'Erreur technique pendant l’inscription.'));
    }).then(function () {
      setBusy(els.registerSubmit, false);
    });
  }

  /* ---------- API publique ---------- */

  var Account = {
    init: function () {
      els.guest = document.getElementById('auth-guest');
      els.user = document.getElementById('auth-user');
      els.notice = document.getElementById('auth-notice');
      els.loginForm = document.getElementById('login-form');
      els.loginEmail = document.getElementById('login-email');
      els.loginPassword = document.getElementById('login-password');
      els.loginSubmit = document.getElementById('login-submit');
      els.loginMessage = document.getElementById('login-message');
      els.registerForm = document.getElementById('register-form');
      els.registerSubmit = document.getElementById('register-submit');
      els.registerMessage = document.getElementById('register-message');
      els.name = document.getElementById('account-name');
      els.email = document.getElementById('account-email');
      els.role = document.getElementById('account-role');
      els.count = document.getElementById('account-count');
      els.adminNote = document.getElementById('account-admin-note');
      els.chip = document.getElementById('user-chip');
      els.navLink = document.querySelector('.nav-link[data-tab="connexion"]');

      els.loginForm.addEventListener('submit', onLogin);
      els.registerForm.addEventListener('submit', onRegister);
      document.getElementById('logout-button').addEventListener('click', Account.logout);
      // Réinitialisation des données : les comptes créés ont disparu, on ferme la session
      document.addEventListener('fmc:data-reset', Account.refresh);

      // Le hachage nécessite un contexte sécurisé (https, localhost, 127.0.0.1)
      if (!Auth.isAvailable()) {
        UI.showAlert(els.notice, 'warning',
          '<strong>Connexion indisponible sur cette adresse.</strong> Le chiffrement des mots de passe exige ' +
          'une page en https, sur localhost ou 127.0.0.1. Le catalogue et le contact restent utilisables.');
        els.loginSubmit.disabled = true;
        els.registerSubmit.disabled = true;
      }

      // Reprise de la session (rechargement de la page)
      var id = readSession();
      current = id ? Users.getById(id) : null;
      if (id && !current) clearSession(); // compte supprimé (ex. réinitialisation)
      render();
    },

    /** Compte connecté (copie à jour, sans mot de passe) ou null. */
    currentUser: function () {
      return current ? Users.getById(current.id) : null;
    },

    /**
     * Ouvre l'onglet Connexion avec un message, puis revient à `tab`
     * une fois connecté.
     */
    requireLogin: function (tab, message) {
      returnToTab = tab;
      UI.showAlert(els.notice, 'info', message);
      App.showTab('connexion', { focusId: 'login-email' });
    },

    logout: function () {
      current = null;
      returnToTab = null;
      clearSession();
      render();
      UI.showAlert(els.notice, 'info', 'Vous êtes déconnecté.');
      notifyChange();
    },

    /** Après réinitialisation des données : la session n'est plus valable. */
    refresh: function () {
      current = null;
      clearSession();
      UI.hideAlert(els.notice);
      render();
      notifyChange();
    },

    /** Met à jour « Mon compte » (ex. : nombre de réservations). */
    render: function () { if (els.guest) render(); }
  };

  global.Account = Account;
  App.registerTab('connexion', { init: Account.init, requires: ['DB', 'Auth', 'Users'] });
})(window);
