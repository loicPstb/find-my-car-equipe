# PILOTAGE — FIND MY CAR

> Responsable de ce fichier : **P8** (mise à jour à chaque fin de vague). Le suivi détaillé, tâche par tâche, est dans le **tableau de bord** `pilotage/` (ouvrir `http://localhost:8080/pilotage/` avec le serveur lancé). Il regroupe automatiquement les fichiers `pilotage/taches/P1.json` … `P8.json`, que chaque membre met à jour dans sa propre Pull Request.

## Règles

- Une tâche passe à `termine` quand sa Pull Request est **fusionnée** dans `develop`.
- Un test passe à `reussi` uniquement s'il a été **réellement exécuté** (date obligatoire).
- Le tableau de bord **plafonne l'avancement à 99 %** tant qu'un test n'est pas réussi ou qu'une anomalie reste ouverte.

## Avancement par vague

| Vague | Lots | Fusionné dans `develop` | CI verte | Date |
|---|---|---|---|---|
| 0 | P1 socle | ☑ | ☑ local (13/13) | 10/11/2026 |
| 1 | P2 base de données · P5 comptes · P8 contact | ☑ | ☑ local (31/31) | 10/11/2026 |
| 2 | P3 véhicules et photos | ☑ | ☑ local (37/37) | 10/11/2026 |
| 3 | P4 onglet Véhicules · P6 onglet Connexion | ☑ | ☑ local (51/51) | 10/11/2026 |
| 4 | P7 réservations | ☑ | ☑ local (66/66) | 10/11/2026 |
| 5 | P8 parcours complet · P1 version 1.0.0 | ☑ (recette manuelle à faire) | ☑ local (71/71) | 10/11/2026 |

> « CI verte local » : même page de tests et même lecture du titre que la CI, exécutées dans Chrome sur le poste. La CI **sur GitHub** reste à constater après le premier push (P1).

## Points d'attention

- **Écart à la consigne** : 4 fonctionnalités au lieu de 3 (Connexion). Validation du formateur à obtenir (tâche P1).
- **Photos** : page `outils/verifier-photos.html` à ouvrir par P3 avec Internet ; remplacer toute photo introuvable.
- **Recette manuelle** : Firefox, Edge, Safari, smartphone (via GitHub Pages en https), messagerie réelle, clavier (P8).

## Anomalies ouvertes

| Lot | Anomalie | Responsable | Statut |
|---|---|---|---|
| | *aucune pour l'instant* | | |

## Prochaines étapes

1. P1 : créer le dépôt GitHub, pousser `main`, `develop` et le tag `v1.0.0`, inviter les membres, renseigner `.github/CODEOWNERS`, protéger les branches, puis constater la CI verte dans *Actions*.
2. P1 : activer GitHub Pages (`main` / racine) et publier la release v1.0.0.
3. P3 : `outils/verifier-photos.html` avec Internet, mettre à jour `img/CREDITS-PHOTOS.md` (M03).
4. P2 : contrôle manuel *F12 → Application → IndexedDB → findmycar*.
5. P8 : recette manuelle M01 à M07 (`tests/RAPPORT-TESTS.md`, §3).
