# CADRAGE — FIND MY CAR

> Document de cadrage du projet pédagogique « FIND MY CAR », application web de location de véhicules.
> Version 2.0 — novembre 2026. Projet réalisé par une **équipe de 8 personnes** sur GitHub (organisation : `docs/MODE-OPERATOIRE.md`).

---

## 1. Objectif de l'application

### Le problème

Louer un véhicule demande souvent de jongler entre plusieurs informations : quels véhicules sont proposés, à quel prix, sont-ils libres aux dates voulues, combien va coûter la location ? Sans outil clair, le client doit appeler l'agence, attendre une réponse et risque de réserver un véhicule déjà pris.

### La solution FIND MY CAR

FIND MY CAR est une application web simple qui permet de :

- **voir en un coup d'œil** le catalogue des véhicules (vraie photo, marque, modèle, catégorie, prix par jour) ;
- **réserver en autonomie** un véhicule sur une période donnée ;
- **connaître immédiatement le prix total**, calculé automatiquement ;
- **éviter les doubles réservations** grâce à un contrôle de disponibilité ;
- **retrouver ses réservations** grâce à un compte personnel ;
- **contacter l'agence** facilement en cas de question.

### Bénéfices

| Pour le client | Pour l'agence (vision cible) |
|---|---|
| Gain de temps : tout se fait en ligne, sans appel | Moins d'appels pour des questions simples |
| Transparence du prix avant de confirmer | Aucune erreur de calcul manuel |
| Assurance que le véhicule est libre | Pas de double réservation |
| Possibilité d'annuler soi-même | Données structurées (base SQLite) |
| Réservations rattachées à son compte | Vue administrateur de toutes les réservations |

---

## 2. Utilisateurs et rôles

Le MVP distingue **trois rôles** : le visiteur (non connecté), le client (connecté) et l'administrateur.

| Rôle | Exemples d'utilisateurs | Besoins | Ce qu'il peut faire dans le MVP |
|---|---|---|---|
| **Visiteur** (non connecté) | Particulier qui compare, prospect qui hésite | Trouver un véhicule adapté, connaître le prix, poser une question | Parcourir et filtrer le catalogue, voir les détails, **simuler** le prix d'une location, contacter l'agence, créer un compte |
| **Client** (compte connecté) | Particulier (loisirs, vacances), professionnel (déplacement, utilitaire) | Réserver vite et suivre ses locations | Tout ce que fait le visiteur + **réserver**, voir **ses** réservations, annuler **ses** réservations, se déconnecter |
| **Administrateur** (compte de démonstration) | Agent de l'agence | Superviser les réservations | Voir **toutes** les réservations (avec nom et e-mail du client) et annuler n'importe laquelle |
| **Équipe projet** (rôle technique, hors application) | Membres du projet | Tester et démontrer | Réinitialiser les données de démonstration (bouton en pied de page) |

Un compte créé par inscription est **toujours** un compte client ; le rôle administrateur n'est attribué qu'au compte de démonstration prévu à cet effet.

---

## 3. Fonctionnalités

> ⚠️ **Écart assumé à la consigne.** La consigne prévoit **trois fonctionnalités maximum**. À la demande de l'équipe, une quatrième — **Connexion** — a été ajoutée, car rattacher chaque réservation à un client et donner une vue à l'agence rend la démonstration plus réaliste. Cet écart est **à valider avec le formateur**. Si la règle des trois fonctionnalités doit être respectée strictement, l'onglet Connexion peut être retiré (lots P5 et P6) ou remplacer l'onglet « Nous contacter ».

### Fonctionnalité 1 — Véhicules (catalogue)

- Page d'accueil avec présentation de FIND MY CAR.
- Catalogue de 11 véhicules fictifs stockés dans SQLite.
- Cartes véhicules : **photo réelle sous licence libre** (Wikimedia Commons) avec son crédit, marque, modèle, catégorie, prix par jour. Sans connexion Internet, un dessin générique la remplace.
- Filtres par **catégorie** et par **gamme de prix**.
- Fenêtre de **détails** (places, boîte de vitesses, carburant, description).
- Bouton **« Réserver »** qui ouvre l'onglet Réservation avec le véhicule déjà sélectionné.

### Fonctionnalité 2 — Réservation

