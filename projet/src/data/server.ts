/**
 * server.ts — « serveur » de démonstration.
 *
 * Le prototype n'a pas de backend : ce module joue le rôle de la couche serveur.
 * RÈGLE D'OR : toute décision de visibilité (surprise de Noël, droits, unicité de
 * réservation, attribution des clés) est prise ICI, jamais dans les composants React.
 * Les signatures imitent des RPC Supabase : il suffit de remplacer le corps par
 * `supabase.rpc('...')` sans toucher à l'UI.
 */
import type { AdminRow, ChristmasApi } from './api/contract';
import type {
  ApiResult,
  GameId,
  GiftOwnerBlind,
  GiftOwnerRevealed,
  GiftSeenByOthers,
  KeyId,
  PlayerProgress,
  Profile,
  RevealState,
  Role,
  WishlistView,
} from './types';

import {
  DEMO_PASSWORD,
  KEYS,
  REVEAL_AT_ISO,
  STORAGE_KEY,
  emptyProgress,
  seed,
  trystanAmazonGifts,
  type DbShape,
  type GiftRecord,
  type Reservation,
  type ReservationEvent,
} from './mock/seed';
import { listTitle, projectGift, revealState as computeRevealState } from './mock/visibility';
import type { SharedProgress } from './firebase/progress';

export { DEMO_PASSWORD, REVEAL_AT_ISO } from './mock/seed';

/** Horodatage ISO : unique point de vérité pour les écritures. */
const now = () => new Date().toISOString();
const FAMILY_PROGRESS_ID = '__family__';


export type StoreListener = () => void;

export class ChristmasServer implements ChristmasApi {
  private db: DbShape;
  private cloudProgress: PlayerProgress | null = null;
  private listeners = new Set<StoreListener>();
  session: string | null = null;

  constructor() {
    this.db = this.load();
  }

