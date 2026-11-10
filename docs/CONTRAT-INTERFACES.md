# Contrat d'interfaces — FIND MY CAR

> **À quoi sert ce document ?** Chaque lot utilise des fonctions fournies par d'autres lots. Ce contrat fixe **leur nom, leurs paramètres et ce qu'elles renvoient**. Tant que chacun le respecte, les 8 membres peuvent coder **en même temps**, chacun dans ses fichiers, et tout fonctionne une fois fusionné.
>
> Règle d'or : **on ne change pas une interface sans l'accord de l'équipe** (issue GitHub + validation du chef de projet P1), car d'autres lots en dépendent.

---

## Vue d'ensemble

```
            ┌───────────── P1 : socle (index.html, App, UI, Utils, css/base.css) ─────────────┐
            │                                                                                │
  Écrans    │  P4 Vehicles        P6 Account          P7 Reservations       P8 Contact       │
  (js/ui)   │     │  │               │  │                │  │  │                (rien)       │
            │     │  └── Photos ◄─┐  │  └── Users ◄───┐  │  │  └── Account                   │
  Données   │     └── VehiculesRepo │  │     Auth ◄───┘  │  └── ReservationsRepo             │
  (js/db)   │         (P3)    (P3)  │  └───────(P5)──────┘          (P7)                      │
            │                       │                                                        │
            │                 DB (P2) : moteur SQLite + sauvegarde IndexedDB                  │
            └────────────────────────────────────────────────────────────────────────────────┘
```

Chaque module est un **objet global** (`window.NomDuModule`). Un écran déclare les objets dont il a besoin (`requires`) : tant qu'un lot n'est pas fusionné, l'onglet affiche « en attente de … » au lieu de planter. **Le site reste fonctionnel à chaque fusion.**

Ordre de chargement des scripts (fixé dans `index.html`, ne pas le modifier) :
`sql-wasm.js → utils.js → app.js → auth.js → db/core.js → db/vehicules.repo.js → db/utilisateurs.repo.js → db/reservations.repo.js → photos.js → ui/vehicules.js → ui/connexion.js → ui/reservation.js → ui/contact.js`

---

## P1 — Socle

### `App` (js/app.js)
| Fonction | Rôle |
|---|---|
| `App.registerTab(nom, { init, requires })` | À appeler **une fois** à la fin de chaque `js/ui/*.js`. `nom` ∈ `vehicules`, `reservation`, `contact`, `connexion`. `requires` = noms des objets globaux nécessaires (ex. `['DB', 'VehiculesRepo']`). |
| `App.showTab(nom, { focusId?, scrollToId? })` | Affiche un onglet (et place le curseur dans le champ `focusId`). |
| `App.isActive(nom)` | `true` si l'onglet est en service (lot fusionné et démarré). |
| `App.missing(requires)` | Liste des objets requis encore absents. |

### `UI` (js/app.js)
`UI.showAlert(element, 'success'|'error'|'info'|'warning', html)`, `UI.hideAlert(element)`, `UI.setFieldError(input, bool)`, `UI.clearFieldErrors(form)`.
⚠️ Le `html` passé à `showAlert` doit déjà être protégé avec `Utils.escapeHTML` pour tout texte saisi par un utilisateur.

### `Utils` (js/utils.js) — fonctions pures, utilisables partout
`isValidISODate`, `todayISO`, `addDays`, `countDays`, `computeTotal`, `validateDates(début, fin, aujourdhui) → string[]`, `periodsOverlap`, `isValidEmail`, `formatPrice`, `formatDateFR`, `escapeHTML`, `sqlAll(db, sql, params) → objets[]`, `sqlGet(…) → objet|null`, `sqlRun(…) → { changes, lastId }`.

### Événement global
`document` émet **`fmc:data-reset`** après « Réinitialiser les données de démonstration ». Chaque écran qui affiche des données l'écoute pour se rafraîchir.

### Pages et styles
- `pages/<onglet>.html` : fragment HTML inséré dans `<section data-panel="<onglet>">`. Chaque lot écrit **son** fichier.
- `css/<onglet>.css` : styles de l'onglet. Les couleurs et classes communes (`.btn`, `.card`, `.alert`, `.field`, `.specs`…) sont dans `css/base.css` (P1).
- Identifiants HTML utilisés par d'autres lots ou par les tests : voir le tableau en fin de document.