- Sélection du véhicule et des dates de début et de fin ; le titulaire est le **compte connecté** (sans compte, on peut simuler le prix, puis on est redirigé vers l'onglet Connexion en gardant sa sélection).
- Calcul automatique du nombre de jours et du montant total (champ non modifiable).
- Contrôles :
  - date de début ≥ aujourd'hui ;
  - date de fin > date de début ;
  - pas de chevauchement avec une réservation **active** du même véhicule.
- Enregistrement dans **SQLite** (via sql.js), puis sauvegarde dans **IndexedDB** du navigateur.
- Liste « Mes réservations » (relue depuis SQLite) avec bouton **Annuler** ; l'administrateur voit et peut annuler toutes les réservations.

### Fonctionnalité 3 — Nous contacter

- Présentation rapide de l'entreprise et coordonnées fictives (modifiables dans un seul fichier : `js/contact.js`).
- Formulaire : nom, e-mail, objet, message.
- Contrôle des champs obligatoires et du format de l'e-mail.
- Bouton qui **prépare** le message dans le logiciel de messagerie de l'utilisateur (`mailto:`). L'application n'affirme jamais que le message a été envoyé.

### Fonctionnalité 4 — Connexion (ajoutée, voir l'avertissement ci-dessus)

- **Inscription** : nom, e-mail (unique), mot de passe (8 caractères minimum, au moins une lettre et un chiffre) et confirmation.
- **Connexion / déconnexion**, session conservée tant que l'onglet du navigateur reste ouvert.
- **Mon compte** : nom, e-mail, rôle, nombre de réservations actives.
- **Sécurité mise en œuvre** (dans la limite d'une application sans serveur) :
  - mots de passe **hachés** avec PBKDF2-SHA256, sel aléatoire, 600 000 itérations (jamais stockés en clair) ;
  - comparaison en temps constant ;
  - message d'erreur identique que l'e-mail existe ou non (pas de révélation des comptes existants) ;
  - blocage de 30 secondes après 5 échecs de connexion pour un même e-mail ;
  - droits vérifiés à chaque annulation (un client ne peut annuler que ses réservations).
- Deux comptes de **démonstration** fictifs : un client et un administrateur.

---

## 4. Ce que nous ne réalisons pas aujourd'hui et pourquoi

| Fonctionnalité exclue | Pourquoi elle est exclue du MVP |
|---|---|
| **Paiement en ligne** | Nécessite un prestataire (Stripe, banque), un serveur sécurisé et une conformité PCI-DSS. Impossible sans back-end, et hors du temps imparti. |
| **Authentification réellement sécurisée** (côté serveur) | Notre connexion est une **démonstration** : tout s'exécute dans le navigateur, donc une personne qui ouvre les outils de développement peut modifier la base ou la session (et se faire passer pour l'administrateur). Une vraie protection exige un serveur qui vérifie l'identité à chaque requête. |
| **Mot de passe oublié, vérification de l'e-mail, double authentification** | Nécessitent l'envoi d'e-mails ou de SMS, donc un serveur. |
| **Gestion de flotte par l'administrateur** (ajout, modification, suppression de véhicules) | Hors du temps imparti ; le rôle administrateur se limite à la supervision des réservations. Le catalogue est fixé dans le code d'initialisation de la base. |
| **Synchronisation entre plusieurs utilisateurs ou appareils** | La base SQLite vit **dans le navigateur de chaque utilisateur**. Un compte créé sur un ordinateur n'existe pas sur un autre, et deux personnes sur deux appareils ne voient pas les réservations l'une de l'autre. Une base partagée exigerait un serveur (contrainte « aucun back-end »). |
| **Envoi réel d'e-mails** (confirmation de réservation, formulaire de contact) | Nécessite un serveur SMTP ou un service tiers. On utilise `mailto:`, qui ouvre la messagerie de l'utilisateur. |
| **Photos hébergées par l'agence** | Les photos viennent de Wikimedia Commons (licences libres, crédits obligatoires et affichés). Utiliser les photos officielles des constructeurs exigerait leur autorisation. |
| **Application mobile native** (Android / iOS) | Demande d'autres langages et outils (Kotlin, Swift, stores). Le site responsive couvre déjà l'usage sur smartphone. |
| **Gestion des horaires, options, assurances, kilométrage** | Complexifie les règles métier et le calcul du prix ; pas indispensable pour démontrer le cœur du service. |
| **Multilingue** | Public cible francophone ; ajout possible plus tard. |

> **Limites majeures à retenir :**
> - les comptes et les réservations sont **locaux** : ils sont conservés dans le navigateur (IndexedDB) de l'appareil utilisé. Vider les données du site, changer de navigateur ou d'ordinateur fait repartir d'une base neuve. Le contrôle de chevauchement ne protège que **sur un même navigateur** (mais entre tous les comptes de ce navigateur) ;
> - la connexion **n'est pas une barrière de sécurité** face à quelqu'un qui contrôle le navigateur : c'est une fonctionnalité de démonstration. Le hachage des mots de passe protège en revanche leur confidentialité si la base est copiée.

---

## 5. Langages et technologies

| Technologie | Utilité dans le projet |
|---|---|
| **HTML5** | Structure des pages : barre de navigation, quatre onglets, cartes, formulaires, fenêtre de détails (`<dialog>`). |
| **CSS3** | Mise en forme moderne et responsive (Flexbox, Grid, media queries), lisible sur ordinateur, tablette et smartphone. |
| **JavaScript** | Navigation entre onglets, affichage dynamique, filtres, calcul du prix, contrôles des dates, gestion des réservations, préparation du `mailto:`. |
| **SQLite** | Moteur de base de données relationnelle. Les tables `vehicles` et `reservations` sont créées avec clés primaires, clé étrangère et contraintes `CHECK`. |
| **sql.js** | SQLite compilé en **WebAssembly** : permet d'exécuter de vraies requêtes SQL dans le navigateur, sans serveur. Fichiers fournis dans `lib/`. |
| **IndexedDB** | Stockage du navigateur où l'on sauvegarde le fichier SQLite (export binaire) après chaque modification, pour le retrouver au rechargement. |
| **Web Crypto API** (PBKDF2-SHA256) | Fonctions cryptographiques intégrées au navigateur, utilisées pour hacher les mots de passe avec un sel aléatoire. Disponible uniquement en contexte sécurisé (https, localhost, 127.0.0.1). |
| **sessionStorage** | Mémorise le compte connecté pendant la durée de l'onglet. |
| **API Wikimedia Commons** | Fournit l'adresse des photos des véhicules **avec leur auteur et leur licence**, affichés en crédit. Facultative : sans Internet, des dessins s'affichent. |
| **Git / GitHub** | Versionnement ; une branche par lot ; Pull Requests relues ; **GitHub Actions** ouvre la page de tests dans Chrome à chaque Pull Request ; **CODEOWNERS** désigne le propriétaire de chaque fichier ; **GitHub Pages** met le site en ligne. |
| **VS Code** | Éditeur ; extension **Live Server** (serveur local pour le site et les tests), plus **GitHub Pull Requests**, **GitLens**, **GitHub Actions**. |
| **Page de tests** `tests/` | Tests unitaires et tests de l'application, exécutés **dans le navigateur** (l'application est pilotée dans un cadre). Aucun outil à installer : ni Node.js, ni npm, ni Python. |
| **Content Security Policy** | Politique de sécurité déclarée dans chaque page : seuls les fichiers du site peuvent s'exécuter (protection contre l'injection de script). Détails : `docs/SECURITE.md`. |

