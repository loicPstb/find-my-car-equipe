# PILOTAGE — FIND MY CAR

> Responsable de ce fichier : **P8** (mise à jour à chaque fin de vague). Le suivi détaillé, tâche par tâche, est dans le **tableau de bord** `pilotage/` (ouvrir `http://localhost:8080/pilotage/` avec le serveur lancé). Il regroupe automatiquement les fichiers `pilotage/taches/P1.json` … `P8.json`, que chaque membre met à jour dans sa propre Pull Request.

## Règles

- Une tâche passe à `termine` quand sa Pull Request est **fusionnée** dans `develop`.
- Un test passe à `reussi` uniquement s'il a été **réellement exécuté** (date obligatoire).
- Le tableau de bord **plafonne l'avancement à 99 %** tant qu'un test n'est pas réussi ou qu'une anomalie reste ouverte.

## Avancement par vague

| Vague | Lots | Fusionné dans `develop` | CI verte | Date |
|---|---|---|---|---|
| 0 | P1 socle | ☐ | ☐ | |
| 1 | P2 base de données · P5 comptes · P8 contact | ☐ | ☐ | |
| 2 | P3 véhicules et photos | ☐ | ☐ | |
| 3 | P4 onglet Véhicules · P6 onglet Connexion | ☐ | ☐ | |
| 4 | P7 réservations | ☐ | ☐ | |
| 5 | P8 parcours complet et recette · P1 version 1.0.0 | ☐ | ☐ | |

## Points d'attention

- **Écart à la consigne** : 4 fonctionnalités au lieu de 3 (Connexion). Validation du formateur à obtenir (tâche P1).
- **Photos** : page `outils/verifier-photos.html` à ouvrir par P3 avec Internet ; remplacer toute photo introuvable.
- **Recette manuelle** : Firefox, Edge, Safari, smartphone (via GitHub Pages en https), messagerie réelle, clavier (P8).

## Anomalies ouvertes

| Lot | Anomalie | Responsable | Statut |
|---|---|---|---|
| | *aucune pour l'instant* | | |

## Prochaines étapes

1. P1 : créer le dépôt, pousser le socle, protéger `main` et `develop`.
2. Vague 1 : P2, P5 et P8 ouvrent leur Pull Request.
3. P8 : mettre à jour ce fichier à la fin de chaque vague.
