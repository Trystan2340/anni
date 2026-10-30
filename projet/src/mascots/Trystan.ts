/**
 * Trystan.ts — mascotte du créateur / présentateur / administrateur.
 * Aucun mini-jeu obligatoire, aucune maison, aucune clé : ce fichier reste du design pur.
 * Comme les quatre autres, il se modifie sans toucher aux autres fichiers.
 */
import type { MascotDesign } from './types';

export const Trystan: MascotDesign = {
  id: 'Trystan',
  displayName: 'Trystan',
  role: 'presentateur',
  scale: 3,
  animation: { walkFrameMs: 200, bobPx: 1 },
  palette: {
    K: '#1f2430',
    S: '#f2c6a0',
    M: '#d29c74',
    R: '#eb9c8c',
    E: '#1f2430',
    G: '#cfe4ff', // lunettes
    H: '#2b2b33',
    h: '#1a1a20',
    C: '#2f7a5f', // manteau vert forêt
    c: '#215845',
    D: '#f2c14e', // fermeture dorée
    A: '#c8384f', // écharpe rouge
    B: '#26303f',
    W: '#ffffff',
  },
  accessories: [
    { name: 'Lunettes', letter: 'G', note: 'accessoire de présentation' },
    { name: 'Écharpe rouge', letter: 'A' },
    { name: 'Fermeture dorée', letter: 'D' },
  ],
  frames: {
    down: [
      '.....KKKKKK.....',
      '....KHHHHHHK....',
      '...KHHHHHHHHK...',
      '...KHSSSSSSHK...',
      '...KSSSSSSSSK...',
      '...KGEGSSGEGK...',
      '...KSSSSSSSSK...',
      '...KSSSMMSSSK...',
      '....KSSSSSSK....',
      '...KAAAAAAAAK...',
      '..KCCCCCCCCCCK..',
      '..KSCCCCCCCCSK..',
      '..KSCCCDDCCCSK..',
      '..KSCCDDDDCCSK..',
      '...KCCCCCCCCK...',
      '...KCCCCCCCCK...',
      '...KBBBKKBBBK...',
      '....KKK..KKK....',
    ],
    up: [
      '.....KKKKKK.....',
      '....KHHHHHHK....',
      '...KHHHHHHHHK...',
      '...KHHHHHHHHK...',
      '...KHHHHHHHHK...',
      '...KHHHHHHHHK...',
      '...KHHHHHHHHK...',
      '...KHHHHHHHHK...',
      '....KHHHHHHK....',
      '...KAAAAAAAAK...',
      '..KCCCCCCCCCCK..',
      '..KSCCCCCCCCSK..',
      '..KSCCCDDCCCSK..',
      '..KSCCDDDDCCSK..',
      '...KCCCCCCCCK...',
      '...KCCCCCCCCK...',
      '...KBBBKKBBBK...',
      '....KKK..KKK....',
    ],
    side: [
      '.....KKKKKK.....',
      '....KHHHHHHK....',
      '...KHHHHHHHHK...',
      '...KHHHSSSSHK...',
      '...KHHSSSSSSK...',
      '...KHSSSGEGSK...',
      '...KHSSSSSSK....',
      '...KHSSSMMSK....',
      '....KHSSSSSK....',
      '...KAAAAAAAASK..',
      '..KCCCCCCCCCK...',
      '..KCCCCCCCCSK...',
      '..KCCCDDCCCSK...',
      '..KCCDDDDDCSK...',
      '...KCCCCCCCK....',
      '...KCCCCCCCK....',
      '...KBBBBBBK.....',
      '....KKKKKK......',
    ],
  },
  notes:
    'Trystan : lunettes, manteau vert, écharpe rouge. Présentateur près du coffre, guide des joueurs. ' +
    'Sans maison ni clé : il ouvre sa liste par son rôle, pas par une victoire.',
};
