# Mode opératoire — FIND MY CAR à 8 sur GitHub

> **Objectif** : construire le site FIND MY CAR **à 8**, entièrement sur GitHub. Chaque étape est **développée par un membre, relue, testée automatiquement et fusionnée**. Après chaque fusion, le site reste **fonctionnel**.
>
> **Outils** : uniquement **VS Code** (avec l'extension Live Server), **Git** et un **navigateur**. Pas de Node.js, pas de npm, pas de Python : le site est en HTML, CSS et JavaScript exécuté par le navigateur, et les tests se lancent dans une page du site (`tests/`).
>
> Documents associés : [CONTRAT-INTERFACES.md](CONTRAT-INTERFACES.md) (ce que chaque lot fournit aux autres) · [GUIDE-VSCODE-GITHUB.md](GUIDE-VSCODE-GITHUB.md) (installation et commandes pas à pas) · [SECURITE.md](SECURITE.md) · [CADRAGE.md](../CADRAGE.md).

---

## Sommaire

1. [Le principe : 8 lots, 1 propriétaire par fichier](#1-le-principe--8-lots-1-propriétaire-par-fichier)
2. [Qui fait quoi](#2-qui-fait-quoi)
3. [Ordre des fusions (vagues)](#3-ordre-des-fusions-vagues)
4. [Étape 0 — Chacun prépare son poste](#4-étape-0--chacun-prépare-son-poste)
5. [Étape 1 — P1 crée le dépôt et le socle](#5-étape-1--p1-crée-le-dépôt-et-le-socle)
6. [Étape 2 — Chacun récupère le dépôt](#6-étape-2--chacun-récupère-le-dépôt)
7. [Étape 3 — Le cycle de travail de chaque membre](#7-étape-3--le-cycle-de-travail-de-chaque-membre)
8. [Fiches des 8 lots](#8-fiches-des-8-lots)
9. [Relire une Pull Request](#9-relire-une-pull-request)
10. [Tests : quoi lancer et quand](#10-tests--quoi-lancer-et-quand)
11. [Éviter et résoudre les conflits](#11-éviter-et-résoudre-les-conflits)
12. [Étape finale — Version 1.0 et mise en ligne](#12-étape-finale--version-10-et-mise-en-ligne)
13. [Règles de sécurité et de données](#13-règles-de-sécurité-et-de-données)
14. [Dépannage](#14-dépannage)

---

## 1. Le principe : 8 lots, 1 propriétaire par fichier

Le code est découpé pour que **deux personnes ne modifient jamais le même fichier**, ce qui évite presque tous les conflits Git.

| Couche | Fichiers | Un fichier par… |
|---|---|---|
| Page | `index.html` (fixe, P1) + `pages/<onglet>.html` | onglet |
| Styles | `css/base.css` (P1) + `css/<onglet>.css` | onglet |
| Données | `js/db/core.js` (moteur) + `js/db/<table>.repo.js` | table SQLite |
| Écrans | `js/ui/<onglet>.js` | onglet |
| Tests | `tests/unit/<lot>.test.js`, `tests/e2e/<lot>.test.js` (lancés par la page `tests/index.html`) | lot |
| Suivi | `pilotage/taches/P<n>.json` | membre |

Le **socle** (lot P1) contient dès le premier jour **tous les fichiers**, la plupart vides (« À remplacer par le lot Px »). Le site s'affiche déjà avec ses 4 onglets « en construction ».
Chaque membre **remplace ses fichiers vides** par le vrai code. Un onglet dont il manque un lot affiche « En attente de : P3 — données véhicules », au lieu de planter.

**Automatismes GitHub** :
- **Intégration continue (CI)** : à chaque Pull Request, GitHub Actions ouvre la page de tests dans Chrome et vérifie que **tous** les tests sont réussis (`.github/workflows/ci.yml`). Cela tourne sur les machines de GitHub, sans rien installer chez vous. Une croix rouge interdit la fusion.
- **CODEOWNERS** : si quelqu'un touche le fichier d'un autre, GitHub demande automatiquement la relecture du propriétaire (`.github/CODEOWNERS`).
- **Modèles** : une Pull Request s'ouvre avec une check-list ; une issue « Tâche » ou « Bug » a un modèle prêt.

---

## 2. Qui fait quoi

Inscrivez les noms ici, ainsi que dans `CADRAGE.md` et `pilotage/taches/P<n>.json`.

| Lot | Rôle | Membre | Fichiers dont il est propriétaire | Branche | Dépend de |
|---|---|---|---|---|---|
| **P1** | Chef de projet, intégrateur GitHub | *à compléter* | socle : `index.html`, `css/base.css`, `js/app.js`, `js/utils.js`, `lib/`, `tests/index.html`, `tests/mini-test.js`, `tests/harness.js`, `tests/runner.js`, `tests/unit/utils.test.js`, `tests/e2e/socle.test.js`, `.github/`, `pilotage/`, documentation | `feature/p1-socle` | — |
| **P2** | Base de données | *à compléter* | `js/db/core.js`, `tests/unit/core.test.js` | `feature/p2-base-de-donnees` | P1 |
| **P3** | Données véhicules et photos | *à compléter* | `js/db/vehicules.repo.js`, `js/photos.js`, `img/vehicules/`, `img/CREDITS-PHOTOS.md`, `outils/verifier-photos.html` et `.js`, `tests/unit/vehicules.test.js` | `feature/p3-vehicules-donnees` | P2 |
| **P4** | Onglet Véhicules | *à compléter* | `pages/vehicules.html`, `css/vehicules.css`, `js/ui/vehicules.js`, `tests/e2e/vehicules.test.js` | `feature/p4-onglet-vehicules` | P2, P3 |
| **P5** | Comptes et sécurité | *à compléter* | `js/auth.js`, `js/db/utilisateurs.repo.js`, `tests/unit/auth.test.js`, `tests/unit/utilisateurs.test.js` | `feature/p5-comptes-securite` | P1 (P2 pour l'appli) |
| **P6** | Onglet Connexion | *à compléter* | `pages/connexion.html`, `css/connexion.css`, `js/ui/connexion.js`, `tests/e2e/connexion.test.js` | `feature/p6-onglet-connexion` | P2, P5 |
| **P7** | Réservations | *à compléter* | `js/db/reservations.repo.js`, `pages/reservation.html`, `css/reservation.css`, `js/ui/reservation.js`, `tests/unit/reservations.test.js`, `tests/e2e/reservation.test.js` | `feature/p7-reservations` | P2, P3, P5, P6 |
| **P8** | Contact, qualité, pilotage | *à compléter* | `pages/contact.html`, `css/contact.css`, `js/ui/contact.js`, `tests/e2e/contact.test.js`, `tests/e2e/parcours.test.js`, `tests/RAPPORT-TESTS.md`, `PILOTAGE.md` | `feature/p8-contact` puis `feature/p8-integration` | P1 (contact) ; tous (parcours) |

**Binômes de relecture** (en plus de P1, qui relit tout avant de fusionner) : P2 ↔ P5 · P3 ↔ P4 · P6 ↔ P7 · P8 ↔ P1.

---

## 3. Ordre des fusions (vagues)

Tout le monde peut **commencer à coder dès le premier jour**, grâce au contrat d'interfaces. Seul l'**ordre de fusion** dans `develop` compte, parce que les tests de bout en bout d'un lot ont besoin des lots dont il dépend.

```
Vague 0  ── P1 socle ───────────────────────────────►  site navigable, 4 onglets « en construction »
Vague 1  ── P2 base ──┬── P5 comptes ──┬── P8 contact ►  onglet Contact opérationnel
Vague 2  ── P3 véhicules (données + photos) ────────►  base remplie (catalogue)
Vague 3  ── P4 onglet Véhicules ──┬── P6 Connexion ─►  catalogue + comptes opérationnels
Vague 4  ── P7 réservations ────────────────────────►  site complet
Vague 5  ── P8 parcours + recette ── P1 v1.0.0 ─────►  version livrée (main + GitHub Pages)
```

Les fusions d'une même vague peuvent se faire **dans n'importe quel ordre**. La CI relance tous les tests à chaque fusion : si tout est vert, le site fonctionne.

> ✅ Cet enchaînement a été **rejoué intégralement** lors de la préparation du kit : socle seul, puis chaque lot dans l'ordre ci-dessus, avec tous les tests verts après chaque fusion (voir `LISEZ-MOI-D-ABORD.md` à la racine du ZIP).

---

## 4. Étape 0 — Chacun prépare son poste

1. Installer **Git**, **VS Code**, un navigateur récent (Chrome, Edge ou Firefox) et créer un compte **GitHub** (détails : [GUIDE-VSCODE-GITHUB.md](GUIDE-VSCODE-GITHUB.md), étape 1). **C'est tout** : ni Node.js, ni npm, ni Python.
2. Dans VS Code, installer les extensions recommandées (VS Code les propose à l'ouverture du projet, grâce à `.vscode/extensions.json`) :

| Extension | À quoi elle sert dans le projet |
|---|---|
| **GitHub Pull Requests** (GitHub) | Se connecter à GitHub, voir les issues, créer / relire / commenter / fusionner une Pull Request **sans quitter VS Code** |
| **GitLens** | Voir qui a écrit chaque ligne, l'historique d'un fichier, comparer des branches |
| **GitHub Actions** (GitHub) | Voir le résultat de la CI (tests verts ou rouges) dans VS Code |
| **Live Server** (indispensable) | Lancer le site et la page de tests : clic droit sur `index.html` → *Open with Live Server* → `http://127.0.0.1:5500` |
| **Prettier** | Mettre le code en forme (`Maj + Alt + F`) |

3. Se connecter à GitHub dans VS Code : icône **Comptes** (en bas à gauche) → *Se connecter avec GitHub*.
4. Configurer Git avec l'**adresse e-mail masquée** de GitHub (*Settings → Emails → Keep my email addresses private*) :
   ```bash
   git config --global user.name "Prénom Nom"
   git config --global user.email "identifiant@users.noreply.github.com"
   ```

---

## 5. Étape 1 — P1 crée le dépôt et le socle

*Responsable : P1. Durée : environ 1 heure. Les autres attendent ce message : « le dépôt est prêt ».*

1. **Créer le dépôt** sur GitHub : *New repository* → `find-my-car` → privé ou public selon la consigne → ne rien cocher (pas de README).
2. **Pousser le socle** : décompresser le ZIP, ouvrir le dossier `depot-initial/` dans VS Code, puis dans le terminal :
   ```bash
   git init
   git add .
   git status                     # vérifier : pas de node_modules, pas de données personnelles
   git commit -m "chore(socle): FIND MY CAR — socle de l'équipe"
   git branch -M main
   git remote add origin https://github.com/<compte>/find-my-car.git
   git push -u origin main
   git checkout -b develop
   git push -u origin develop
   ```
3. **Inviter les 7 membres** : *Settings → Collaborators → Add people*.
4. **Remplacer les `@PSEUDO-Pn`** dans `.github/CODEOWNERS` par les vrais pseudos, puis faire un commit sur `develop`.
5. **Vérifier la CI** : onglet *Actions* → le workflow « Tests » doit être vert ✅ sur `develop` (il ouvre `tests/` dans Chrome sur les machines de GitHub).
6. **Protéger les branches** `main` et `develop` : *Settings → Branches → Add branch ruleset* (ou *Add rule*) :
   - ☑ *Require a pull request before merging* → *Require approvals : 1*
   - ☑ *Require review from Code Owners*
   - ☑ *Require status checks to pass* → choisir **« Tests du site dans Chrome »**
   - ☑ *Block force pushes*
7. **Créer le tableau de suivi** (facultatif mais conseillé) : *Projects → New project → Board*, colonnes *À faire / En cours / En relecture / Terminé*. Créer une **issue par tâche** avec le modèle « Tâche » (les tâches sont listées dans les fiches ci-dessous) et l'assigner à son responsable.
8. Annoncer à l'équipe : « dépôt prêt, branche de travail : `develop` ».

---

## 6. Étape 2 — Chacun récupère le dépôt

Dans un terminal (ou VS Code : *Ctrl + Maj + P → Git: Clone*) :

```bash
git clone https://github.com/<compte>/find-my-car.git
cd find-my-car
git checkout develop
code .               # ouvre le dossier dans VS Code
```

Puis, dans VS Code : clic droit sur `index.html` → **Open with Live Server**.
- Le site : `http://127.0.0.1:5500/` → 4 onglets « en construction » le premier jour.
- Les tests : `http://127.0.0.1:5500/tests/` → bouton **Lancer tous les tests**. Ils doivent être verts dès le premier jour.
- Le pilotage : `http://127.0.0.1:5500/pilotage/`.

En cas de problème : section [14. Dépannage](#14-dépannage).

---

## 7. Étape 3 — Le cycle de travail de chaque membre

Chaque tâche suit **toujours** ce cycle :

```
 issue  →  branche  →  code  →  tests  →  commit  →  push  →  Pull Request  →  CI ✅  →  relecture  →  fusion  →  pilotage
```

### 7.1 Créer sa branche depuis `develop` à jour

```bash
git checkout develop
git pull origin develop
git checkout -b feature/p4-onglet-vehicules      # le nom de VOTRE branche (tableau §2)
```
*Avec VS Code* : en bas à gauche, cliquer sur le nom de la branche → *Créer une branche à partir de…* → `develop`.

### 7.2 Écrire son code — deux façons de faire

Le dossier `livrables/` du ZIP contient le **code de référence** de chaque lot, testé.

- **Façon A (recommandée, pour apprendre)** : écrire son code soi-même, en s'aidant si besoin d'une IA avec le **prompt** de sa fiche (§8). Les **tests du lot** servent de juge : quand ils sont verts, c'est bon. Le livrable sert de corrigé en cas de blocage.
- **Façon B (si le temps manque)** : copier les fichiers de `livrables/P<n>-…/` dans le dépôt, **aux mêmes emplacements**, puis **lire et comprendre** chaque fichier (commentaires détaillés). Chacun doit pouvoir **expliquer son code** en soutenance.

Dans les deux cas : ne modifier **que les fichiers de son lot**.

### 7.3 Tester sur son poste

- Ouvrir **`http://127.0.0.1:5500/tests/`** (Live Server) → **Lancer tous les tests** → tout doit être vert. Les tests de vos onglets sont verts dès que les lots dont vous dépendez sont fusionnés.
- Puis vérifier **à la main** dans le site (`http://127.0.0.1:5500/`), y compris en mode smartphone (`F12` → icône téléphone).
- Regarder la **console** (`F12` → *Console*) : aucune erreur rouge, en particulier aucun message *Content Security Policy*. Le seul message attendu concerne le script de rechargement automatique de Live Server (voir §14).

### 7.4 Enregistrer et publier

```bash
git status                                   # vérifier la liste des fichiers modifiés
git add js/ui/vehicules.js pages/vehicules.html css/vehicules.css tests/e2e/vehicules.test.js
git commit -m "feat(vehicules): catalogue, filtres et fenêtre de détails"
git push -u origin feature/p4-onglet-vehicules
```
*Avec VS Code* : vue **Contrôle de code source** (`Ctrl + Maj + G`) → **+** sur chaque fichier → message → **Valider** → **Publier la branche**.

Messages de commit : `feat(...)` (fonctionnalité), `fix(...)` (correction), `test(...)`, `docs(...)`, `style(...)`, puis une phrase courte au présent.

### 7.5 Ouvrir la Pull Request

- Sur GitHub : bouton **Compare & pull request** → **base : `develop`** ← compare : votre branche.
- *Ou dans VS Code* (extension GitHub Pull Requests) : vue **GitHub** → **Create Pull Request** → base `develop`.
- Remplir la check-list du modèle, ajouter le **relecteur** (binôme §2) et lier l'issue (`Closes #12`).
- Si vous dépendez d'un lot pas encore fusionné : ouvrir la PR en **brouillon (Draft)**. La CI peut être rouge, c'est normal. Passez-la en *Ready for review* une fois vos dépendances fusionnées.

### 7.6 CI, relecture, fusion

1. Attendre la **CI verte ✅** (onglet *Checks* de la PR, ou extension GitHub Actions).
2. Le relecteur commente ou approuve (§9). Pour corriger, faites de nouveaux commits sur **la même branche** et `git push` : la PR se met à jour toute seule.
3. **P1 fusionne** (*Squash and merge*) puis supprime la branche.

### 7.7 Mettre à jour le pilotage

Dans `pilotage/taches/P<n>.json` (votre fichier uniquement) : passer vos tâches à `"termine"` et vos tests à `"reussi"` **seulement s'ils ont réellement été exécutés**, avec la date. Ajoutez toute anomalie trouvée dans `"anomalies"`. C'est idéalement un commit de la même PR. Le tableau de bord est sur `http://127.0.0.1:5500/pilotage/`.

### 7.8 Se resynchroniser

Après chaque fusion (la vôtre ou celle d'un autre) :
```bash
git checkout develop
git pull origin develop
```

---

## 8. Fiches des 8 lots

Chaque fiche est aussi disponible dans `livrables/P<n>-…/LISEZ-MOI.md` du ZIP.

### P1 — Chef de projet et intégrateur (socle, GitHub, CI)
- **Mission** : créer le dépôt, pousser le socle, configurer GitHub (protections, CI, CODEOWNERS, projet), fusionner les PR dans l'ordre des vagues, publier la v1.0.0.
- **Tâches** : P1-1 dépôt et membres · P1-2 socle · P1-3 CI obligatoire · P1-4 CODEOWNERS · P1-5 fusions · P1-6 version 1.0.0.
- **Tests** : `tests/e2e/socle.test.js` (doit rester vert à **chaque** fusion), `tests/unit/utils.test.js`, ainsi que la page de tests elle-même (`tests/index.html`, `mini-test.js`, `harness.js`, `runner.js`).
- **Prompt simple** : « Explique-moi comment protéger la branche `develop` sur GitHub pour exiger une Pull Request relue et des tests GitHub Actions verts avant chaque fusion. »
- **Fini quand** : `main` contient la v1.0.0 taguée, la CI est verte, le site est en ligne.

### P2 — Base de données
- **Mission** : le moteur SQLite partagé. Il charge sql.js, recrée ou recharge la base (IndexedDB), laisse chaque dépôt déclarer ses tables (`DB.register`) et sauvegarde après chaque modification.
- **Fichiers** : `js/db/core.js`, `tests/unit/core.test.js`.
- **Prompt simple** : « Écris en JavaScript sans framework un module `DB` qui utilise sql.js dans le navigateur : `register({name, version, schema, seed})`, `init()` qui recharge la base depuis IndexedDB ou la crée, `handle()`, `save()` et `reset()`. Commente pour un débutant. »
- **Vérifier** : page `tests/`, puis dans le navigateur *F12 → Application → IndexedDB → findmycar*.
- **Fini quand** : les tests sont verts et le bandeau « Socle en place » disparaît au démarrage.

### P3 — Données véhicules et photos
- **Mission** : la table `vehicles` (11 véhicules fictifs), les filtres, et les **vraies photos** sous licence libre (Wikimedia Commons). Chaque photo est affichée avec son **auteur et sa licence**, lus automatiquement auprès de Commons. Sans connexion, le dessin de secours s'affiche.
- **Fichiers** : `js/db/vehicules.repo.js`, `js/photos.js`, `img/vehicules/*.svg`, `img/CREDITS-PHOTOS.md`, `outils/verifier-photos.html` et `outils/verifier-photos.js`, `tests/unit/vehicules.test.js`.
- **À faire avec Internet** : ouvrir `http://127.0.0.1:5500/outils/verifier-photos.html` → **Vérifier les photos**. La page affiche chaque photo avec son auteur et sa licence, et produit le tableau à coller dans `img/CREDITS-PHOTOS.md`. Si une photo est « INTROUVABLE », choisissez un autre fichier sur commons.wikimedia.org (licence CC0, CC BY ou CC BY-SA uniquement), changez `photo_file` et augmentez `VERSION`.
- **Prompt simple** : « Avec l'API de Wikimedia Commons (prop=imageinfo, extmetadata), écris une fonction JavaScript qui récupère, pour une liste de fichiers, l'adresse d'une vignette de 640 px, l'auteur et la licence, pour les afficher en crédit sous chaque photo. »
- **Fini quand** : tests verts, crédits vérifiés et `img/CREDITS-PHOTOS.md` à jour.

### P4 — Onglet Véhicules
- **Mission** : page d'accueil, chiffres clés, catalogue en cartes (photo et crédit), filtres catégorie et prix, fenêtre de détails, bouton « Réserver ».
- **Fichiers** : `pages/vehicules.html`, `css/vehicules.css`, `js/ui/vehicules.js`, `tests/e2e/vehicules.test.js`.
- **Prompt simple** : « En HTML/CSS/JavaScript sans framework, affiche une grille de cartes de véhicules (photo, crédit, marque, modèle, catégorie, prix par jour) avec deux filtres (catégorie, gamme de prix) et une fenêtre `<dialog>` de détails. Les données viennent de `VehiculesRepo.getVehicles(filtres)`. »
- **Fini quand** : `vehicules.e2e` vert, affichage correct sur smartphone.

### P5 — Comptes et sécurité
- **Mission** : la table `users`, deux comptes de démonstration, l'inscription et la connexion **sécurisées** : mots de passe hachés (PBKDF2), comparaison en temps constant, message d'erreur générique, blocage après 5 échecs.
- **Fichiers** : `js/auth.js`, `js/db/utilisateurs.repo.js`, `tests/unit/auth.test.js`, `tests/unit/utilisateurs.test.js`.
- **Prompt simple** : « Avec la Web Crypto API, écris une fonction JavaScript qui hache un mot de passe avec PBKDF2-SHA256, un sel aléatoire de 16 octets et 600 000 itérations, puis une fonction qui le vérifie en temps constant. Explique pourquoi on ne stocke jamais un mot de passe en clair. »
- **Fini quand** : tests verts. Les tests de P5 n'ont pas besoin de P2 : ils peuvent passer dès la vague 1.

### P6 — Onglet Connexion
- **Mission** : formulaires de connexion et d'inscription, « Mon compte », session (sessionStorage), badge du compte dans l'en-tête, déconnexion, retour automatique vers la réservation après connexion.
- **Fichiers** : `pages/connexion.html`, `css/connexion.css`, `js/ui/connexion.js`, `tests/e2e/connexion.test.js`.
- **Prompt simple** : « Crée un onglet de connexion en JavaScript sans framework : formulaire de connexion, formulaire d'inscription avec messages d'erreur par champ, carte "Mon compte" et bouton de déconnexion. Les appels passent par `Users.login()` et `Users.register()`. La session est gardée dans `sessionStorage`. »
- **Fini quand** : `connexion.e2e` vert.

### P7 — Réservations
- **Mission** : la table `reservations` et toutes les règles. Calcul du prix, dates valides, refus des chevauchements (tous comptes confondus), réservation au nom du compte connecté. Un client annule ses réservations, l'administrateur toutes. Plus l'onglet Réservation.
- **Fichiers** : `js/db/reservations.repo.js`, `pages/reservation.html`, `css/reservation.css`, `js/ui/reservation.js`, `tests/unit/reservations.test.js`, `tests/e2e/reservation.test.js`.
- **Prompt simple** : « Écris une requête SQLite qui trouve les réservations actives d'un véhicule chevauchant la période [début, fin[ (la date de fin n'est pas incluse). Puis une fonction JavaScript qui refuse une réservation si cette requête renvoie un résultat. »
- **Fini quand** : tests unitaires et `reservation.e2e` verts.

### P8 — Contact, qualité et pilotage
- **Mission 1 (vague 1)** : onglet Nous contacter (vérification des champs, lien `mailto:` honnête) et son test.
- **Mission 2 (vague 5)** : le test d'**intégration** `parcours.test.js` (parcours client complet + agence) et la **recette manuelle** : Firefox, Edge, Safari, smartphone, messagerie réelle, clavier. Enfin, mise à jour de `tests/RAPPORT-TESTS.md` et `PILOTAGE.md`.
- **Prompt simple** : « Avec l'objet TestApp de tests/harness.js (open, click, setValue, waitFor, login), écris un test qui ouvre le site, filtre les véhicules électriques, réserve la Renault Zoe, crée un compte quand le site le demande, confirme la réservation, puis vérifie que l'administrateur la voit et peut l'annuler. »
- **Fini quand** : `parcours.e2e` vert, recette manuelle notée dans le rapport.

---

## 9. Relire une Pull Request

Le relecteur (binôme) puis P1 vérifient :

- [ ] La PR ne modifie **que** les fichiers du lot (onglet *Files changed*).
- [ ] La **CI est verte**.
- [ ] Le code est **commenté** et compréhensible par un débutant.
- [ ] Le contrat d'interfaces est respecté (noms de fonctions, paramètres).
- [ ] Aucun texte saisi par l'utilisateur n'est inséré dans la page sans `Utils.escapeHTML`.
- [ ] Aucune donnée personnelle, aucun mot de passe réel.
- [ ] Testé à la main : `git fetch origin && git checkout <branche>`, puis Live Server (site + page `tests/`).
- [ ] Aucune règle de sécurité affaiblie : pas de script ni de style en ligne, pas de modification de la CSP (voir [SECURITE.md](SECURITE.md)).

Pour relire **dans VS Code** : vue **GitHub Pull Requests** → la PR → *Checkout* → parcourir les fichiers modifiés, commenter une ligne (icône **+** dans la marge), puis **Approve** ou **Request changes**.

---

## 10. Tests : quoi lancer et quand

| Où | Contenu | Quand |
|---|---|---|
| `http://127.0.0.1:5500/tests/` (Live Server) | **tous** les tests : unitaires (règles, base SQLite, sécurité) puis tests de l'application, qui s'ouvre dans un cadre et y simule les clics et la saisie | avant chaque commit et chaque push |
| `http://127.0.0.1:5500/outils/verifier-photos.html` | vérification réelle des photos et des licences (Internet requis) | P3, puis avant la v1.0.0 |
| CI GitHub Actions | la même page `tests/`, ouverte dans Chrome sur les machines de GitHub | automatiquement, à chaque PR |

Les fichiers de test de chaque lot sont **déjà listés** dans `tests/runner.js`. Un fichier pas encore livré apparaît simplement « pas encore livré » : ce n'est pas une erreur.
Les tests effacent les comptes et réservations de démonstration du navigateur utilisé.

**Si la CI est rouge** : ouvrir *Details* sur la PR. La dernière étape affiche le premier test en échec et son message. Relancer `tests/` sur votre poste pour voir le détail, corriger, puis `git push`.

**Règle d'honnêteté** : un test n'est marqué « réussi » dans le pilotage que s'il a été **réellement exécuté**. L'avancement ne peut pas afficher 100 % tant qu'un test est « à faire ».

---

## 11. Éviter et résoudre les conflits

**Pour les éviter** :
- Ne modifier **que** ses fichiers (§2). Pour changer le fichier d'un autre, ouvrir une **issue** et le lui demander.
- `git pull origin develop` **chaque matin** et avant chaque `push`.
- Des **petites PR** fréquentes, plutôt qu'une énorme à la fin.
- Ne pas reformater tout un fichier dans la même PR qu'un changement de fond.

**Pour en résoudre un** (message `CONFLICT` après un `git pull origin develop`) :
1. Ouvrir le fichier signalé : VS Code affiche **Accept Current / Incoming / Both** au-dessus de chaque conflit.
2. Choisir, ou combiner à la main, puis vérifier avec la page `tests/`.
3. `git add <fichier>` → `git commit` → `git push`.
4. En cas de doute : demander à P1. **Jamais** de `git push --force`.

---

## 12. Étape finale — Version 1.0 et mise en ligne

*Responsables : P8 (recette) puis P1 (publication).*

1. P8 fusionne `parcours.test.js`, `tests/RAPPORT-TESTS.md` et `PILOTAGE.md` à jour.
2. P1 ouvre une PR **`develop` → `main`** intitulée « Version 1.0.0 ». Toute l'équipe relit, puis la CI doit être verte.
3. Après la fusion :
   ```bash
   git checkout main
   git pull origin main
   git tag -a v1.0.0 -m "FIND MY CAR — version 1.0.0"
   git push origin v1.0.0
   ```
4. **Mise en ligne gratuite** : *Settings → Pages → Source : Deploy from a branch → `main` / `(root)`*. Le site est publié en **https** (`https://<compte>.github.io/find-my-car/`). Cela permet aussi de tester la connexion sur smartphone, car le chiffrement des mots de passe exige https.
5. *Releases → Draft a new release* → tag `v1.0.0` → décrire les fonctionnalités et joindre le rapport de tests.

---

## 13. Règles de sécurité et de données

- **Aucune donnée personnelle sur GitHub** : uniquement des données fictives (`exemple.fr`, `example.com`). Les comptes et réservations créés en test restent dans **votre navigateur**, jamais dans le dépôt.
- Ne jamais committer `.env`, mots de passe, exports de base (`*.sqlite`) : ils sont déjà ignorés par `.gitignore`.
- Les deux comptes de démonstration (`ClientDemo2026!`, `AdminDemo2026!`) sont **publics et fictifs**. N'utilisez jamais un de vos vrais mots de passe dans l'application.
- **Photos** : uniquement des fichiers Wikimedia Commons sous licence **CC0, domaine public, CC BY ou CC BY-SA**, toujours avec l'auteur, la licence et le lien. Jamais une image prise au hasard sur Internet ou sur le site d'un constructeur.
- **Ne jamais affaiblir la politique de sécurité** (CSP) : pas de `<script>` ni de `style="…"` dans le HTML, pas d'attribut `onclick=`, pas de bibliothèque chargée depuis un autre site. Toutes les mesures sont décrites dans [SECURITE.md](SECURITE.md).
- La connexion est une **démonstration sans serveur** : elle protège les mots de passe (hachés), mais ne protège pas contre quelqu'un qui manipule son propre navigateur. C'est expliqué dans `SECURITE.md` et `CADRAGE.md`, et c'est un bon sujet de soutenance pour un projet de cybersécurité.

---

## 14. Dépannage

| Problème | Solution |
|---|---|
| `git` non reconnu | Installer Git, puis **fermer et rouvrir** VS Code |
| Bandeau « Impossible de démarrer » + mention `file://` | La page a été ouverte par double-clic : utiliser **Live Server** |
| Pas de bouton *Open with Live Server* | Installer l'extension **Live Server** (Ritwick Dey), puis recharger VS Code |
| Message *Content Security Policy* concernant un script de Live Server dans la console | Normal : la politique de sécurité bloque le script de rechargement automatique que Live Server ajoute. Rechargez la page à la main (`F5`). Tout autre message CSP est une vraie erreur |
| Les tests « Auth » échouent avec « Web Crypto » | La page n'est pas en `127.0.0.1` / `localhost` / https (par exemple ouverte par une adresse IP) |
| Un onglet affiche « En attente de : P3 … » | Normal : le lot indiqué n'est pas encore fusionné. Faire `git pull origin develop` |
| « Base de données mise à jour » au démarrage | Normal après la fusion d'un lot de données : la base de démo locale est recréée |
| Les photos n'apparaissent pas (dessins à la place) | Pas d'accès Internet, ou Wikimedia bloqué par le réseau. Le site reste fonctionnel. Vérifier avec `outils/verifier-photos.html` |
| « Connexion indisponible sur cette adresse » | Page ouverte en `http://192.168…` : utiliser `localhost`, ou GitHub Pages (https) |
| La CI est rouge mais tout passe sur mon poste | Avez-vous `git pull origin develop` ? Relancer `tests/` après avoir vidé le cache (`Ctrl + F5`). Lire le message de la dernière étape dans *Details* |
| Erreur `rejected` au `git push` | Quelqu'un a poussé avant vous sur la même branche : `git pull`, puis à nouveau `git push` |
| Je me suis trompé de branche | `git stash` → `git checkout <bonne-branche>` → `git stash pop` |
