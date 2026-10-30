/**
 * contract.ts — frontière entre l'interface et la couche autoritaire.
 *
 * L'UI n'appelle jamais ce contrat directement pour décider d'un droit :
 * elle reçoit des DTO déjà filtrés. Deux implémentations sont prévues :
 *   - mockApi.ts    : prototype local, même contrat, mêmes règles ;
 *   - supabaseApi.ts: à brancher sur les RPC PostgreSQL décrits dans /docs/schema.sql.
 */
import type {
  ApiResult,
  GameId,
  KeyId,
  PlayerProgress,
  Profile,
  RevealState,
  WishlistView,
} from '../types';

export interface AdminRow {
  profile: Profile;
  acquired: number;
  deposited: number;
  chestOpened: boolean;
}

export interface ChristmasApi {
  // comptes
  profiles(): Profile[];
  currentProfile(): Profile | null;
  signIn(email: string, password: string): ApiResult<Profile>;
  signOut(): void;
  subscribe(listener: () => void): () => void;

  // temps serveur
  revealState(): RevealState;

  // progression
  progress(userId: string): PlayerProgress;
  awardKey(userId: string, gameId: GameId): ApiResult<{ newKey: boolean; keyId: KeyId }>;
  depositKey(
    userId: string,
    keyId: KeyId,
  ): ApiResult<{ deposited: number; total: number; chestOpened: boolean; alreadyDeposited: boolean }>;
  canAccessLists(userId: string): boolean;
  submitMysteryGuess(userId: string, answer: string): ApiResult<{ solved: boolean }>;

  // listes
  getList(viewerId: string, ownerId: string): ApiResult<WishlistView>;
  allLists(viewerId: string): ApiResult<WishlistView[]>;
  addGift(
    ownerId: string,
    input: { title: string; description: string; priority: 1 | 2 | 3; priceHint?: string; shopUrl?: string },
  ): ApiResult<string>;
  updateGift(
    ownerId: string,
    giftId: string,
    patch: Partial<{ title: string; description: string; priority: 1 | 2 | 3; priceHint: string; shopUrl: string }>,
  ): ApiResult<{ neutralMessage: string }>;
  deleteGift(ownerId: string, giftId: string): ApiResult<{ neutralMessage: string }>;

  // réservations
  reserve(viewerId: string, giftId: string): ApiResult<{ reservationId: string }>;
  cancelReservation(viewerId: string, giftId: string): ApiResult<{ cancelled: boolean }>;

  // administration
  adminOverview(): AdminRow[];
  adminSetKey(userId: string, keyId: KeyId, acquired: boolean, deposited: boolean): ApiResult<PlayerProgress>;
  reservationEvents(): { id: string; at: string; type: string }[];

  // outils de démonstration (no-op côté serveur réel)
  setSimulatedReveal?(value: boolean): void;
  resetDemo?(): void;
}
