/**
 * types.ts — contrats de données partagés UI ⇄ « serveur ».
 * Les DTO de liste sont volontairement SÉPARÉS : avant Noël, le propriétaire ne reçoit
 * pas un objet « masqué », il reçoit un objet qui ne contient aucun champ de réservation.
 */

export type Role = 'player' | 'admin';
export type MascotIdValue = 'Maman' | 'Papa' | 'Juju' | 'Chacha' | 'Trystan';
export type KeyId = 'rose' | 'bleue' | 'doree' | 'violette';
export type GameId = 'maman-match3' | 'papa-tron' | 'juju-blocks' | 'chacha-runner';

export interface Profile {
  id: string;
  member: MascotIdValue;
  email: string;
  role: Role;
  mascotId: MascotIdValue;
  /** Maison associée, null pour le présentateur. */
  houseId: string | null;
  keyId: KeyId | null;
  gameId: GameId | null;
  /** Invitation nominative (privée). */
  invitationCode: string;
  emailVerified: boolean;
}

export interface PlayerKey {
  keyId: KeyId;
  ownerId: string;
  acquired: boolean;
  deposited: boolean;
  acquiredAt: string | null;
  depositedAt: string | null;
}

export interface PlayerProgress {
  userId: string;
  chestOpened: boolean;
  keys: Record<KeyId, PlayerKey>;
  /** Attributions de clés historisées : garantit l'unicité d'une clé par victoire. */
  awardedKeys: KeyId[];
  /** Épreuve finale : réponse correcte à l'image mystère. */
  mysterySolved?: boolean;
}

export interface GiftBase {
  id: string;
  ownerId: string;
  title: string;
  description: string;
  imageUrl?: string | null;
  priority: 1 | 2 | 3; // 3 = priorité haute
  priceHint?: string | null;
  shopUrl?: string | null;
  updatedAt: string;
  deleted: boolean;
}

/** Vue « publique » (destinataire autorisé autre que le propriétaire). */
export interface GiftSeenByOthers extends GiftBase {
  reservation: null | {
    reservationId: string;
    reservedByMember: MascotIdValue;
    reservedById: string;
    createdAt: string;
    mine: boolean;
  };
}

/** Vue du PROPRIÉTAIRE avant le 25/12 11 h : aucun champ de réservation n'existe. */
export interface GiftOwnerBlind extends GiftBase {
  /** Champ constant, identique pour tous les cadeaux : ne peut rien révéler. */
  isPrioritised: boolean;
}

/** Vue du PROPRIÉTAIRE après la révélation. */
export interface GiftOwnerRevealed extends GiftBase {
  reservation: null | {
    reservationId: string;
    reservedByMember: MascotIdValue;
    reservedById: string;
    createdAt: string;
  };
}

export type GiftView = GiftSeenByOthers | GiftOwnerBlind | GiftOwnerRevealed;

export interface WishlistView {
  ownerId: string;
  ownerMember: MascotIdValue;
  title: string;
  /** L'utilisateur connecté est-il le propriétaire de cette liste ? */
  isOwn: boolean;
  canEdit: boolean;
  canReserve: boolean;
  /** Vrai seulement si le dévoilement serveur est actif pour cette liste. */
  revealed: boolean;
  /** Union explicite : la forme dépend du spectateur, jamais d'un champ masqué. */
  gifts: (GiftSeenByOthers | GiftOwnerBlind | GiftOwnerRevealed)[];
}

export type ReservationError =
  | 'OWN_LIST'
  | 'ALREADY_RESERVED'
  | 'NOT_FOUND'
  | 'NOT_AUTHORIZED'
  | 'OFFLINE';

export interface ApiResult<T> {
  ok: boolean;
  data?: T;
  error?: string;
  code?: ReservationError | 'GENERIC';
}

export interface RevealState {
  /** Date serveur autoritaire de la révélation : 25/12/2026 11 h 00 Europe/Paris = 10 h 00 UTC. */
  revealAtIso: string;
  serverNowIso: string;
  revealed: boolean;
  /** Simulation locale (démo uniquement), clairement séparée du serveur réel. */
  simulatedReveal: boolean;
}
