/* ==========================================================================
   FIND MY CAR — js/ui/contact.js
   --------------------------------------------------------------------------
   Lot : P8 (contact, qualité et pilotage).
   Rôle : onglet « Nous contacter » (objet Contact).
     - Affiche les coordonnées (fictives) de l'entreprise.
     - Vérifie le formulaire (champs obligatoires, format de l'e-mail).
     - Prépare un e-mail dans le logiciel de messagerie de l'utilisateur
       grâce à un lien "mailto:". AUCUN e-mail n'est envoyé par l'application.
   HTML : pages/contact.html — Styles : css/contact.css
   Contrat : docs/CONTRAT-INTERFACES.md (section P8).
   Dépendances : App, UI, Utils (P1). N'utilise PAS la base de données :
   cet onglet peut être fusionné et fonctionner dès le premier jour.
   ========================================================================== */

(function (global) {
  'use strict';

  /* ------------------------------------------------------------------------
     COORDONNÉES — FICTIVES. Modifiez uniquement cet objet pour les changer.
     Le domaine "example.com" est réservé aux exemples : aucun vrai
     destinataire ne recevra de message tant qu'il n'est pas remplacé.
     ------------------------------------------------------------------------ */
  var CONTACT_INFO = {
    company: 'FIND MY CAR',
    address: '12 rue de l’Exemple, 75000 Paris (adresse fictive)',
    phone: '01 23 45 67 89',
    email: 'contact@findmycar.example.com',
    hours: 'Du lundi au samedi, de 8 h à 19 h'
  };

  var els = {};

  /** Affiche les coordonnées dans la page. */
  function renderDetails() {
    var e = Utils.escapeHTML;
    var tel = CONTACT_INFO.phone.replace(/\s/g, '');
    els.details.innerHTML =
      '<li><span class="label">Adresse</span>' + e(CONTACT_INFO.address) + '</li>' +
      '<li><span class="label">Téléphone</span><a href="tel:' + e(tel) + '">' + e(CONTACT_INFO.phone) + '</a></li>' +
      '<li><span class="label">E-mail</span><a href="mailto:' + e(CONTACT_INFO.email) + '">' + e(CONTACT_INFO.email) + '</a></li>' +
      '<li><span class="label">Horaires</span>' + e(CONTACT_INFO.hours) + '</li>';
  }

  /**
   * Vérifie les champs. Renvoie la liste des erreurs [{field, message}].
   */
  function validate(data) {
    var errors = [];
    if (data.name.trim().length < 2) errors.push({ field: 'name', message: 'Le nom est obligatoire (2 caractères minimum).' });
    if (!data.email.trim()) errors.push({ field: 'email', message: 'L’adresse e-mail est obligatoire.' });
    else if (!Utils.isValidEmail(data.email)) errors.push({ field: 'email', message: 'Le format de l’adresse e-mail est invalide (ex. : nom@exemple.fr).' });
    if (data.subject.trim().length < 3) errors.push({ field: 'subject', message: 'L’objet est obligatoire (3 caractères minimum).' });
    if (data.message.trim().length < 10) errors.push({ field: 'message', message: 'Le message est obligatoire (10 caractères minimum).' });
    return errors;
  }

  /** Construit le lien mailto: (objet et corps encodés pour l'URL). */
  function buildMailto(data) {
    var body =
      data.message.trim() + '\n\n' +
      '—\n' +
      'Nom : ' + data.name.trim() + '\n' +
      'E-mail : ' + data.email.trim();
    return 'mailto:' + CONTACT_INFO.email +
      '?subject=' + encodeURIComponent('[FIND MY CAR] ' + data.subject.trim()) +
      '&body=' + encodeURIComponent(body);
  }

  function onSubmit(event) {
    event.preventDefault();
    UI.hideAlert(els.message);
    UI.clearFieldErrors(els.form);

    var data = {
      name: els.form.elements.name.value,
      email: els.form.elements.email.value,
      subject: els.form.elements.subject.value,
      message: els.form.elements.message.value
    };
    var errors = validate(data);
    if (errors.length > 0) {
      errors.forEach(function (err) { UI.setFieldError(els.form.elements[err.field], true); });
      UI.showAlert(els.message, 'error',
        '<strong>Merci de corriger le formulaire :</strong><ul><li>' +
        errors.map(function (e) { return Utils.escapeHTML(e.message); }).join('</li><li>') + '</li></ul>');
      els.message.focus();
      return;
    }

    Contact.openMailClient(buildMailto(data));

    // Message HONNÊTE : on a seulement ouvert la messagerie, rien n'est envoyé.
    UI.showAlert(els.message, 'info',
      '<strong>Votre messagerie devrait s’ouvrir avec le message pré-rempli.</strong> ' +
      'Relisez-le puis cliquez sur « Envoyer » dans votre messagerie : tant que vous ne l’avez pas fait, ' +
      'aucun message n’est parti. Si rien ne s’ouvre, écrivez-nous directement à ' +
      '<a href="mailto:' + Utils.escapeHTML(CONTACT_INFO.email) + '">' + Utils.escapeHTML(CONTACT_INFO.email) + '</a>.');
    els.message.focus();
  }

  var Contact = {
    CONTACT_INFO: CONTACT_INFO,
    validate: validate,
    buildMailto: buildMailto,

    /** Ouvre la messagerie. Isolé dans une fonction pour pouvoir le tester. */
    openMailClient: function (url) {
      global.location.href = url;
    },

    init: function () {
      els.form = document.getElementById('contact-form');
      els.message = document.getElementById('contact-message');
      els.details = document.getElementById('contact-details');
      renderDetails();
      els.form.addEventListener('submit', onSubmit);
    }
  };

  global.Contact = Contact;
  App.registerTab('contact', { init: Contact.init, requires: [] });
})(window);