  // ---------------------------------------------------------------- persistance
  private load(): DbShape {
    let db: DbShape;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      db = raw ? (JSON.parse(raw) as DbShape) : seed();
    } catch {
      /* stockage indisponible : on repart du jeu de démonstration */
      db = seed();
    }
    const progressMigrated = this.migrateFamilyProgress(db);
    const giftsMigrated = this.migrateTrystanGifts(db);
    if (progressMigrated || giftsMigrated) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
      } catch {
        /* la migration reste disponible en mémoire si le stockage est bloqué */
      }
    }
    return db;
  }

  /** Ajoute les cadeaux et remplace uniquement les anciens noms provisoires. */
  private migrateTrystanGifts(db: DbShape): boolean {
    let changed = false;
    const demoGiftIds = new Set(['g-t1', 'g-t2', 'g-t3', 'g-t4']);
    for (const gift of db.gifts) {
      // Un cadeau de démonstration modifié par le joueur peut désormais être réel.
      if (gift.ownerId === 'u-trystan' && demoGiftIds.has(gift.id) &&
          gift.updatedAt === '2026-12-01T12:00:00.000Z' && !gift.deleted) {
        gift.deleted = true;
        changed = true;
      }
    }
    for (const [index, gift] of trystanAmazonGifts().entries()) {
      const existing = db.gifts.find((item) => item.id === gift.id ||
        (item.ownerId === gift.ownerId && item.shopUrl === gift.shopUrl));
      if (existing) {
        const oldTitle = index === 3 ? 'Cadeau Amazon 4 — 2 exemplaires' : `Cadeau Amazon ${index + 1}`;
        if (existing.id === gift.id && existing.title === oldTitle) {
          existing.title = gift.title;
          changed = true;
        }
        continue;
      }
      db.gifts.push(gift);
      changed = true;
    }
    return changed;
  }

  /** Réunit les anciennes progressions par compte dans le coffre commun de la famille. */
  private migrateFamilyProgress(db: DbShape): boolean {
    db.progress ??= {};
    const existing = db.progress[FAMILY_PROGRESS_ID];
    if (existing && KEYS.every((keyId) => existing.keys?.[keyId])) return false;

    const family = emptyProgress(FAMILY_PROGRESS_ID);
    const sources = [existing, ...Object.values(db.progress)].filter(
      (progress): progress is PlayerProgress => Boolean(progress),
    );
    for (const source of sources) {
      const legacyJujuDemoKey =
        source.userId === 'u-juju' &&
        source.keys?.doree?.acquiredAt === '2026-12-01T18:22:00.000Z' &&
        !source.keys?.doree?.deposited;
      for (const keyId of KEYS) {
        const previous = source.keys?.[keyId];
        if (!previous) continue;
        if (legacyJujuDemoKey && keyId === 'doree') continue;
        const key = family.keys[keyId];
        if (previous.acquired) {
          key.acquired = true;
          key.ownerId = previous.ownerId || key.ownerId;
          key.acquiredAt ??= previous.acquiredAt;
        }
        if (previous.deposited) {
          key.deposited = true;
          key.depositedAt ??= previous.depositedAt;
        }
      }
      const awards = source.awardedKeys ?? [];
      family.awardedKeys = [
        ...new Set([...family.awardedKeys, ...awards.filter((keyId) => !(legacyJujuDemoKey && keyId === 'doree'))]),
      ];
    }
    family.chestOpened = KEYS.every((keyId) => family.keys[keyId].deposited);
    db.progress[FAMILY_PROGRESS_ID] = family;
    return true;
  }

  /** Écriture atomique : on sérialise l'état complet puis on remplace la clé. */
  private commit(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.db));
    } catch {
      /* ignore */
    }
    this.listeners.forEach((listener) => listener());
  }

  subscribe(listener: StoreListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  resetDemo(): void {
    this.db = seed();
    this.migrateFamilyProgress(this.db);
    this.session = null;
    this.commit();
  }

  // ---------------------------------------------------------------- horloge
  /** Horloge serveur simulée (jamais l'horloge du navigateur pour les décisions). */
  private serverNow(): Date {
    return new Date(Date.now() + this.db.demo.clockOffsetMs);
  }

  revealState(): RevealState {
    return computeRevealState(
      this.db.settings.revealAtIso,
      this.serverNow(),
      this.db.demo.simulateReveal,
    );
  }

  /** Outil de démonstration : avance l'horloge serveur simulée. */
  setDemoClock(offsetMs: number): void {
    this.db.demo.clockOffsetMs = offsetMs;
    this.commit();
  }

  setSimulatedReveal(value: boolean): void {
    this.db.demo.simulateReveal = value;
    this.commit();
  }

  // ---------------------------------------------------------------- comptes
  profiles(): Profile[] {
    return this.db.profiles;
  }

  profile(id: string | null): Profile | null {
    if (!id) return null;
    return this.db.profiles.find((p) => p.id === id) ?? null;
  }

  currentProfile(): Profile | null {
    return this.profile(this.session);
  }

  /** Démo : e-mail + mot de passe commun. En production, Supabase Auth + e-mail vérifié. */
  signIn(email: string, password: string): ApiResult<Profile> {
    const profile = this.db.profiles.find((p) => p.email.toLowerCase() === email.trim().toLowerCase());
    if (!profile) return { ok: false, error: 'Aucune invitation ne correspond à cette adresse.', code: 'NOT_AUTHORIZED' };
    if (password !== DEMO_PASSWORD) return { ok: false, error: 'Mot de passe incorrect.', code: 'NOT_AUTHORIZED' };
    if (!profile.emailVerified) return { ok: false, error: 'Adresse e-mail non vérifiée.', code: 'NOT_AUTHORIZED' };
    this.session = profile.id;
    this.commit();
    return { ok: true, data: profile };
  }

  signOut(): void {
    this.session = null;
    this.commit();
  }

  // ---------------------------------------------------------------- progression
  progress(_userId: string): PlayerProgress {
    return this.cloudProgress ?? this.db.progress[FAMILY_PROGRESS_ID] ?? emptyProgress(FAMILY_PROGRESS_ID);
  }

  setCloudProgress(shared: SharedProgress | null): void {
    if (!shared) this.cloudProgress = null;
    else {
      const result = emptyProgress(FAMILY_PROGRESS_ID);
      for (const id of KEYS) {
        result.keys[id].acquired = shared.keys[id].acquired;
        result.keys[id].deposited = shared.keys[id].deposited;
        result.keys[id].ownerId = shared.keys[id].ownerUid ?? FAMILY_PROGRESS_ID;
      }
      result.awardedKeys = KEYS.filter((id) => result.keys[id].acquired);
      result.chestOpened = shared.chestOpened;
      result.mysterySolved = shared.mysterySolved === true;
      this.cloudProgress = result;
    }
    this.listeners.forEach((listener) => listener());
  }

  /** Victoire de mini-jeu : attribution idempotente d'une clé unique. */
  awardKey(userId: string, gameId: GameId): ApiResult<{ newKey: boolean; keyId: KeyId }> {
    const profile = this.profile(userId);
    const house = this.db.profiles.find((entry) => entry.gameId === gameId && entry.keyId);
    if (!profile || !house?.keyId) {
      return { ok: false, error: 'Mini-jeu inconnu.', code: 'NOT_AUTHORIZED' };
    }
    const progress = this.progress(userId);
    const key = progress.keys[house.keyId];
    if (key.acquired) return { ok: true, data: { newKey: false, keyId: key.keyId } };
    key.acquired = true;
    key.ownerId = userId;
    key.acquiredAt = now();
    progress.awardedKeys = [...new Set([...progress.awardedKeys, key.keyId])];
    this.db.progress[FAMILY_PROGRESS_ID] = progress;
    this.commit();
    return { ok: true, data: { newKey: true, keyId: key.keyId } };
  }

  /** Dépôt physique au coffre : n'accepte qu'une clé réellement gagnée. */
  depositKey(userId: string, keyId: KeyId): ApiResult<{ deposited: number; total: number; chestOpened: boolean; alreadyDeposited: boolean }> {
    const progress = this.progress(userId);
    const key = progress.keys[keyId];
    if (!key || !key.acquired) return { ok: false, error: 'Cette clé n\'a pas encore été gagnée.', code: 'NOT_AUTHORIZED' };
    const alreadyDeposited = key.deposited;
    if (!key.deposited) {
      key.deposited = true;
      key.depositedAt = now();
    }
    const deposited = KEYS.filter((id) => progress.keys[id].deposited).length;
    if (deposited === 4) progress.chestOpened = true;
    this.db.progress[FAMILY_PROGRESS_ID] = progress;
    this.commit();
    return { ok: true, data: { deposited, total: 4, chestOpened: progress.chestOpened, alreadyDeposited } };
  }

  /** Réservé à l'administration : correction de progression sans victoire fictive. */
  adminSetKey(userId: string, keyId: KeyId, acquired: boolean, deposited: boolean): ApiResult<PlayerProgress> {
    if (this.cloudProgress) return { ok: false, error: 'L’administration des clés est réservée au mode démo.', code: 'NOT_AUTHORIZED' };
    const actor = this.currentProfile();
    if (!actor || actor.role !== 'admin') return { ok: false, error: 'Accès administrateur requis.', code: 'NOT_AUTHORIZED' };
    const progress = this.progress(userId);
    progress.keys[keyId] = {
      ...progress.keys[keyId],
      ownerId: acquired ? progress.keys[keyId].ownerId || userId : userId,
      acquired,
      deposited: acquired && deposited,
      acquiredAt: acquired ? progress.keys[keyId].acquiredAt ?? now() : null,
      depositedAt: acquired && deposited ? progress.keys[keyId].depositedAt ?? now() : null,
    };
    progress.chestOpened = KEYS.every((id) => progress.keys[id].deposited);
    if (!progress.chestOpened) progress.mysterySolved = false;
    this.db.progress[FAMILY_PROGRESS_ID] = progress;
    this.commit();
    return { ok: true, data: progress };
  }

  adminOverview(): AdminRow[] {
    const actor = this.currentProfile();
    if (!actor || actor.role !== 'admin') return [];
    const progress = this.progress(FAMILY_PROGRESS_ID);
    return [{
      profile: actor,
      acquired: KEYS.filter((id) => progress.keys[id].acquired).length,
      deposited: KEYS.filter((id) => progress.keys[id].deposited).length,
      chestOpened: progress.chestOpened,
    }];
  }

  // ---------------------------------------------------------------- listes
  /** La liste se débloque après les quatre dépôts et la résolution de l'image. */
  canAccessLists(userId: string): boolean {
    const profile = this.profile(userId);
    if (!profile) return false;
    const progress = this.progress(FAMILY_PROGRESS_ID);
    return progress.chestOpened && progress.mysterySolved === true;
  }

  submitMysteryGuess(userId: string, answer: string): ApiResult<{ solved: boolean }> {
    if (!this.profile(userId) || this.session !== userId) return { ok: false, error: 'Connecte-toi pour répondre.', code: 'NOT_AUTHORIZED' };
    const progress = this.progress(userId);
    if (!progress.chestOpened || !KEYS.every((key) => progress.keys[key].deposited)) {
      return { ok: false, error: "Dépose les quatre clés pour dévoiler l'image.", code: 'NOT_AUTHORIZED' };
    }
    const normalized = answer.trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('fr');
    if (normalized !== 'juju') return { ok: false, error: 'Ce n’est pas encore la bonne réponse. Essaie encore !', code: 'GENERIC' };
    progress.mysterySolved = true;
    this.db.progress[FAMILY_PROGRESS_ID] = progress;
    this.commit();
    return { ok: true, data: { solved: true } };
  }

  private activeReservation(giftId: string): Reservation | null {
    return this.db.reservations.find((r) => r.giftId === giftId && r.active) ?? null;
  }

  /**
   * Lecture d'une liste. La projection des cadeaux est déléguée aux règles pures
   * de `mock/visibility.ts` : cette méthode ne fait que rassembler les données.
   */
  getList(viewerId: string, ownerId: string): ApiResult<WishlistView> {
    const viewer = this.profile(viewerId);
    const owner = this.profile(ownerId);
    if (!viewer || !owner) return { ok: false, error: 'Compte inconnu.', code: 'NOT_AUTHORIZED' };
    if (!this.canAccessLists(viewerId)) {
      return { ok: false, error: "Dépose les quatre clés et résous l'image mystère pour ouvrir la liste.", code: 'NOT_AUTHORIZED' };
    }

    const isOwn = viewerId === ownerId;
    const { revealed } = this.revealState();
    const records = this.db.gifts.filter((gift) => gift.ownerId === ownerId && !gift.deleted);
    const context = {
      viewerId,
      ownerId,
      revealed,
      memberOf: (userId: string) => this.profile(userId)?.mascotId ?? 'Trystan',
    };

    const gifts: WishlistView['gifts'] = records.map((gift) =>
      projectGift(gift, this.activeReservation(gift.id), context),
    );

    return {
      ok: true,
      data: {
        ownerId,
        ownerMember: owner.mascotId,
        title: listTitle(viewerId, ownerId, owner.mascotId),
        isOwn,
        canEdit: isOwn,
        canReserve: !isOwn,
        revealed,
        gifts,
      },
    };
  }

  /** Ordre d'affichage stable : Trystan, Maman, Papa, Juju, Chacha. */
  allLists(viewerId: string): ApiResult<WishlistView[]> {
    const order = ['u-trystan', 'u-maman', 'u-papa', 'u-juju', 'u-chacha'];
    const lists: WishlistView[] = [];
    for (const ownerId of order) {
      const result = this.getList(viewerId, ownerId);
      if (!result.ok) return { ok: false, error: result.error, code: result.code };
      lists.push(result.data!);
    }
    return { ok: true, data: lists };
  }

  // ---------------------------------------------------------------- édition des cadeaux
  addGift(ownerId: string, input: { title: string; description: string; priority: 1 | 2 | 3; priceHint?: string; shopUrl?: string }): ApiResult<string> {
    if (this.session !== ownerId) return { ok: false, error: 'Session invalide.', code: 'NOT_AUTHORIZED' };
    if (!input.title.trim()) return { ok: false, error: 'Le titre est obligatoire.', code: 'GENERIC' };
    const id = `g-${Math.random().toString(36).slice(2, 9)}`;
    this.db.gifts.push({
      id,
      ownerId,
      title: input.title.trim(),
      description: input.description.trim(),
      imageUrl: null,
      priority: input.priority,
      priceHint: input.priceHint?.trim() || null,
      shopUrl: input.shopUrl?.trim() || null,
      updatedAt: now(),
      deleted: false,
    });
    this.commit();
    return { ok: true, data: id };
  }

  updateGift(ownerId: string, giftId: string, patch: Partial<{ title: string; description: string; priority: 1 | 2 | 3; priceHint: string; shopUrl: string }>): ApiResult<{ neutralMessage: string }> {
    if (this.session !== ownerId) return { ok: false, error: 'Session invalide.', code: 'NOT_AUTHORIZED' };
    const gift = this.db.gifts.find((entry) => entry.id === giftId && entry.ownerId === ownerId && !entry.deleted);
    if (!gift) return { ok: false, error: 'Cadeau introuvable.', code: 'NOT_FOUND' };
    Object.assign(gift, {
      title: patch.title?.trim() || gift.title,
      description: patch.description?.trim() ?? gift.description,
      priority: patch.priority ?? gift.priority,
      priceHint: patch.priceHint !== undefined ? patch.priceHint.trim() || null : gift.priceHint,
      shopUrl: patch.shopUrl !== undefined ? patch.shopUrl.trim() || null : gift.shopUrl,
      updatedAt: now(),
    });
    this.commit();
    // Message strictement identique que le cadeau soit réservé ou non.
    return { ok: true, data: { neutralMessage: 'Cadeau mis à jour.' } };
  }

  /** Suppression logique : le message ne dépend jamais du statut de réservation. */
  deleteGift(ownerId: string, giftId: string): ApiResult<{ neutralMessage: string }> {
    if (this.session !== ownerId) return { ok: false, error: 'Session invalide.', code: 'NOT_AUTHORIZED' };
    const gift = this.db.gifts.find((entry) => entry.id === giftId && entry.ownerId === ownerId && !entry.deleted);
    if (!gift) return { ok: false, error: 'Cadeau introuvable.', code: 'NOT_FOUND' };
    gift.deleted = true;
    gift.updatedAt = now();
    this.commit();
    return { ok: true, data: { neutralMessage: 'Cadeau retiré de la liste.' } };
  }

  // ---------------------------------------------------------------- réservations
  reserve(viewerId: string, giftId: string): ApiResult<{ reservationId: string }> {
    if (this.session !== viewerId) return { ok: false, error: 'Session invalide.', code: 'NOT_AUTHORIZED' };
    const gift = this.db.gifts.find((entry) => entry.id === giftId && !entry.deleted);
    if (!gift) return { ok: false, error: 'Cadeau introuvable.', code: 'NOT_FOUND' };
    if (gift.ownerId === viewerId) return { ok: false, error: 'Vous ne pouvez pas réserver votre propre liste.', code: 'OWN_LIST' };

    // Contrainte d'unicité : équivalent d'un index unique partiel sur (gift_id) WHERE active.
    const existing = this.activeReservation(giftId);
    if (existing) {
      this.db.events.push({ id: `e-${Date.now()}`, at: now(), type: 'blocked-duplicate', giftId, actorId: viewerId });
      this.commit();
      return { ok: false, error: 'Ce cadeau vient d\'être réservé par quelqu\'un d\'autre.', code: 'ALREADY_RESERVED' };
    }

    const reservation: Reservation = {
      id: `r-${Math.random().toString(36).slice(2, 9)}`,
      giftId,
      reservedById: viewerId,
      createdAt: now(),
      active: true,
      cancelledAt: null,
    };
    this.db.reservations.push(reservation);
    this.db.events.push({ id: `e-${Date.now()}`, at: now(), type: 'created', giftId, actorId: viewerId });
    this.commit();
    return { ok: true, data: { reservationId: reservation.id } };
  }

  cancelReservation(viewerId: string, giftId: string): ApiResult<{ cancelled: boolean }> {
    if (this.session !== viewerId) return { ok: false, error: 'Session invalide.', code: 'NOT_AUTHORIZED' };
    const reservation = this.activeReservation(giftId);
    if (!reservation) return { ok: false, error: 'Aucune réservation active.', code: 'NOT_FOUND' };
    if (reservation.reservedById !== viewerId) {
      return { ok: false, error: 'Vous ne pouvez annuler que vos propres réservations.', code: 'NOT_AUTHORIZED' };
    }
    reservation.active = false;
    reservation.cancelledAt = now();
    this.db.events.push({ id: `e-${Date.now()}`, at: now(), type: 'cancelled', giftId, actorId: viewerId });
    this.commit();
    return { ok: true, data: { cancelled: true } };
  }

  /** Vue d'administration : incidents de réservation, jamais envoyée à un propriétaire. */
  reservationEvents() {
    const actor = this.currentProfile();
    if (!actor || actor.role !== 'admin') return [];
    return this.db.events;
  }
}

/** Instance unique — remplace le client Supabase dans le prototype. */
export const server = new ChristmasServer();
