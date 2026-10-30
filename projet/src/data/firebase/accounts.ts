/** Gestion des comptes Firebase Authentication. */
import { getApps } from 'firebase/app';
import { createUserWithEmailAndPassword, getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut, updateProfile, type Auth, type Unsubscribe, type User } from 'firebase/auth';
import type { MascotIdValue } from '../types';

export async function createAccount(auth: Auth, email: string, password: string, mascot: MascotIdValue): Promise<User> {
  const result = await createUserWithEmailAndPassword(auth, email.trim(), password);
  try {
    await updateProfile(result.user, { displayName: mascot });
  } catch {
    throw new Error("Le compte a été créé, mais le personnage n'a pas pu être enregistré. Contacte l'administrateur avant de réessayer.");
  }
  return result.user;
}

export function connectAccount(auth: Auth, email: string, password: string): Promise<User> {
  return signInWithEmailAndPassword(auth, email.trim(), password).then((result) => result.user);
}

export function disconnectAccount(auth: Auth): Promise<void> {
  return signOut(auth);
}

export function disconnectActiveAccount(): Promise<void> {
  const app = getApps().find((item) => item.name === 'christmas-quest');
  return app ? signOut(getAuth(app)) : Promise.resolve();
}

export function watchAccount(auth: Auth, onChange: (user: User | null) => void): Unsubscribe {
  return onAuthStateChanged(auth, onChange);
}
