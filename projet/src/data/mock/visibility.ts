/**
 * visibility.ts — règles PURES de visibilité des listes.
 *
 * C'est le module le plus sensible du projet : il décide, sans base de données ni
 * horloge système, quelle forme de données un membre peut recevoir. Étant pur, il
 * est testé directement (voir tests/visibility.mjs) et réutilisable tel quel côté
 * serveur (fonction SQL équivalente : `list_gifts`).
 */
import type {
  GiftOwnerBlind,
  GiftOwnerRevealed,
  GiftSeenByOthers,
  MascotIdValue,
  RevealState,
} from '../types';

export interface GiftRecordLike {
  id: string;
  ownerId: string;
  title: string;
  description: string;
  imageUrl: string | null;
  priority: 1 | 2 | 3;
  priceHint: string | null;
  shopUrl: string | null;
  updatedAt: string;
  deleted: boolean;
}

export interface ReservationLike {
  id: string;
  giftId: string;
  reservedById: string;
  createdAt: string;
  active: boolean;
}

export interface ViewerContext {
  viewerId: string;
  ownerId: string;
  revealed: boolean;
  memberOf: (userId: string) => MascotIdValue;
}

/**
 * La révélation dépend UNIQUEMENT de l'heure serveur (ou de la simulation de démo).
 * Aucune horloge cliente n'entre ici : l'argument `serverNow` vient du serveur.
 */
export function isRevealed(revealAtIso: string, serverNow: Date, simulated = false): boolean {
  if (simulated) return true;
  return serverNow.getTime() >= new Date(revealAtIso).getTime();
}

export function revealState(
  revealAtIso: string,
  serverNow: Date,
  simulated = false,
): RevealState {
  return {
    revealAtIso,
    serverNowIso: serverNow.toISOString(),
    revealed: isRevealed(revealAtIso, serverNow, simulated),
    simulatedReveal: simulated,
  };
}

/** Titre de la carte de liste, sans jamais révéler le contenu. */
export function listTitle(viewerId: string, ownerId: string, ownerMember: MascotIdValue): string {
  if (ownerId === viewerId) return 'Ma liste de Noël';
  if (ownerMember === 'Trystan') return 'Liste de Trystan';
  return `Liste de ${ownerMember}`;
}

/**
 * Projection d'un cadeau selon l'appelant.
 * - propriétaire, avant révélation → DTO SANS champ de réservation (pas un null) ;
 * - propriétaire, après révélation → DTO avec le réservataire ;
 * - autre destinataire autorisé → DTO avec statut, nom et indicateur « mienne ».
 */
export function projectGift(
  gift: GiftRecordLike,
  reservation: ReservationLike | null,
  context: ViewerContext,
):
  | GiftOwnerBlind
  | GiftOwnerRevealed
  | GiftSeenByOthers {
  const isOwn = context.viewerId === context.ownerId;
  const base = {
    id: gift.id,
    ownerId: gift.ownerId,
    title: gift.title,
    description: gift.description,
    imageUrl: gift.imageUrl,
    priority: gift.priority,
    priceHint: gift.priceHint,
    shopUrl: gift.shopUrl,
    updatedAt: gift.updatedAt,
    deleted: gift.deleted,
  };

  if (isOwn && !context.revealed) {
    return { ...base, isPrioritised: gift.priority === 3 };
  }

  if (isOwn) {
    return {
      ...base,
      reservation:
        reservation && reservation.active
          ? {
              reservationId: reservation.id,
              reservedByMember: context.memberOf(reservation.reservedById),
              reservedById: reservation.reservedById,
              createdAt: reservation.createdAt,
            }
          : null,
    };
  }

  return {
    ...base,
    reservation:
      reservation && reservation.active
        ? {
            reservationId: reservation.id,
            reservedByMember: context.memberOf(reservation.reservedById),
            reservedById: reservation.reservedById,
            createdAt: reservation.createdAt,
            mine: reservation.reservedById === context.viewerId,
          }
        : null,
  };
}

/** Le statut du cadeau est-il visible par ce spectateur ? (utilisé par l'UI et les tests) */
export function canSeeReservationStatus(context: ViewerContext): boolean {
  return context.viewerId !== context.ownerId || context.revealed;
}
