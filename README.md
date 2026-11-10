# FIND MY CAR 🚗

Application web de **location de véhicules**, réalisée par une **équipe de 8 étudiants** sur GitHub, dans un cadre pédagogique.

- **HTML5 / CSS3 / JavaScript** exécuté **dans le navigateur** uniquement, sans framework, code commenté pour débutants.
- **Rien à installer** : ni Node.js, ni npm, ni Python. VS Code + l'extension **Live Server** suffisent.
- **SQLite dans le navigateur** (sql.js / WebAssembly), sauvegardé dans **IndexedDB**. **Aucun back-end.**
- **Sécurité** : politique CSP stricte (aucun script en ligne), mots de passe hachés, requêtes SQL paramétrées — voir [docs/SECURITE.md](docs/SECURITE.md).
- **Vraies photos** des véhicules sous licence libre (Wikimedia Commons), crédits affichés automatiquement.
- **Comptes** client / administrateur, mots de passe hachés (PBKDF2-SHA256).
- **Tests automatiques dans une page du site** (`tests/`), relancés par **GitHub Actions** à chaque Pull Request.

📘 Documents : [Mode opératoire de l'équipe](docs/MODE-OPERATOIRE.md) · [Contrat d'interfaces](docs/CONTRAT-INTERFACES.md) · [Guide VS Code et GitHub](docs/GUIDE-VSCODE-GITHUB.md) · [Sécurité](docs/SECURITE.md) · [Cadrage](CADRAGE.md) · [Pilotage](PILOTAGE.md) · [Rapport de tests](tests/RAPPORT-TESTS.md) · [Crédits photos](img/CREDITS-PHOTOS.md)

---

## Démarrage rapide

1. Ouvrir le dossier dans **VS Code** et installer l'extension **Live Server** (proposée automatiquement).
2. Clic droit sur `index.html` → **Open with Live Server** → le site s'ouvre sur `http://127.0.0.1:5500/`.
3. Tests : `http://127.0.0.1:5500/tests/` → **Lancer tous les tests**.
4. Pilotage de l'équipe : `http://127.0.0.1:5500/pilotage/`.

⚠️ Ne pas ouvrir `index.html` par double-clic (`file://`) : le navigateur bloque SQLite. Un message d'aide s'affiche dans ce cas.

Comptes de **démonstration** (fictifs) :

| Rôle | E-mail | Mot de passe |
|---|---|---|
| Client | `client@findmycar.example.com` | `ClientDemo2026!` |
| Administrateur | `admin@findmycar.example.com` | `AdminDemo2026!` |

---

## Fonctionnalités (4 onglets)

| Onglet | Lot | Ce qu'on peut faire |
|---|---|---|
| **Véhicules** | P4 (+ données P3) | Accueil, catalogue de 11 véhicules avec photo et crédit, filtres catégorie / prix, fenêtre de détails, bouton Réserver |
| **Réservation** | P7 | Prix calculé automatiquement, contrôle des dates et des chevauchements, réservation au nom du compte, liste et annulation ; vue administrateur de toutes les réservations |
| **Nous contacter** | P8 | Coordonnées fictives, formulaire contrôlé, préparation d'un e-mail (`mailto:`) sans jamais prétendre l'avoir envoyé |
| **Connexion** | P6 (+ sécurité P5) | Inscription, connexion, Mon compte, déconnexion, blocage après 5 échecs |

> La consigne prévoit 3 fonctionnalités au maximum. La 4ᵉ (Connexion) est un écart assumé, à valider avec le formateur (voir `CADRAGE.md`, partie 3).

---

## Organisation du code (un propriétaire par fichier)

```
index.html                  page unique, fixe (P1) — charge pages/*.html
pages/<onglet>.html         contenu de chaque onglet ............ P4 · P7 · P8 · P6
css/base.css                styles communs (P1) + css/<onglet>.css par onglet
js/utils.js, js/app.js      outils partagés, routeur, démarrage (P1)
js/db/core.js               moteur SQLite + IndexedDB (P2)
js/db/vehicules.repo.js     table vehicles (P3)   js/photos.js  photos + crédits (P3)
js/auth.js                  sécurité des mots de passe (P5)
js/db/utilisateurs.repo.js  table users (P5)
js/db/reservations.repo.js  table reservations (P7)
js/ui/<onglet>.js           comportement de chaque onglet ....... P4 · P6 · P7 · P8
tests/index.html            page de tests (P1) : mini-test.js, harness.js, runner.js
tests/unit/, tests/e2e/     un fichier de test par lot
outils/verifier-photos.html vérification des photos et licences (P3)
pilotage/                   tableau de bord ; pilotage/taches/P1.json … P8.json
.github/                    CI (GitHub Actions), CODEOWNERS, modèles d'issue et de PR
docs/                       mode opératoire, contrat d'interfaces, guide
```

Chaque onglet déclare ce dont il a besoin. Si un lot n'est pas encore fusionné, l'onglet affiche « en attente de… » au lieu de planter : **le site reste fonctionnel après chaque fusion**.

### Base de données (SQLite)

`users` (P5) · `vehicles` (P3) · `reservations` (P7, clés étrangères vers `users` et `vehicles`) · `fmc_meta` (P2, empreinte des modules). Schémas complets et contraintes dans chaque `js/db/*.repo.js`.

### Photos

Les photos viennent de **Wikimedia Commons** (licences libres). L'application demande à l'API officielle l'adresse de chaque photo, son **auteur** et sa **licence**, et les affiche sous la photo avec un lien vers la source. Sans Internet, ou si une photo n'existe plus, un **dessin générique** s'affiche : le site reste fonctionnel. Vérification et liste des crédits : page `outils/verifier-photos.html` → `img/CREDITS-PHOTOS.md`.

---

## Limites (sans back-end)

- Les comptes et réservations sont **locaux** au navigateur : pas de partage entre appareils ni entre utilisateurs.
- La connexion est une **démonstration** : les mots de passe sont hachés, mais quelqu'un qui manipule son propre navigateur peut modifier la base ou la session.
- La connexion exige un **contexte sécurisé** (https, `localhost`) : elle fonctionne en local et sur GitHub Pages, pas via `http://192.168…`.
- Les photos nécessitent Internet (sinon, dessins).

---

## Licences et crédits

- **sql.js** — licence MIT (`lib/LICENSE-sql.js.txt`).
- **Photos** — Wikimedia Commons, auteurs et licences affichés dans l'application et listés dans `img/CREDITS-PHOTOS.md`. Les marques et modèles appartiennent à leurs constructeurs ; ils servent uniquement d'exemples fictifs de catalogue.
- **Dessins de secours** — illustrations génériques créées pour le projet, sans marque ni logo.
- Projet pédagogique, sans exploitation commerciale.
