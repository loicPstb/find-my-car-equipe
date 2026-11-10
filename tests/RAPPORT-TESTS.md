# Rapport de tests — FIND MY CAR

> Responsable de ce fichier : **P8**. Ne déclarer un test « réussi » que s'il a été **réellement exécuté**.
> Ce rapport contient d'abord les résultats de la **vérification du kit** faite avant sa remise à l'équipe, puis la partie que l'équipe complète pendant le projet.

## 1. Comment lancer les tests (rien à installer)

| Où | Contenu |
|---|---|
| `http://127.0.0.1:5500/tests/` (Live Server) → **Lancer tous les tests** | Tests unitaires (règles, base SQLite, sécurité), puis tests de l'application : elle s'ouvre dans un cadre, les clics et la saisie y sont simulés. Les photos Wikimedia sont **simulées** (`?photos=fake`) ou coupées (`?photos=off`), pour des résultats identiques avec ou sans Internet |
| `http://127.0.0.1:5500/outils/verifier-photos.html` | Vérification **réelle** des photos, auteurs et licences auprès de Wikimedia Commons (Internet requis) |
| GitHub Actions (`.github/workflows/ci.yml`) | À chaque Pull Request : Nginx sert le site, Chrome ouvre `tests/?auto=1`, et le résultat est lu dans le titre de la page (`FMC-TESTS OK n/n`). Ni Node.js, ni npm, ni Python |

## 2. Vérification du kit (10/11/2026, avant remise à l'équipe)

Environnement : Google Chrome sans fenêtre, lancé par le script de la CI (`.github/scripts/lancer-tests.sh`). Un serveur web statique local remplaçait Nginx.

### 2.1 Rejeu des fusions dans l'ordre des vagues — toutes les étapes vertes

Le dépôt initial (socle) a été copié, puis chaque livrable a été ajouté **dans l'ordre du mode opératoire**. La page de tests complète a été relancée après chaque ajout.

| Étape | Tests réussis | Onglets actifs |
|---|---|---|
| Vague 0 — socle P1 | 13 / 13 ✅ | aucun (4 « en construction ») |
| + P2 base de données | 18 / 18 ✅ | aucun |
| + P5 comptes et sécurité | 26 / 26 ✅ | aucun |
| + P8 onglet Contact | 31 / 31 ✅ | Contact |
| + P3 véhicules et photos | 37 / 37 ✅ | Contact |
| + P4 onglet Véhicules | 43 / 43 ✅ | Véhicules, Contact |
| + P6 onglet Connexion | 51 / 51 ✅ | Véhicules, Contact, Connexion |
| + P7 réservations | 66 / 66 ✅ | les 4 |
| + P8 parcours complet | 71 / 71 ✅ | les 4 |

L'état final est **identique fichier par fichier** au dossier `solution-complete/`. Le script de la CI a aussi été vérifié **en cas d'échec** : un test volontairement faux donne `FMC-TESTS KO 70/71`, avec le nom du test, et un code de sortie 1, donc une croix rouge sur la Pull Request.

### 2.2 Ce que couvrent les tests

| Lot | Fichier (nombre de tests) | Ce qui est vérifié |
|---|---|---|
| P1 | `unit/utils` (7) | dates, prix, chevauchement, e-mail, protection HTML, raccourcis SQL |
| P1 | `e2e/socle` (6) | démarrage, 4 onglets, adresse directe et inconnue, aucun défilement horizontal à 390 / 768 / 1280 px, **CSP stricte présente**, aucun script ni attribut `on…=` en ligne, aucune erreur |
| P2 | `unit/core` (5) | modules enregistrés, tables et données de démo, clés étrangères, **sauvegarde et relecture IndexedDB**, réinitialisation |
| P3 | `unit/vehicules` (6) | catalogue, contraintes, tri des catégories, filtres, API Commons, lecture des auteurs et licences, aucune photo sans crédit, dessin de secours |
| P4 | `e2e/vehicules` (6) | cartes, photos et crédits (auteur, licence, 2 liens), filtres, détails, bouton Réserver, dessins sans Internet |
| P5 | `unit/auth` (5), `unit/utilisateurs` (3) | Web Crypto disponible, PBKDF2 et sel aléatoire, temps constant, politique de mot de passe, blocage 5 échecs / 30 s, comptes de démo, e-mail unique, mot de passe en clair refusé par la base, rôle client imposé, message générique |
| P6 | `e2e/connexion` (8) | inscription (erreurs, doublon, succès), session conservée, déconnexion, message générique, blocage, administrateur, **nom piégé affiché comme du texte**, réinitialisation |
| P7 | `unit/reservations` (7), `e2e/reservation` (8) | prix depuis la base, dates, chevauchement entre comptes, contraintes SQLite, droits client / admin, persistance, connexion demandée puis retour avec la sélection |
| P8 | `e2e/contact` (5), `e2e/parcours` (5) | contact (contrôles, mailto, message honnête, texte piégé non exécuté) ; parcours complet client + agence, ordinateur puis smartphone |

### 2.3 Ce qui n'a PAS pu être vérifié avant la remise

