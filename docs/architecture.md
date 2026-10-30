# Architecture — Christmas Quest

## 1. Couches et sens des dépendances

```text
        ┌────────────────────────────────────────────────────────┐
        │  ui/            React : connexion, HUD, listes, admin   │
        └───────────────┬───────────────────────────┬────────────┘
                        │                           │
             (DTO filtrés)│                          │ événements
                        ▼                           ▼
        ┌───────────────────────────┐   ┌──────────────────────────┐
        │ data/                     │   │ game/                    │
        │  types.ts   contrats DTO  │   │  bus.ts  VillageScene    │
        │  api/contract.ts          │   │  controller.ts           │
        │  server.ts  (autoritaire) │   │  fx/effects.ts           │
        │  mock/seed.ts             │   │  village/*               │
        │  mock/visibility.ts  ←────┼───┼── règles pures testables │
        └───────────────┬───────────┘   └────────────┬─────────────┘
                        │                            │
                        └────────────┬───────────────┘
                                     ▼
                     ┌───────────────────────────────┐
                     │ mascots/  (designs + renderer)│
                     │ minigames/ (socle + 4 jeux)   │
                     │ audio/audio.ts (WebAudio)     │
                     └───────────────────────────────┘
```

Règles de dépendance :

* `mascots/*` ne dépend de **rien** du projet, sauf `types.ts` : aucun import de React, de Phaser
  (hors `renderer.ts`), de données ou de mini-jeu. Un fichier de design est donc remplaçable seul.
* `minigames/*` dépend de `mascots/` (pour les personnages), `game/bus.ts`, `game/fx/effects.ts`,
  `audio/`. **Jamais** de `data/` : un mini-jeu ne décide ni d'une clé, ni d'un droit.
* `game/*` ne dépend pas de `ui/`. La communication passe uniquement par `bus.ts`.
* `ui/*` ne lit jamais `data/server.ts` directement pour décider d'un affichage sensible : elle
  consomme les DTO déjà filtrés (`GiftOwnerBlind` / `GiftOwnerRevealed` / `GiftSeenByOthers`).
* `data/mock/visibility.ts` est **pur** (aucune I/O, aucune horloge système) : il est testé
  directement par `tests/visibility.mjs`.

## 2. Socle commun des mini-jeux

`minigames/common/MinigameScene.ts` implémente ce que le §8 impose à chaque jeu :

| Élément | Fourni par le socle |
|---|---|
| Tutoriel personnalisé | `showIntro()` + `meta().rules` |
| Pause (`Échap`) | `togglePause()` |
| Écran de résultat | `finish(won)` avec confettis / secousse |
| Boutons Rejouer / Quitter | inclus dans les deux overlays |
| Sons et effets de Noël | `audio.play('win'/'lose')`, `confetti()`, `flash()` |

Chaque jeu ne définit plus que 5 membres :

```ts
meta()                 // textes, accent, règles, victoire/défaite
onIntroAccepted()      // démarrage de la partie
summaryLines()         // récapitulatif de fin
resultDetail()         // détail envoyé au serveur (jamais la clé)
setSimulationRunning() // pause/reprise de la boucle de jeu
```

Gain : ~90 lignes supprimées par jeu, comportements identiques garantis, et une seule correction
à faire pour toute évolution des overlays.

## 3. Effets et audio

* `game/fx/effects.ts` : textures générées (`fx-spark`, `fx-dot`, `fx-flake`, `fx-confetti`,
  `fx-soft`), puis `burst()`, `confetti()`, `floatText()`, `flash()`, `shake()`, `softGlow()`,
  `twinkle()`, `pulseScale()`, `snowLayers()`. Tous les émetteurs se détruisent seuls.
* `audio/audio.ts` : synthèse WebAudio complète (cloches, percussions filtrées, bruit blanc pour
  les impacts) et boucle musicale pentatonique. Zéro fichier audio → zéro question de droits.
  Coupure automatique quand l'onglet est masqué, préférences persistées, interruption à la demande.
* `ui/Snowfall.tsx` et `ui/Confetti.tsx` : les mêmes intentions côté DOM, en CSS pur, avec respect
  de `prefers-reduced-motion`.

## 4. Couche données

```text
data/
  types.ts               contrats exposés à l'UI + unions de vues
  api/contract.ts        interface ChristmasApi (frontière)
  api/index.ts           bascule mock → Supabase
  server.ts              service « serveur » : sessions, progression, réservations
  mock/seed.ts           jeu de démonstration + types de persistance
  mock/visibility.ts     règles pures : révélation, projection des cadeaux, titres
```

`server.ts` ne contient plus aucune règle de visibilité : il rassemble les données, puis délègue à
`visibility.ts`. Le pendant SQL est `list_gifts()` dans `docs/schema.sql` : la même décision, au même
endroit logique, des deux côtés.

## 5. Contrôles de qualité

| Commande | Contenu |
|---|---|
| `npm run typecheck` | TypeScript strict, zéro `any` implicite |
| `npm run test:unit` | 17 tests des règles de visibilité (Node, sans navigateur) |
| `npm run test:acceptance` | 24 vérifications bout en bout du cahier des charges |
| `npm run test:gameplay` | partie réelle de match-3 → clé rose → dépôt |
| `npm run test:visual` | parcours complet + captures dans `shots/` (0 erreur console) |