---

## 6. Répartition du travail dans l'équipe (8 personnes)

Le code est découpé en **8 lots**. Chaque lot a **un responsable** et **ses propres fichiers**, ce qui évite les conflits Git. Chaque lot est fusionné par Pull Request, après relecture et tests automatiques. Le site reste fonctionnel à chaque fusion.
Détails, commandes et ordre des fusions : `docs/MODE-OPERATOIRE.md`. Ce que chaque lot fournit aux autres : `docs/CONTRAT-INTERFACES.md`. Avancement : `pilotage/` (un fichier par membre).

| Lot | Responsabilité | Membre | Tâches | Livrables | Vague |
|---|---|---|---|---|---|
| P1 | Chef de projet, intégrateur GitHub | *À compléter* | Dépôt, socle, protections de branches, CI, fusions, version 1.0 | socle, `.github/`, documentation | 0 et 5 |
| P2 | Base de données | *À compléter* | Moteur SQLite (sql.js), sauvegarde IndexedDB | `js/db/core.js` + tests | 1 |
| P3 | Données véhicules et photos | *À compléter* | Table `vehicles`, catalogue, photos sous licence libre, crédits | `js/db/vehicules.repo.js`, `js/photos.js` + tests | 2 |
| P4 | Onglet Véhicules | *À compléter* | Accueil, cartes, filtres, détails, bouton Réserver | `pages/vehicules.html`, `css/`, `js/ui/vehicules.js` + tests | 3 |
| P5 | Comptes et sécurité | *À compléter* | Hachage des mots de passe, table `users`, inscription / connexion | `js/auth.js`, `js/db/utilisateurs.repo.js` + tests | 1 |
| P6 | Onglet Connexion | *À compléter* | Formulaires, session, Mon compte, badge | `pages/connexion.html`, `css/`, `js/ui/connexion.js` + tests | 3 |
| P7 | Réservations | *À compléter* | Table `reservations`, règles métier, onglet Réservation | `js/db/reservations.repo.js`, `js/ui/reservation.js`… + tests | 4 |
| P8 | Contact, qualité, pilotage | *À compléter* | Onglet Contact, test d'intégration, recette manuelle, rapport | `js/ui/contact.js`…, `tests/e2e/parcours.e2e.test.js`, rapports | 1 et 5 |
