# Progression familiale et chalet des clés — Implementation Plan

**Goal:** Partager les clés entre les quatre profils et permettre de les déposer dans un coffre situé à l'intérieur du chalet central.

**Architecture:** `ChristmasServer` stocke une progression familiale commune et migre les anciennes progressions par compte. Le village ouvre une scène Phaser séparée pour l'intérieur; celle-ci conserve les commandes actuelles et réutilise le dialogue de dépôt.

**Tech Stack:** TypeScript, React, Phaser 3, Canvas 2D, localStorage.

**Spec:** [progression-familiale-chalet-design.md](../specs/2026-10-24-progression-familiale-chalet-design.md)

## Constraints

- Les mini-jeux restent associés à leur profil d'origine.
- Les quatre clés gagnées/déposées sont partagées par les profils du prototype.
- Le dépôt exige toujours une clé gagnée; les quatre dépôts débloquent les listes.
- Le chalet et sa pièce restent en pixel art procédural; aucune photo n'est ajoutée.

## Tasks

- [x] Mettre à jour `src/data/server.ts` pour migrer les états utilisateur existants en progression familiale et faire lire/écrire cette progression pour tous les comptes. Mettre à jour l'administration pour afficher un seul état familial.
- [x] Mettre à jour `src/ui/VillageUI.tsx` et `src/styles.css` pour séparer le compteur de clés acquises du compteur de dépôts.
- [x] Déplacer le chalet au centre du village, remplacer son ancien coffre extérieur par une entrée interactive, créer la scène intérieure procédurale et connecter ses événements au serveur et à l'interface.
- [x] Mettre à jour le README et produire un build prêt à être remis dans une archive.

## Review focus

- Une ancienne clé gagnée dans un profil reste visible après migration.
- Une victoire dans chaque profil apparaît pour les autres profils.
- Une clé non gagnée reste impossible à déposer.
- La porte permet d'entrer et de ressortir; le coffre n'est interactif qu'à l'intérieur.
- Le compte d'acquisitions reste distinct du compte de dépôts.
