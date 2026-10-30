/** Synchronisation Firestore du coffre familial. */
import { doc, getDocFromServer, onSnapshot, runTransaction, type Firestore, type Unsubscribe } from 'firebase/firestore';
import type { Auth } from 'firebase/auth';
import type { GameId, KeyId } from '../types';

const KEY_BY_GAME: Record<GameId, KeyId> = {
  'maman-match3': 'rose', 'papa-tron': 'bleue', 'juju-blocks': 'doree', 'chacha-runner': 'violette',
};
const KEYS: KeyId[] = ['rose', 'bleue', 'doree', 'violette'];

export interface SharedKey {
  acquired: boolean;
  deposited: boolean;
  ownerUid: string | null;
}
export interface SharedProgress {
  keys: Record<KeyId, SharedKey>;
  chestOpened: boolean;
  mysterySolved?: boolean;
}

function emptyProgress(): SharedProgress {
  return {
    keys: {
      rose: { acquired: false, deposited: false, ownerUid: null },
      bleue: { acquired: false, deposited: false, ownerUid: null },
      doree: { acquired: false, deposited: false, ownerUid: null },
      violette: { acquired: false, deposited: false, ownerUid: null },
    },
    chestOpened: false,
    mysterySolved: false,
  };
}

export async function readProgress(db: Firestore, familyId: string): Promise<SharedProgress> {
  const snapshot = await getDocFromServer(progressRef(db, familyId));
  return snapshot.exists() ? snapshot.data() as SharedProgress : emptyProgress();
}

function progressRef(db: Firestore, familyId: string) {
  if (!familyId || familyId.includes('/')) throw new Error('Identifiant de famille invalide.');
  return doc(db, 'families', familyId, 'state', 'progress');
}
function requireUser(auth: Auth): string {
  if (!auth.currentUser) throw new Error('Connecte-toi avant de synchroniser les clés.');
  return auth.currentUser.uid;
}

/** Les erreurs d'autorisation ou de réseau sont transmises à l'appelant. */
export function watchProgress(db: Firestore, familyId: string, onChange: (progress: SharedProgress | null) => void, onError: (error: Error) => void): Unsubscribe {
  return onSnapshot(progressRef(db, familyId), (snapshot) => {
    if (!snapshot.metadata.fromCache && !snapshot.metadata.hasPendingWrites) {
      onChange(snapshot.exists() ? snapshot.data() as SharedProgress : null);
    }
  }, onError);
}

/** Transaction idempotente : deux victoires simultanées ne dupliquent pas la clé. */
export async function recordVictory(db: Firestore, auth: Auth, familyId: string, gameId: GameId): Promise<{ keyId: KeyId; newKey: boolean }> {
  const uid = requireUser(auth);
  const keyId = KEY_BY_GAME[gameId];
  if (!keyId) throw new Error('Épreuve inconnue.');
  const ref = progressRef(db, familyId);
  return runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(ref);
    const progress = snapshot.exists() ? snapshot.data() as SharedProgress : emptyProgress();
    if (progress.keys[keyId].acquired) return { keyId, newKey: false };
    progress.keys[keyId] = { acquired: true, deposited: false, ownerUid: uid };
    transaction.set(ref, progress);
    return { keyId, newKey: true };
  });
}

export async function solveSharedMystery(db: Firestore, auth: Auth, familyId: string, answer: string): Promise<void> {
  requireUser(auth);
  const normalized = answer.trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('fr');
  if (normalized !== 'juju') throw new Error('Ce n’est pas encore la bonne réponse. Essaie encore !');
  const ref = progressRef(db, familyId);
  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(ref);
    if (!snapshot.exists()) throw new Error('Dépose les quatre clés pour dévoiler l’image.');
    const progress = snapshot.data() as SharedProgress;
    if (!progress.chestOpened || !KEYS.every((id) => progress.keys[id].deposited)) throw new Error('Dépose les quatre clés pour dévoiler l’image.');
    if (progress.mysterySolved) return;
    progress.mysterySolved = true;
    transaction.set(ref, progress);
  });
}

/** Le dépôt conserve les autres clés ; le coffre s'ouvre après les quatre dépôts. */
export async function depositSharedKey(db: Firestore, auth: Auth, familyId: string, keyId: KeyId): Promise<void> {
  requireUser(auth);
  if (!KEYS.includes(keyId)) throw new Error('Clé inconnue.');
  const ref = progressRef(db, familyId);
  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(ref);
    if (!snapshot.exists()) throw new Error('Aucune clé gagnée pour le moment.');
    const progress = snapshot.data() as SharedProgress;
    if (!progress.keys[keyId].acquired) throw new Error("Cette clé n'a pas encore été gagnée.");
    if (progress.keys[keyId].deposited) return;
    progress.keys[keyId].deposited = true;
    progress.chestOpened = KEYS.every((key) => progress.keys[key].deposited);
    transaction.set(ref, progress);
  });
}
