/** Transactions de réservation préparées pour Firestore ; non reliées à l'interface locale. */
import { doc, runTransaction, serverTimestamp, type Firestore } from 'firebase/firestore';
import type { Auth } from 'firebase/auth';

function reservationRef(db: Firestore, familyId: string, giftId: string) {
  if (!familyId || familyId.includes('/') || !giftId || giftId.includes('/')) {
    throw new Error('Identifiant de famille ou de cadeau invalide.');
  }
  return doc(db, 'families', familyId, 'reservations', giftId);
}
function requireUser(auth: Auth): string {
  if (!auth.currentUser) throw new Error('Connecte-toi avant de réserver.');
  return auth.currentUser.uid;
}

/** Un document par cadeau et une transaction empêchent deux réservations simultanées. */
export async function reserveSharedGift(db: Firestore, auth: Auth, familyId: string, giftId: string): Promise<void> {
  const uid = requireUser(auth);
  const ref = reservationRef(db, familyId, giftId);
  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(ref);
    if (snapshot.exists()) throw new Error('Ce cadeau est déjà réservé.');
    transaction.set(ref, { giftId, reservedByUid: uid, createdAt: serverTimestamp() });
  });
}

/** Seul le compte à l'origine de la réservation peut demander son annulation. */
export async function cancelSharedReservation(db: Firestore, auth: Auth, familyId: string, giftId: string): Promise<void> {
  const uid = requireUser(auth);
  const ref = reservationRef(db, familyId, giftId);
  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(ref);
    if (!snapshot.exists()) return;
    if (snapshot.data().reservedByUid !== uid) throw new Error('Cette réservation appartient à une autre personne.');
    transaction.delete(ref);
  });
}
