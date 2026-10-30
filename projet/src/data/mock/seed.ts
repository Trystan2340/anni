/**
 * seed.ts — jeu de données de démonstration et types de persistance.
 * Séparé du service (server.ts) pour que les règles pures puissent être testées
 * sans stockage, et pour que le remplacement par PostgreSQL reste localisé.
 */
import type { KeyId, PlayerKey, PlayerProgress, Profile } from '../types';

export const REVEAL_AT_ISO = '2026-12-25T10:00:00.000Z'; // 11 h 00 Europe/Paris (UTC+1)
export const DEMO_PASSWORD = 'noel2026';
export const STORAGE_KEY = 'christmas-quest:v3.1';
export const KEYS: KeyId[] = ['rose', 'bleue', 'doree', 'violette'];

export interface Reservation {
  id: string;
  giftId: string;
  reservedById: string;
  createdAt: string;
  active: boolean;
  cancelledAt: string | null;
}

export interface GiftRecord {
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

export interface ReservationEvent {
  id: string;
  at: string;
  type: 'created' | 'cancelled' | 'blocked-duplicate';
  giftId: string;
  actorId: string;
  /** Journal protégé : jamais exposé à l'UI du propriétaire avant révélation. */
}

export interface DbShape {
  profiles: Profile[];
  progress: Record<string, PlayerProgress>;
  gifts: GiftRecord[];
  reservations: Reservation[];
  events: ReservationEvent[];
  settings: { revealAtIso: string; expiryHours: number | null };
  demo: { clockOffsetMs: number; simulateReveal: boolean };
}

const now = () => new Date().toISOString();

export function emptyProgress(userId: string): PlayerProgress {
  const keys = {} as Record<KeyId, PlayerKey>;
  for (const keyId of KEYS) {
    keys[keyId] = { keyId, ownerId: userId, acquired: false, deposited: false, acquiredAt: null, depositedAt: null };
  }
  return { userId, chestOpened: false, keys, awardedKeys: [], mysterySolved: false };
}

/** Cadeaux communiqués pour la liste de Trystan, ajoutés aussi aux sauvegardes existantes. */
export function trystanAmazonGifts(): GiftRecord[] {
  return [
    g('g-trystan-amazon-01', 'u-trystan', 'UGREEN Zapix 100W — chargeur USB-C 6 ports GaN', '', 2, '35,99 €', 'https://amzn.eu/d/07V1UMRH'),
    g('g-trystan-amazon-02', 'u-trystan', 'SOULWIT — 50 clips adhésifs pour câbles', '', 2, '15,95 €', 'https://amzn.eu/d/00GrkqXb'),
    g('g-trystan-amazon-03', 'u-trystan', 'UGREEN — câble DisplayPort 1.4, 2 m', 'Certifié VESA, 8K 60 Hz et 4K 240 Hz.', 2, '10,39 €', 'https://amzn.eu/d/09P8hBcc'),
    g('g-trystan-amazon-04', 'u-trystan', 'UGREEN — câble USB-C 60W PD3.0, 1 m (2 exemplaires)', 'Il en faut 2 : 6,31 € par exemplaire, soit 12,62 € au total.', 2, '12,62 € les deux', 'https://amzn.eu/d/06ho8e1a'),
    g('g-trystan-amazon-05', 'u-trystan', 'Tapis de souris noir Topographic Contour', 'Bords cousus, tissu micro-tissé, base antidérapante ; 35,4 × 15,7 × 0,12 pouces.', 2, '21,59 €', 'https://amzn.eu/d/08A5d7Aq'),
    g('g-trystan-amazon-06', 'u-trystan', 'Belkin — multiprise parafoudre 8 prises USB-C et USB-A', 'Cordon de 2 m.', 2, '44,99 €', 'https://amzn.eu/d/0aYjB0UH'),
  ];
}

export function seed(): DbShape {
  const profiles: Profile[] = [
    {
      id: 'u-maman',
      member: 'Maman',
      email: 'maman@famille-noel.fr',
      role: 'player',
      mascotId: 'Maman',
      houseId: 'maison-maman',
      keyId: 'rose',
      gameId: 'maman-match3',
      invitationCode: 'NOEL-MAMAN-26',
      emailVerified: true,
    },
    {
      id: 'u-papa',
      member: 'Papa',
      email: 'papa@famille-noel.fr',
      role: 'player',
      mascotId: 'Papa',
      houseId: 'maison-papa',
      keyId: 'bleue',
      gameId: 'papa-tron',
      invitationCode: 'NOEL-PAPA-26',
      emailVerified: true,
    },
    {
      id: 'u-juju',
      member: 'Juju',
      email: 'juju@famille-noel.fr',
      role: 'player',
      mascotId: 'Juju',
      houseId: 'maison-juju',
      keyId: 'doree',
      gameId: 'juju-blocks',
      invitationCode: 'NOEL-JUJU-26',
      emailVerified: true,
    },
    {
      id: 'u-chacha',
      member: 'Chacha',
      email: 'chacha@famille-noel.fr',
      role: 'player',
      mascotId: 'Chacha',
      houseId: 'maison-chacha',
      keyId: 'violette',
      gameId: 'chacha-runner',
      invitationCode: 'NOEL-CHACHA-26',
      emailVerified: true,
    },
    {
      id: 'u-trystan',
      member: 'Trystan',
      email: 'trystan@famille-noel.fr',
      role: 'admin',
      mascotId: 'Trystan',
      houseId: null,
      keyId: null,
      gameId: null,
      invitationCode: 'NOEL-TRYSTAN-26',
      emailVerified: true,
    },
  ];

  const progress: Record<string, PlayerProgress> = {};
  for (const profile of profiles) {
    const p = emptyProgress(profile.id);
    progress[profile.id] = p;
  }

  const gifts: GiftRecord[] = [
    // Liste principale : Trystan
    ...trystanAmazonGifts(),
    // Maman
    g('g-m1', 'u-maman', 'Pluviomètre en cuivre', 'Pour le jardin potager.', 2, '45 €', 'https://example.com/pluvio'),
    g('g-m2', 'u-maman', 'Louche à mousse de chocolat', 'Pour les chocolats chauds du soir.', 3, '22 €', null),
    g('g-m3', 'u-maman', 'Écharpe cachemire rose', 'Douce, longue, assortie au manteau.', 1, '60 €', null),
    // Papa
    g('g-p1', 'u-papa', 'Malle de rangement atelier', 'Métal, 60 L, roulettes.', 2, '55 €', null),
    g('g-p2', 'u-papa', 'Radio à manivelle', 'Pour la cabane au fond du jardin.', 1, '34 €', null),
    g('g-p3', 'u-papa', 'Gants de jardin renforcés', 'Taille 10.', 3, '19 €', null),
    // Juju
    g('g-j1', 'u-juju', 'Casque de trottinette', 'Taille M, coloris doré.', 3, '48 €', 'https://example.com/casque-trott'),
    g('g-j2', 'u-juju', 'Jeu de construction 500 pièces', 'Le défi de janvier.', 2, '65 €', null),
    g('g-j3', 'u-juju', 'Boîte de crayons pastel', '24 couleurs, pour sa chambre dorée.', 1, '26 €', null),
    // Chacha
    g('g-c1', 'u-chacha', 'Bonnet & moufles violet', 'Laine mérinos.', 2, '29 €', 'https://example.com/bonnet'),
    g('g-c2', 'u-chacha', 'Projecteur d\'étoiles', 'Pour la chambre, veilleuse douce.', 3, '32 €', null),
    g('g-c3', 'u-chacha', 'Roman d\'aventure illustré', 'Une héroïne qui traverse les neiges.', 1, '16 €', null),
  ];

  // Réservations d'exemple : elles doivent rester INVISIBLES aux propriétaires avant le 25/12.
  const reservations: Reservation[] = [
    { id: 'r2', giftId: 'g-m2', reservedById: 'u-trystan', createdAt: '2026-12-06T09:40:00.000Z', active: true, cancelledAt: null },
    { id: 'r3', giftId: 'g-j1', reservedById: 'u-papa', createdAt: '2026-12-06T10:05:00.000Z', active: true, cancelledAt: null },
    { id: 'r4', giftId: 'g-c2', reservedById: 'u-juju', createdAt: '2026-12-07T17:30:00.000Z', active: true, cancelledAt: null },
    { id: 'r5', giftId: 'g-p3', reservedById: 'u-chacha', createdAt: '2026-12-07T18:00:00.000Z', active: true, cancelledAt: null },
  ];

  return {
    profiles,
    progress,
    gifts,
    reservations,
    events: [],
    settings: { revealAtIso: REVEAL_AT_ISO, expiryHours: null },
    demo: { clockOffsetMs: 0, simulateReveal: false },
  };
}

export function g(
  id: string,
  ownerId: string,
  title: string,
  description: string,
  priority: 1 | 2 | 3,
  priceHint: string | null,
  shopUrl: string | null,
): GiftRecord {
  return {
    id,
    ownerId,
    title,
    description,
    imageUrl: null,
    priority,
    priceHint,
    shopUrl,
    updatedAt: '2026-12-01T12:00:00.000Z',
    deleted: false,
  };
}