| Point | Pourquoi | Qui / comment |
|---|---|---|
| Affichage des **vraies** photos et exactitude des crédits | Wikimedia Commons n'était pas accessible depuis l'environnement de préparation. Les tests utilisent des photos simulées | P3 : `outils/verifier-photos.html` avec Internet, puis remplacer toute photo « INTROUVABLE » |
| Exécution de la CI **sur GitHub** | Le dépôt de l'équipe n'existe pas encore. Le script de la CI a été exécuté localement, mais pas sur les machines de GitHub (Docker / Nginx) | P1 : contrôler l'onglet *Actions* après le premier push |
| Fonctionnement avec **Live Server** | Les tests de préparation utilisaient un autre serveur statique. Live Server ajoute un script de rechargement, bloqué par la CSP : ce blocage est attendu et sans effet sur le site | Chaque membre, au premier lancement |
| Navigateurs autres que Chrome, vrai smartphone, vraie messagerie, lecteur d'écran | Tests manuels | P8 : recette ci-dessous |

### 2.4 Rejeu dans le dépôt Git de l'équipe (10/11/2026)

Le mode opératoire a été suivi dans un **dépôt Git local** : `main` et `develop`, une branche `feature/…` par lot, un commit par lot, une fusion *squash* dans `develop` (Pull Request simulée), puis la mise à jour du pilotage. Avant chaque fusion, la page `tests/?auto=1` a été ouverte dans Google Chrome 157 sans fenêtre, comme dans la CI. Le serveur était `python -m http.server` sur le port 8765, parce que le port 8080 était déjà pris sur le poste.

| Ordre | Branche | Tests réussis | Fichiers modifiés |
|---|---|---|---|
| 0 | `main` / `develop` (socle) | 13 / 13 ✅ | socle complet |
| 1 | `feature/p2-base-de-donnees` | 18 / 18 ✅ | uniquement ceux de P2 |
| 2 | `feature/p5-comptes-securite` | 26 / 26 ✅ | uniquement ceux de P5 |
| 3 | `feature/p8-contact` | 31 / 31 ✅ | uniquement ceux de P8 |
| 4 | `feature/p3-vehicules-donnees` | 37 / 37 ✅ | uniquement ceux de P3 |
| 5 | `feature/p4-onglet-vehicules` | 43 / 43 ✅ | uniquement ceux de P4 |
| 6 | `feature/p6-onglet-connexion` | 51 / 51 ✅ | uniquement ceux de P6 |
| 7 | `feature/p7-reservations` | 66 / 66 ✅ | uniquement ceux de P7 |
| 8 | `feature/p8-integration` | 71 / 71 ✅ | uniquement ceux de P8 |

Toujours **non vérifié** : la CI sur les machines de GitHub, les protections de branches et GitHub Pages (le dépôt n'est pas encore sur GitHub), les vraies photos et la recette manuelle ci-dessous.

## 3. Recette manuelle — à compléter par l'équipe

| ID | Vérification | Comment faire | Testeur | Date | Résultat |
|---|---|---|---|---|---|
| M01 | Firefox, Edge, Safari | Page `tests/` dans chaque navigateur, puis parcours : catalogue → réservation → connexion → annulation | | | ⏳ À faire |
| M02 | Vrai smartphone | Ouvrir le site publié sur GitHub Pages (https) | | | ⏳ À faire |
| M03 | Vraies photos et crédits | Avec Internet : photos visibles, crédits cliquables ; `outils/verifier-photos.html` à 11/11 | | | ⏳ À faire |
| M04 | Messagerie réelle | Formulaire Contact → brouillon dans Outlook / Mail / Gmail | | | ⏳ À faire |
| M05 | Navigation privée | Bandeau « sauvegarde locale indisponible » si IndexedDB est bloqué | | | ⏳ À faire |
| M06 | Clavier et lecteur d'écran | Tab / Entrée / Échap, puis NVDA ou VoiceOver | | | ⏳ À faire |
| M07 | Console sans erreur | `F12` → Console sur chaque onglet : aucune erreur, aucune violation CSP (hors script Live Server) | | | ⏳ À faire |

## 4. Anomalies détectées et corrections

| ID | Lot | Anomalie | Origine | Correction | Statut |
|---|---|---|---|---|---|
| A01 | P1 | Lors de la préparation du kit, les fichiers de test étaient remplacés par des fichiers vides dans le dépôt initial | Script de construction du kit | Les tests arrivent **avec** leur lot | ✅ Corrigé |
| A02 | P4 | Images des cartes rognées sur les côtés | L'attribut HTML `height` l'emportait sur `aspect-ratio` | `height: auto` dans `css/vehicules.css` | ✅ Corrigé |
| A03 | P1 | Les barres du tableau de pilotage utilisaient des attributs `style="…"`, interdits par la CSP stricte | Script et styles écrits directement dans la page | Script et styles déplacés dans `pilotage/pilotage.js` et `pilotage.css`, largeurs appliquées en JavaScript | ✅ Corrigé |
| A04 | P1 | Dans la page de tests, les titres de suites étaient numérotés comme des tests | Liste numérotée (`<ol>`) | Liste simple (`<ul>`) | ✅ Corrigé |
| | | *à compléter par l'équipe* | | | |
