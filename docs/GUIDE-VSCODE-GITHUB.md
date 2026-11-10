# Guide pas à pas — VS Code, Git et GitHub pour FIND MY CAR

> Ce guide explique les **gestes de base**. L'organisation de l'équipe (qui fait quoi, dans quel ordre) est dans [MODE-OPERATOIRE.md](MODE-OPERATOIRE.md).
>
> **Quel terminal ?** Le terminal intégré de VS Code (**Terminal → Nouveau terminal**), à la racine du dossier du projet. Sous Windows, c'est **PowerShell** ; sous macOS et Linux, **bash/zsh**.

---

## 1. Installer les outils (une fois par ordinateur)

| Outil | Lien | Vérification |
|---|---|---|
| Git | https://git-scm.com/downloads | `git --version` dans le terminal |
| VS Code | https://code.visualstudio.com | — |
| Un navigateur récent | Chrome, Edge ou Firefox | — |
| Compte GitHub | https://github.com | — |

**Rien d'autre** : pas de Node.js, pas de npm, pas de Python.

Après installation, **fermer puis rouvrir VS Code**. Ensuite :

```bash
git config --global user.name "Prénom Nom"
git config --global user.email "identifiant@users.noreply.github.com"   # adresse masquée GitHub
```

## 2. Extensions VS Code du projet

À l'ouverture du dossier, VS Code propose d'installer les extensions recommandées : cliquez sur **Installer tout**.

- **GitHub Pull Requests** : connexion à GitHub, issues, création et relecture des Pull Requests dans VS Code.
- **GitLens** : historique et auteur de chaque ligne (*clic droit → Open Blame*).
- **GitHub Actions** : résultat des tests automatiques (CI) de chaque branche.
- **Live Server** (indispensable) : petit serveur web intégré à VS Code pour ouvrir le site et la page de tests.
- **Prettier** : mise en forme du code (`Maj + Alt + F`).

Connexion : icône **Comptes** en bas à gauche → *Se connecter avec GitHub* → autoriser VS Code dans le navigateur.

## 3. Récupérer le projet

```bash
cd ~/Documents                    # Windows : cd $HOME\Documents
git clone https://github.com/<compte>/find-my-car.git
cd find-my-car
git checkout develop
code .                            # ouvre le dossier dans VS Code
```

*Sans terminal* : VS Code → `Ctrl + Maj + P` → **Git: Clone** → coller l'adresse du dépôt.

## 4. Lancer le site

> ❌ Ne pas double-cliquer sur `index.html` : en `file://`, le navigateur bloque SQLite et le chargement des onglets. Un message d'aide s'affiche dans ce cas.

Clic droit sur `index.html` → **Open with Live Server** (ou bouton **Go Live** en bas à droite). Le navigateur s'ouvre sur :
- le site : **http://127.0.0.1:5500/** ;
- la page de tests : **http://127.0.0.1:5500/tests/** ;
- le tableau de pilotage : **http://127.0.0.1:5500/pilotage/**.

Arrêt : bouton **Port : 5500** en bas à droite. Après une modification, rechargez la page (`F5`) : la politique de sécurité du site bloque le rechargement automatique de Live Server, et c'est voulu.

Comptes de démonstration (fictifs) : `client@findmycar.example.com` / `ClientDemo2026!` et `admin@findmycar.example.com` / `AdminDemo2026!`.

## 5. Lancer les tests

Ouvrir **http://127.0.0.1:5500/tests/** → **Lancer tous les tests**.
- **Tests unitaires** d'abord : règles de calcul, base SQLite, sécurité des mots de passe.
- **Tests de l'application** ensuite : le site s'ouvre dans le cadre en bas de la page, et les clics et la saisie y sont simulés.
- Le résultat s'affiche en haut : « ✅ Tous les tests sont réussis : 71 / 71 ».
- ⚠️ Les tests effacent les comptes et réservations de démonstration de ce navigateur.

## 6. Git au quotidien : terminal et équivalent VS Code

| Action | Terminal | VS Code |
|---|---|---|
| Récupérer les nouveautés | `git checkout develop` puis `git pull origin develop` | Barre du bas : branche `develop` → icône 🔄 *Synchroniser* |
| Créer sa branche | `git checkout -b feature/p4-onglet-vehicules` | Clic sur le nom de branche (en bas à gauche) → *Créer une branche à partir de…* |
| Voir ses changements | `git status` puis `git diff` | Vue **Contrôle de code source** (`Ctrl + Maj + G`) |
| Préparer des fichiers | `git add <fichier>` | **+** à côté du fichier |
| Enregistrer (commit) | `git commit -m "feat(vehicules): …"` | Message, puis **Valider** |
| Publier | `git push -u origin <branche>` | **Publier la branche** / **Synchroniser** |
| Ouvrir une Pull Request | sur github.com : **Compare & pull request** | Vue **GitHub** → **Create Pull Request** |
| Relire une Pull Request | `git fetch origin` puis `git checkout <branche>` | Vue **GitHub Pull Requests** → *Checkout*, commentaires dans la marge, **Approve** |
| Voir la CI | onglet *Actions* sur github.com | Vue **GitHub Actions** |
| Mettre de côté un travail | `git stash` / `git stash pop` | `…` → *Stash* |

## 7. Vérifier la base SQLite dans le navigateur

`F12` → onglet **Application** (Chrome/Edge) ou **Stockage** (Firefox) → **IndexedDB** → `findmycar`.
Dans la **Console** : `DB.modules()`, `VehiculesRepo.getVehicles({})`, `Account.currentUser()`.

## 8. Erreurs fréquentes

| Symptôme | Solution |
|---|---|
| Bandeau « Impossible de démarrer » + mention `file://` | Lancer avec Live Server |
| `Utils is not defined` | L'ordre des `<script>` de `index.html` a été modifié : remettre la version du dépôt |
| Les anciennes versions des fichiers s'affichent | `Ctrl + F5` |
| Le port 5500 est occupé | VS Code → Paramètres → *Live Server › Settings: Port* → 5501 |
| Message *Content Security Policy* (script de Live Server) dans la console | Normal : rechargez à la main (`F5`) |
| Mot de passe d'un compte de test oublié | Bouton « Réinitialiser les données de démonstration » (pied de page) |
| Plus de cas | [MODE-OPERATOIRE.md §14](MODE-OPERATOIRE.md#14-dépannage) |
