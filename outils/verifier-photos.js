/* FIND MY CAR — outils/verifier-photos.js   (Lot : P3)
   Script de la page verifier-photos.html (fichier séparé : CSP stricte).
   Si une photo est « INTROUVABLE » : choisir un autre fichier sur commons.wikimedia.org
   (licence CC0, CC BY ou CC BY-SA), remplacer photo_file dans js/db/vehicules.repo.js
   et augmenter VERSION dans ce même fichier. */
'use strict';

document.getElementById('check').addEventListener('click', async function () {
  const e = Utils.escapeHTML;
  const summary = document.getElementById('summary');
  const results = document.getElementById('results');
  const seed = VehiculesRepo.SEED;
  summary.className = 'summary is-running';
  summary.textContent = 'Interrogation de Wikimedia Commons…';
  results.innerHTML = '';
  let found;
  try {
    const res = await fetch(Photos.buildApiUrl(seed.map((v) => v.photo_file)));
    if (!res.ok) throw new Error('HTTP ' + res.status);
    found = Photos.parseApiResponse(await res.json());
  } catch (err) {
    summary.className = 'summary is-ko';
    summary.textContent = 'Impossible de joindre Wikimedia Commons (' + err.message + '). Vérifiez la connexion Internet ou le proxy de l’école.';
    return;
  }
  const lines = [
    '# Crédits des photos — FIND MY CAR', '',
    '> Vérifié avec `outils/verifier-photos.html` le ' + new Date().toLocaleDateString('fr-FR') + '. Photos issues de Wikimedia Commons,',
    '> sous licences libres. L’application affiche ces crédits automatiquement sous chaque photo.', '',
    '| Véhicule | Fichier Commons | Auteur | Licence |', '|---|---|---|---|'
  ];
  let ok = 0;
  seed.forEach((v) => {
    const p = found[v.photo_file];
    if (p) ok++;
    const li = document.createElement('li');
    li.className = p ? 'pass' : 'fail';
    li.innerHTML = (p ? '✅ ' : '❌ ') + '<strong>' + e(v.brand + ' ' + v.model) + '</strong> — ' +
      (p ? e(p.author) + ' — ' + e(p.licence) + '<br><img src="' + e(p.src) + '" alt="" width="200">' : 'INTROUVABLE : ' + e(v.photo_file));
    results.appendChild(li);
    const link = p && p.pageUrl ? '[' + v.photo_file + '](' + p.pageUrl + ')' : v.photo_file;
    lines.push('| ' + v.brand + ' ' + v.model + ' | ' + link + ' | ' + (p ? p.author : '**INTROUVABLE**') + ' | ' + (p ? p.licence : '—') + ' |');
  });
  document.getElementById('markdown').value = lines.join('\n') + '\n';
  summary.className = 'summary ' + (ok === seed.length ? 'is-ok' : 'is-ko');
  summary.textContent = ok + ' / ' + seed.length + ' photos disponibles avec auteur et licence.';
});
