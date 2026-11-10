/* FIND MY CAR — pilotage/pilotage.js   (Lot : P1, socle)
   Tableau de bord : lit pilotage/taches/P1.json … P8.json et affiche l'avancement.
   Script séparé (pas de JavaScript dans la page HTML) : compatible avec la
   politique de sécurité stricte (CSP) du projet. */
'use strict';
/* Libellés lisibles des statuts */
const LABELS = {
  termine: 'Terminé', en_cours: 'En cours', a_faire: 'À faire', bloque: 'Bloqué',
  reussi: 'Réussi', echoue: 'Échoué', corrige: 'Corrigé', ouvert: 'Ouvert'
};
const COLORS = { termine: 'var(--done)', en_cours: 'var(--doing)', a_faire: 'var(--todo)', bloque: 'var(--blocked)' };

/* Protège le texte avant insertion dans le HTML */
const esc = (t) => String(t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const chip = (s) => `<span class="chip s-${esc(s)}">${esc(LABELS[s] || s)}</span>`;

/**
 * Avancement : une tâche terminée compte 1, en cours 0,5.
 * Règle du projet : jamais 100 % tant que des tests ne sont pas réussis
 * ou que des anomalies restent ouvertes.
 */
function computeProgress(data) {
  const t = data.taches;
  const points = t.reduce((n, x) => n + (x.statut === 'termine' ? 1 : x.statut === 'en_cours' ? 0.5 : 0), 0);
  let pct = t.length ? Math.round((points / t.length) * 100) : 0;
  const testsKo = data.tests.filter((x) => x.resultat !== 'reussi').length;
  const bugsOpen = data.anomalies.filter((x) => x.statut !== 'corrige').length;
  let capped = false;
  if (pct >= 100 && (testsKo > 0 || bugsOpen > 0)) { pct = 99; capped = true; }
  return { pct, testsKo, bugsOpen, capped };
}

/** Regroupe les 8 fichiers en un seul tableau de bord. */
function merge(files) {
  const data = { membres: [], taches: [], tests: [], anomalies: [] };
  files.forEach((f) => {
    data.membres.push(f);
    f.taches.forEach((t) => data.taches.push({ ...t, responsable: f.membre + ' — ' + f.nom }));
    f.tests.forEach((t) => data.tests.push({ ...t, id: f.membre + ' · ' + t.id, responsable: f.membre }));
    (f.anomalies || []).forEach((a) => data.anomalies.push({ ...a, id: f.membre + ' · ' + a.id }));
  });
  return data;
}

function render(data) {
  const count = (arr, key, val) => arr.filter((x) => x[key] === val).length;
  const t = data.taches;
  const prog = computeProgress(data);
  const statuses = ['termine', 'en_cours', 'a_faire', 'bloque'];
  const responsables = [...new Set(t.map((x) => x.responsable))];

  document.getElementById('app').innerHTML = `
    <p class="muted">Chaque membre met à jour <code>pilotage/taches/P&lt;n&gt;.json</code> dans sa Pull Request.</p>

    <h2>Équipe</h2>
    <div class="table-wrap"><table>
      <thead><tr><th>Lot</th><th>Membre</th><th>GitHub</th><th>Rôle</th><th>Branche</th><th>Avancement</th></tr></thead>
      <tbody>${data.membres.map((m) => {
        const done = m.taches.filter((t) => t.statut === 'termine').length;
        return `<tr><td><strong>${esc(m.membre)}</strong></td><td>${esc(m.nom)}</td><td>${esc(m.pseudoGithub)}</td><td>${esc(m.role)}</td><td><code>${esc(m.branche)}</code></td><td>${done} / ${m.taches.length}</td></tr>`;
      }).join('')}</tbody>
    </table></div>

    <div class="kpis">
      <div class="kpi">
        <div class="label">Avancement global</div>
        <div class="value">${prog.pct} %</div>
        <div class="bar" role="img" aria-label="Avancement ${prog.pct} %"><span data-width="${prog.pct}" data-color="var(--accent)"></span></div>
      </div>
      <div class="kpi">
        <div class="label">Tâches (${t.length})</div>
        <div class="bar" role="img" aria-label="Répartition des tâches par statut">
          ${statuses.map((s) => `<span data-width="${t.length ? (count(t, 'statut', s) / t.length) * 100 : 0}" data-color="${COLORS[s]}"></span>`).join('')}
        </div>
        <div class="legend">${statuses.map((s) => `<span><i class="dot" data-color="${COLORS[s]}"></i>${LABELS[s]} : <strong>${count(t, 'statut', s)}</strong></span>`).join('')}</div>
      </div>
      <div class="kpi">
        <div class="label">Tests</div>
        <div class="value">${count(data.tests, 'resultat', 'reussi')} / ${data.tests.length}</div>
        <div class="muted">réussis · ${count(data.tests, 'resultat', 'echoue')} échoué(s) · ${count(data.tests, 'resultat', 'a_faire')} à faire</div>
      </div>
      <div class="kpi">
        <div class="label">Anomalies</div>
        <div class="value">${prog.bugsOpen}</div>
        <div class="muted">ouverte(s) · ${count(data.anomalies, 'statut', 'corrige')} corrigée(s)</div>
      </div>
    </div>
    ${prog.testsKo > 0 ? `<div class="warning"><strong>Recette incomplète :</strong> ${prog.testsKo} test(s) non réussi(s) ou non encore exécuté(s). Le projet ne peut pas être déclaré terminé.</div>` : ''}
    ${prog.capped ? `<div class="warning">Avancement plafonné à 99 % : tests ou anomalies en attente.</div>` : ''}

    <h2>Tâches</h2>
    <div class="filters">
      <label>Statut <select id="f-statut"><option value="">Tous</option>${statuses.map((s) => `<option value="${s}">${LABELS[s]}</option>`).join('')}</select></label>
      <label>Responsable <select id="f-resp"><option value="">Tous</option>${responsables.map((r) => `<option>${esc(r)}</option>`).join('')}</select></label>
    </div>
    <div class="table-wrap"><table>
      <thead><tr><th>ID</th><th>Tâche</th><th>Fonctionnalité</th><th>Responsable</th><th>Priorité</th><th>Statut</th></tr></thead>
      <tbody id="tasks"></tbody>
    </table></div>

    <h2>Tests</h2>
    <div class="table-wrap"><table>
      <thead><tr><th>Lot · ID</th><th>Scénario</th><th>Type</th><th>Résultat</th><th>Date</th></tr></thead>
      <tbody>${data.tests.map((x) => `<tr><td>${esc(x.id)}</td><td>${esc(x.scenario)}</td><td>${esc(x.type)}</td><td>${chip(x.resultat)}</td><td>${esc(x.date || '—')}</td></tr>`).join('')}</tbody>
    </table></div>

    <h2>Anomalies et corrections</h2>
    <div class="table-wrap"><table>
      <thead><tr><th>ID</th><th>Anomalie</th><th>Gravité</th><th>Origine</th><th>Correction</th><th>Statut</th></tr></thead>
      <tbody>${data.anomalies.map((x) => `<tr><td>${esc(x.id)}</td><td>${esc(x.titre)}</td><td>${esc(x.gravite)}</td><td>${esc(x.origine)}</td><td>${esc(x.correction)}</td><td>${chip(x.statut)}</td></tr>`).join('')}</tbody>
    </table></div>

    <h2>Ordre de fusion (vagues)</h2>
    <ol>
      <li>Vague 0 — P1 : socle (site navigable, 4 onglets « en construction »)</li>
      <li>Vague 1 — en parallèle : P2 base de données · P5 comptes et sécurité · P8 onglet Contact</li>
      <li>Vague 2 — P3 données véhicules et photos</li>
      <li>Vague 3 — en parallèle : P4 onglet Véhicules · P6 onglet Connexion</li>
      <li>Vague 4 — P7 réservations</li>
      <li>Vague 5 — P8 parcours complet et recette · P1 version v1.0.0</li>
    </ol>
  `;

  // Largeurs et couleurs appliquées en JavaScript (pas d'attribut style : CSP stricte)

  document.querySelectorAll('[data-width]').forEach((el) => { el.style.width = el.dataset.width + '%'; });

  document.querySelectorAll('[data-color]').forEach((el) => { el.style.background = el.dataset.color; });


  const renderTasks = () => {
    const fs = document.getElementById('f-statut').value;
    const fr = document.getElementById('f-resp').value;
    document.getElementById('tasks').innerHTML = t
      .filter((x) => (!fs || x.statut === fs) && (!fr || x.responsable === fr))
      .map((x) => `<tr><td>${esc(x.id)}</td><td>${esc(x.titre)}</td><td>${esc(x.fonctionnalite)}</td><td>${esc(x.responsable)}</td><td class="p-${esc(x.priorite)}">${esc(x.priorite)}</td><td>${chip(x.statut)}</td></tr>`)
      .join('');
  };
  document.getElementById('f-statut').addEventListener('change', renderTasks);
  document.getElementById('f-resp').addEventListener('change', renderTasks);
  renderTasks();
}

const LOTS = ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'P8'];
Promise.all(LOTS.map((lot) => fetch('taches/' + lot + '.json', { cache: 'no-store' })
  .then((r) => { if (!r.ok) throw new Error(lot + '.json : HTTP ' + r.status); return r.json(); })
  .catch((err) => { throw new Error(lot + '.json — ' + err.message); })))
  .then((files) => render(merge(files)))
  .catch((err) => {
    document.getElementById('app').innerHTML =
      `<div class="error"><strong>Impossible de lire les fichiers pilotage/taches/*.json.</strong> Ouvrez cette page avec Live Server (VS Code), pas en double-cliquant sur le fichier. Si le fichier a été modifié, vérifiez que le JSON est valide (virgules, guillemets). Détail : ${esc(err.message)}</div>`;
  });