---

## P2 — `DB` (js/db/core.js)

| Fonction | Rôle |
|---|---|
| `DB.register({ name, version, schema, seed })` | Appelée par chaque dépôt **au chargement de son script**. `schema` = SQL de création des tables ; `seed(db)` = insère les données de démonstration. Augmenter `version` quand la structure d'une table change. |
| `DB.init() → Promise<{ restored, persistent, upgraded }>` | Appelée par `App` au démarrage (personne d'autre ne l'appelle). |
| `DB.handle()` | Base sql.js ouverte (à passer aux fonctions `Q` des dépôts). |
| `DB.all / DB.get / DB.run (sql, params)` | Raccourcis sur la base ouverte. |
| `DB.save() → Promise` | **À appeler après chaque modification** (insertion, mise à jour). |
| `DB.reset() → Promise` | Recrée la base de démonstration (utilisée par `App`). |
| `DB.isPersistent()` | `false` si IndexedDB est indisponible (navigation privée). |

---

## P3 — `VehiculesRepo` (js/db/vehicules.repo.js) et `Photos` (js/photos.js)

**Table `vehicles`** : `id, brand, model, category, daily_price, seats, transmission, fuel, image (dessin .svg), photo_file (fichier Wikimedia Commons), description`.

| `VehiculesRepo` | Renvoie |
|---|---|
| `getCategories()` | catégories triées à la française |
| `getVehicles({ category?, priceRange? })` | véhicules triés par prix (`priceRange` ∈ `all`, `eco`, `mid`, `high`) |
| `getVehicleById(id)` | véhicule ou `null` |
| `PRICE_RANGES`, `CATEGORIES`, `SEED`, `Q` (fonctions SQL pures pour les tests) | |

| `Photos` | Rôle |
|---|---|
| `Photos.load(fichiers[]) → Promise<nombre>` | Récupère en une requête l'adresse, l'auteur et la licence des photos auprès de l'API Wikimedia Commons. Ne rejette jamais (hors ligne → 0). |
| `Photos.imageFor(vehicule) → { src, isPhoto, alt, creditHTML }` | La photo + son crédit si elle est disponible, sinon le dessin `image` et « Illustration générique ». |

---

## P5 — `Auth` (js/auth.js) et `Users` (js/db/utilisateurs.repo.js)

**Table `users`** : `id, name, email (unique, sans tenir compte des majuscules), password_hash, password_salt, password_iterations, role ('client'|'admin'), created_at`.

| `Users` | Renvoie |
|---|---|
| `Users.register({ name, email, password, passwordConfirm })` | `Promise<{ ok, errors: [{ field, message }], user? }>` — toujours rôle `client` |
| `Users.login(email, password)` | `Promise<{ ok, error?, locked?, user? }>` — message identique si l'e-mail est inconnu ; blocage 30 s après 5 échecs |
| `Users.getById(id)` | compte **sans** empreinte ni sel, ou `null` |

`Auth` : `hashPassword`, `verifyPassword`, `validatePassword`, `validateRegistration`, `createLoginLimiter`, `normalizeEmail`, `isAvailable()` (Web Crypto présent ?).

---

## P6 — `Account` (js/ui/connexion.js)

| Fonction / événement | Rôle |
|---|---|
| `Account.currentUser()` | compte connecté (`{ id, name, email, role }`) ou `null` |
| `Account.requireLogin(onglet, message)` | ouvre l'onglet Connexion avec un message, puis **revient à `onglet`** après connexion |
| `Account.render()` | rafraîchit « Mon compte » (ex. après une réservation) |
| événement `account:change` sur `document` | émis à chaque connexion / déconnexion (`detail.user`) |

---

## P7 — `ReservationsRepo` (js/db/reservations.repo.js) et `Reservations` (js/ui/reservation.js)

**Table `reservations`** : `id, vehicle_id → vehicles, user_id → users, customer_name, customer_email, start_date, end_date, days, total_price, status ('active'|'cancelled'), created_at, cancelled_at`.

