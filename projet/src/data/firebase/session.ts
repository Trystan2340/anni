/** Adaptateur entre la progression Firestore et l'interface du jeu. */
import type { FirebaseServices } from './client';
import type { Unsubscribe } from 'firebase/firestore';
import type { GameId, KeyId } from '../types';
import { server } from '../api';
import { bus } from '../../game/bus';
import { depositSharedKey, readProgress, recordVictory, solveSharedMystery, watchProgress } from './progress';

const FAMILY = 'famille-noel';
let current: FirebaseServices | null = null;
let unsubscribe: Unsubscribe | null = null;

export function cloudActive(): boolean { return current !== null; }

export async function startCloudSession(services: FirebaseServices): Promise<void> {
  stopCloudSession();
  const initial = await readProgress(services.db, FAMILY);
  current = services;
  server.setCloudProgress(initial);
  unsubscribe = watchProgress(services.db, FAMILY, (next) => {
    if (current === services && next) server.setCloudProgress(next);
  }, () => {
    if (current === services) bus.emit('toast', { message: 'Synchronisation des clés interrompue. Vérifie ta connexion.', tone: 'error' });
  });
}

export function stopCloudSession(): void {
  unsubscribe?.();
  unsubscribe = null;
  current = null;
  server.setCloudProgress(null);
}

async function refresh(services: FirebaseServices): Promise<void> {
  const state = await readProgress(services.db, FAMILY);
  if (current === services) server.setCloudProgress(state);
}

export async function awardCloudKey(game: GameId): Promise<{ keyId: KeyId; newKey: boolean }> {
  if (!current) throw new Error('La synchronisation des clés est indisponible.');
  const services = current;
  const result = await recordVictory(services.db, services.auth, FAMILY, game);
  await refresh(services);
  return result;
}
export async function depositCloudKey(keyId: KeyId): Promise<void> {
  if (!current) throw new Error('La synchronisation des clés est indisponible.');
  const services = current;
  await depositSharedKey(services.db, services.auth, FAMILY, keyId);
  await refresh(services);
}
export async function solveCloudMystery(answer: string): Promise<void> {
  if (!current) throw new Error('La synchronisation des clés est indisponible.');
  const services = current;
  await solveSharedMystery(services.db, services.auth, FAMILY, answer);
  await refresh(services);
}
