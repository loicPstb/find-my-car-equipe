# Sécurité — FIND MY CAR

> Ce document recense les **mesures de sécurité** de l'application, ce qu'elles protègent et leurs **limites**. Il sert aussi de support pour la soutenance.
> Architecture rappelée : site **statique** (HTML, CSS, JavaScript exécuté dans le navigateur), **sans back-end**, **sans Node.js ni npm**, base SQLite dans le navigateur (sql.js) sauvegardée dans IndexedDB.

---

## 1. Surface d'attaque réduite

| Choix | Effet sur la sécurité |
|---|---|
| **Aucun serveur applicatif** (pas d'API, pas de base distante) | Pas d'injection SQL à distance, pas de fuite de base centrale, pas de serveur à pirater |
| **Aucune dépendance npm** | Pas de risque de « chaîne d'approvisionnement » (paquet piégé). La seule bibliothèque, **sql.js**, est copiée dans `lib/` avec sa licence |
| **Aucune ressource externe obligatoire** (pas de CDN, pas de police en ligne) | Rien ne peut être modifié par un tiers. Seule exception, facultative : les photos et crédits Wikimedia Commons |
| **Données 100 % fictives** dans le dépôt | Aucune donnée personnelle publiée sur GitHub (`.gitignore` bloque aussi `.env`, `*.sqlite`, clés) |

## 2. Politique de sécurité du contenu (CSP)

Chaque page déclare une **Content Security Policy** stricte (balise `<meta http-equiv="Content-Security-Policy">`).

Pour l'application (`index.html`) :

```
default-src 'self';
script-src  'self' 'wasm-unsafe-eval';
style-src   'self';
img-src     'self' data: https://upload.wikimedia.org;
connect-src 'self' https://commons.wikimedia.org;
font-src    'self'; object-src 'none'; base-uri 'none'; form-action 'self'; frame-src 'none'
```

| Directive | Ce qu'elle empêche |
|---|---|
| `script-src 'self'` (sans `'unsafe-inline'` ni `'unsafe-eval'`) | Un script injecté dans la page (attaque **XSS**) ne peut pas s'exécuter : seuls nos fichiers `.js` sont autorisés. Le projet ne contient **aucun** script en ligne ni attribut `onclick=` (vérifié par un test du socle) |
| `'wasm-unsafe-eval'` | Autorise **uniquement** la compilation de SQLite (WebAssembly), pas l'`eval` JavaScript |
| `style-src 'self'` | Pas de CSS injecté (le pilotage applique ses largeurs de barres en JavaScript, sans attribut `style`) |
| `img-src` / `connect-src` | Les seuls sites tiers joignables sont Wikimedia (photos et crédits). Une donnée volée ne peut pas être envoyée ailleurs |
| `object-src 'none'`, `base-uri 'none'`, `frame-src 'none'` | Pas de plugin, pas de détournement des liens relatifs, pas de cadre externe |
| `form-action 'self'` | Un formulaire ne peut pas être envoyé vers un autre site |

Autres en-têtes : `<meta name="referrer" content="strict-origin-when-cross-origin">` (l'adresse complète de la page n'est pas transmise aux autres sites) ; liens externes en `target="_blank" rel="noopener"`.

## 3. Protection contre l'injection (XSS)

- Tout texte venant d'un utilisateur (nom, e-mail, message) passe par `Utils.escapeHTML` avant d'être affiché. Les tests vérifient qu'un nom comme `<img src=x onerror=alert(1)>` s'affiche **comme du texte**.
- La CSP ci-dessus bloque de toute façon l'exécution d'un script injecté (défense en profondeur).

## 4. Base de données

- **Requêtes paramétrées** partout (`?` + tableau de valeurs) : pas d'injection SQL.
- **Contraintes SQLite** : `CHECK` (dates, prix, rôles, longueur de l'empreinte), `UNIQUE` (e-mail), **clés étrangères** activées (`PRAGMA foreign_keys = ON`).
- Le **prix est toujours recalculé** à partir de la base : un prix modifié dans le formulaire est ignoré.

## 5. Comptes et mots de passe

| Mesure | Détail |
|---|---|
| Hachage | PBKDF2-SHA256, **600 000 itérations** (recommandation OWASP), sel aléatoire de 16 octets par compte. Le mot de passe en clair n'est **jamais** stocké (une contrainte SQL refuse toute « empreinte » qui n'a pas 64 caractères hexadécimaux) |
| Vérification | Comparaison en **temps constant** |
| Énumération des comptes | Message identique (« E-mail ou mot de passe incorrect ») que le compte existe ou non, et durée de calcul identique |
| Force brute | Blocage de **30 s après 5 échecs** pour un même e-mail |
| Politique | 8 caractères minimum, au moins une lettre et un chiffre |
| Rôles | L'inscription crée **toujours** un client ; seul le compte de démo est administrateur. Les droits sont vérifiés à chaque annulation |
| Session | `sessionStorage` : la session se termine à la fermeture de l'onglet |

## 6. Limites — à présenter honnêtement

| Limite | Pourquoi | Ce qu'il faudrait pour la lever |
|---|---|---|
| La connexion n'est **pas une barrière** face à quelqu'un qui contrôle le navigateur | Sans serveur, la base et la session sont dans le navigateur : avec les outils de développement (F12), on peut les modifier et se donner le rôle admin | Un serveur qui vérifie l'identité à chaque requête (jetons de session côté serveur) |
| Le blocage après 5 échecs disparaît au rechargement | Il est gardé en mémoire | Un compteur côté serveur |
| Comptes et réservations **locaux** | IndexedDB appartient à un navigateur | Une base partagée côté serveur |
| `frame-ancestors` (protection contre l'intégration malveillante de la page dans un autre site) | Cette directive n'est pas prise en compte dans une balise `<meta>` | En-tête HTTP du serveur d'hébergement |
| Comptes de démonstration publics | Mots de passe documentés pour la démo | Les supprimer en production |
| La connexion exige un **contexte sécurisé** | Web Crypto n'existe qu'en https, sur `localhost` ou `127.0.0.1` | Héberger en https (GitHub Pages le fait) |

## 7. Vérifications automatiques

La page `tests/` (et la CI GitHub à chaque Pull Request) vérifie notamment :
- la présence de la CSP, l'absence de `'unsafe-inline'` et de tout script en ligne ;
- le hachage, le sel aléatoire, le temps constant, le blocage, le message générique ;
- le refus d'un mot de passe en clair et d'un rôle inconnu par la base ;
- l'affichage en texte d'un nom piégé (pas d'exécution de HTML) ;
- les droits client / administrateur.