| `ReservationsRepo` | Renvoie |
|---|---|
| `quote({ vehicleId, startDate, endDate })` | `{ ok, errors, vehicle, days, total, conflicts }` (ne modifie rien) |
| `create({ vehicleId, startDate, endDate, userId })` | `Promise<{ ok, errors, reservation? }>` |
| `listFor(user)` | toutes les réservations pour un admin, les siennes pour un client, `[]` sans compte |
| `countActiveForUser(userId)` | nombre de réservations actives |
| `cancel(id, user)` | `Promise<{ ok, error? }>` (droits vérifiés) |

| `Reservations` | Rôle |
|---|---|
| `Reservations.selectVehicle(id)` | présélectionne un véhicule (appelée par le bouton « Réserver » de P4) |

---

## P8 — `Contact` (js/ui/contact.js)

N'utilise aucun autre lot. `Contact.CONTACT_INFO` (coordonnées fictives), `Contact.openMailClient(url)` (isolée pour les tests).

---

## Identifiants HTML partagés (utilisés par d'autres lots ou par les tests)

| Identifiant | Défini dans | Utilisé par |
|---|---|---|
| `#user-chip` | index.html (P1) | P6 (rempli), tests |
| `#reset-demo` | index.html (P1) | P1, tests |
| `#res-vehicle`, `#res-start`, `#res-end`, `#res-submit`, `#reservation-list`, `#my-res-title` | pages/reservation.html (P7) | P4 (focus), tests |
| `#login-email`, `#login-password`, `#login-submit`, `#login-message`, `#auth-guest`, `#auth-user`, `#auth-notice`, `#logout-button` | pages/connexion.html (P6) | aide de test `login()` (P1), tests de P7 et P8 |
| `#filters`, `#filter-category`, `#vehicle-grid`, `.vehicle-card`, `#vehicle-dialog`, `#dialog-reserve` | pages/vehicules.html (P4) | tests de P8 |
| `#contact-form`, `#contact-message` | pages/contact.html (P8) | tests |

---

## Tests — `TestApp` (tests/harness.js, P1) et `suite` / `test` / `assert` (tests/mini-test.js, P1)

Chaque lot écrit **son** fichier de test, déjà référencé dans `tests/runner.js` (ne pas modifier ce fichier) :
`unit/utils` (P1) · `unit/core` (P2) · `unit/vehicules` (P3) · `unit/auth` et `unit/utilisateurs` (P5) · `unit/reservations` (P7) · `e2e/socle` (P1) · `e2e/vehicules` (P4) · `e2e/contact` et `e2e/parcours` (P8) · `e2e/connexion` (P6) · `e2e/reservation` (P7).

```js
suite('P4 — Onglet Véhicules', function () {
  before(async function () { await TestApp.reset(); await TestApp.open('vehicules', { photos: 'fake' }); });
  test('11 cartes', function () { assert.equal(TestApp.$$('.vehicle-card').length, 11); });
});
```

| `TestApp` | Rôle |
|---|---|
| `freshDb([Repo1, Repo2…])` | base SQLite neuve en mémoire avec les tables et données de ces dépôts (tests unitaires) |
| `reset()` | efface les données de démonstration et la session |
| `open(onglet, { photos, width })` — `photos` vaut `'off'` (dessins) ou `'fake'` | ouvre l'application dans le cadre ; `photos: 'fake'` = fausses photos avec crédits, sans Internet |
| `reload()`, `goTab(onglet)`, `visiblePanel()` | navigation |
| `$`, `$$`, `text`, `click`, `setValue`, `select`, `waitFor(condition, message)` | lire et agir dans la page |
| `login(email, mdp)` → message d'erreur ou `null`, `logout()` | connexion par le formulaire (P6) |
| `setWidth(px)` | largeur d'écran simulée (390 smartphone, 768 tablette, 1280 ordinateur) |
| `errors` | erreurs JavaScript relevées dans l'application (doit rester vide) |
| `TODAY`, `day(n)`, `clean(texte)` | date fixe des tests unitaires, date relative, montant sans espaces |

`assert` : `ok`, `equal`, `notEqual`, `deepEqual`, `match`, `doesNotMatch`, `throws`.
