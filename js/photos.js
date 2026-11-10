/* ==========================================================================
   FIND MY CAR — js/photos.js
   --------------------------------------------------------------------------
   Lot : P3 (données véhicules et photos).
   Rôle : afficher de VRAIES photos des véhicules, de façon LÉGALE.
     - Les photos viennent de Wikimedia Commons (licences libres type
       Creative Commons). Ces licences imposent de citer l'auteur et la licence.
     - Plutôt que de recopier ces informations à la main (risque d'erreur),
       on interroge l'API officielle de Commons : elle renvoie l'adresse de
       la photo redimensionnée, l'auteur et la licence exacts.
     - Sans connexion Internet (ou si une photo a été supprimée), le dessin
       générique img/vehicules/*.svg est affiché à la place : le site reste
       toujours fonctionnel.
   Modes de TEST (adresse de la page) : ?photos=off (aucune requête, dessins)
   et ?photos=fake (fausses photos et faux crédits, sans Internet). Ils ne
   servent qu'à la page tests/ ; sans paramètre, le fonctionnement est normal.
   Contrat : docs/CONTRAT-INTERFACES.md (section P3).
   Dépendances : js/utils.js (escapeHTML). Réseau facultatif.
   ========================================================================== */

(function (global) {
  'use strict';

  var API = 'https://commons.wikimedia.org/w/api.php';
  var WIDTH = 640;          // largeur des vignettes demandées (pixels)
  var TIMEOUT_MS = 8000;    // au-delà, on garde les dessins

  var cache = {};           // nom de fichier -> { src, author, licence, licenceUrl, pageUrl }
  var loading = null;       // promesse du chargement en cours

  /** Mode de test lu dans l'adresse : 'off', 'fake' ou '' (normal). */
  function testMode() {
    try {
      var mode = new URLSearchParams(global.location.search).get('photos');
      return mode === 'off' || mode === 'fake' ? mode : '';
    } catch (e) {
      return '';
    }
  }

  /** Fausse photo (petite image SVG intégrée) pour le mode ?photos=fake. */
  function fakeEntry(i, file) {
    var svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 240"><rect width="400" height="240" fill="#9fb3d1"/>' +
      '<text x="200" y="130" font-size="28" text-anchor="middle" fill="#0f2547">Photo de test ' + i + '</text></svg>';
    return {
      src: 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg),
      author: 'Auteur Test ' + i,
      licence: 'CC BY-SA 4.0',
      licenceUrl: 'https://creativecommons.org/licenses/by-sa/4.0',
      pageUrl: 'https://commons.wikimedia.org/wiki/File:' + encodeURIComponent(file.replace(/ /g, '_'))
    };
  }

  /** Adresse de l'API pour une liste de fichiers (au plus 50). */
  function buildApiUrl(files) {
    var titles = files.map(function (f) { return 'File:' + f; }).join('|');
    return API + '?action=query&format=json&formatversion=2&origin=*' +
      '&prop=imageinfo&iiprop=url%7Cextmetadata&iiurlwidth=' + WIDTH +
      '&iiextmetadatafilter=Artist%7CLicenseShortName%7CLicenseUrl' +
      '&titles=' + encodeURIComponent(titles);
  }

  /** Transforme du HTML (champ « Artist » de Commons) en texte simple. */
  function textFromHtml(html) {
    return String(html || '')
      .replace(/<[^>]*>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#0?39;/g, "'")
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /** "File:Renault_Clio.jpg" ou "Fichier:…" -> "Renault Clio.jpg" */
  function fileNameFromTitle(title) {
    return String(title).replace(/^[^:]+:/, '').replace(/_/g, ' ');
  }

  /**
   * Lit la réponse de l'API (formatversion=2).
   * @returns {Object<string, {src, author, licence, licenceUrl, pageUrl}>}
   */
  function parseApiResponse(json) {
    var out = {};
    var query = json && json.query;
    if (!query || !query.pages) return out;
    // Commons « normalise » les titres (espaces, majuscules) : on garde la correspondance
    var original = {};
    (query.normalized || []).forEach(function (n) { original[n.to] = n.from; });
    query.pages.forEach(function (page) {
      if (page.missing || !page.imageinfo || !page.imageinfo[0]) return;
      var info = page.imageinfo[0];
      var meta = info.extmetadata || {};
      var author = textFromHtml(meta.Artist && meta.Artist.value);
      var licence = textFromHtml(meta.LicenseShortName && meta.LicenseShortName.value);
      if (!info.thumburl && !info.url) return;
      if (!author || !licence) return; // sans crédit complet, on n'affiche pas la photo
      var entry = {
        src: info.thumburl || info.url,
        author: author,
        licence: licence,
        licenceUrl: (meta.LicenseUrl && meta.LicenseUrl.value) || '',
        pageUrl: info.descriptionurl || ''
      };
      out[fileNameFromTitle(page.title)] = entry;
      if (original[page.title]) out[fileNameFromTitle(original[page.title])] = entry;
    });
    return out;
  }

  var Photos = {
    API: API,
    testMode: testMode,
    buildApiUrl: buildApiUrl,
    textFromHtml: textFromHtml,
    parseApiResponse: parseApiResponse,

    /**
     * Charge les crédits et adresses des photos (une seule requête).
     * Ne rejette jamais : en cas d'échec, les dessins restent affichés.
     * @param {string[]} files - noms de fichiers Commons
     * @returns {Promise<number>} nombre de photos disponibles
     */
    load: function (files) {
      files = (files || []).filter(Boolean).filter(function (f) { return !cache[f]; });
      if (files.length === 0) return Promise.resolve(Object.keys(cache).length);
      var mode = testMode();
      if (mode === 'off') return Promise.resolve(0);
      if (mode === 'fake') {
        files.forEach(function (f, i) { cache[f] = fakeEntry(i + 1, f); });
        return Promise.resolve(Object.keys(cache).length);
      }
      if (typeof global.fetch !== 'function') return Promise.resolve(0);
      var controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
      var timer = controller ? setTimeout(function () { controller.abort(); }, TIMEOUT_MS) : null;
      loading = global.fetch(buildApiUrl(files.slice(0, 50)), controller ? { signal: controller.signal } : {})
        .then(function (res) {
          if (!res.ok) throw new Error('HTTP ' + res.status);
          return res.json();
        })
        .then(function (json) {
          var found = parseApiResponse(json);
          Object.keys(found).forEach(function (k) { cache[k] = found[k]; });
          return Object.keys(cache).length;
        })
        .catch(function (err) {
          console.info('[FIND MY CAR] Photos indisponibles, dessins affichés à la place :', err.message || err);
          return 0;
        })
        .then(function (n) {
          if (timer) clearTimeout(timer);
          return n;
        });
      return loading;
    },

    /** Infos de la photo d'un fichier, ou null. */
    get: function (file) {
      return file && cache[file] ? cache[file] : null;
    },

    /**
     * Image à afficher pour un véhicule : la photo si disponible, sinon le dessin.
     * @returns {{src: string, isPhoto: boolean, alt: string, creditHTML: string}}
     */
    imageFor: function (vehicle) {
      var e = global.Utils.escapeHTML;
      var name = vehicle.brand + ' ' + vehicle.model;
      var p = Photos.get(vehicle.photo_file);
      if (!p) {
        return { src: vehicle.image, isPhoto: false, alt: 'Illustration ' + name, creditHTML: 'Illustration générique' };
      }
      var licence = p.licenceUrl
        ? '<a href="' + e(p.licenceUrl) + '" target="_blank" rel="noopener">' + e(p.licence) + '</a>'
        : e(p.licence);
      var source = p.pageUrl
        ? ' — <a href="' + e(p.pageUrl) + '" target="_blank" rel="noopener">Wikimedia Commons</a>'
        : ' — Wikimedia Commons';
      return {
        src: p.src,
        isPhoto: true,
        alt: 'Photo ' + name,
        creditHTML: 'Photo : ' + e(p.author) + ' — ' + licence + source
      };
    },

    /** Vide le cache (tests). */
    clear: function () { cache = {}; loading = null; }
  };

  global.Photos = Photos;
})(window);
