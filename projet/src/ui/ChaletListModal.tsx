import { useEffect, useMemo, useRef, useState } from 'react';
import { server } from '../data/api';
import type { Profile, WishlistView } from '../data/types';
import { useBackdropDismiss } from './useBackdropDismiss';

const DISPLAYED_LIST_OWNER_ID = 'u-trystan';
const PRIORITY_LABEL: Record<number, string> = {
  3: 'Mon envie du moment',
  2: 'Ça me ferait plaisir',
  1: 'Petit plaisir',
};

interface Props {
  profile: Profile;
  onClose: () => void;
  onChanged: () => void;
}

function safeShopUrl(value?: string | null): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : null;
  } catch {
    return null;
  }
}

function reservationFor(gift: WishlistView['gifts'][number]) {
  return 'reservation' in gift ? gift.reservation : null;
}

function isReservedByViewer(gift: WishlistView['gifts'][number], viewerId: string): boolean {
  const reservation = reservationFor(gift);
  if (!reservation) return false;
  return 'mine' in reservation ? Boolean(reservation.mine) : reservation.reservedById === viewerId;
}

export function ChaletListModal({ profile, onClose, onChanged }: Props) {
  const backdrop = useBackdropDismiss(onClose);
  const [revision, setRevision] = useState(0);
  const [feedback, setFeedback] = useState<{ message: string; tone: 'ok' | 'error' } | null>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef(onClose);
  const feedbackTimeoutRef = useRef<number | null>(null);
  closeRef.current = onClose;

  const listResult = useMemo(
    () => server.getList(profile.id, DISPLAYED_LIST_OWNER_ID),
    [profile.id, revision],
  );
  const list = listResult.data ?? null;

  useEffect(() => {
    closeButtonRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        closeRef.current();
        return;
      }
      if (event.key !== 'Tab') return;
      const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;
      if (!dialogRef.current?.contains(active)) {
        event.preventDefault();
        first.focus();
      } else if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (feedbackTimeoutRef.current !== null) window.clearTimeout(feedbackTimeoutRef.current);
    };
  }, []);

  const refresh = () => {
    if (feedbackTimeoutRef.current !== null) window.clearTimeout(feedbackTimeoutRef.current);
    setRevision((value) => value + 1);
    onChanged();
  };

  const notify = (message: string, tone: 'ok' | 'error') => {
    if (feedbackTimeoutRef.current !== null) window.clearTimeout(feedbackTimeoutRef.current);
    setFeedback({ message, tone });
    feedbackTimeoutRef.current = window.setTimeout(() => {
      feedbackTimeoutRef.current = null;
      setFeedback(null);
    }, 3800);
  };

  const reserve = (giftId: string) => {
    const result = server.reserve(profile.id, giftId);
    if (!result.ok) notify(result.error ?? 'Réservation impossible.', 'error');
    else notify('Cadeau réservé. Trystan ne le verra pas avant Noël.', 'ok');
    refresh();
  };

  const cancel = (giftId: string) => {
    const result = server.cancelReservation(profile.id, giftId);
    if (!result.ok) notify(result.error ?? 'Annulation impossible.', 'error');
    else notify('Réservation annulée : le cadeau est à nouveau disponible.', 'ok');
    refresh();
  };

  return (
    <div className="chalet-list-backdrop" {...backdrop}>
      <section
        ref={dialogRef}
        className="chalet-list-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="chalet-list-title"
        aria-describedby="chalet-list-description"
      >
        <header className="chalet-list-header">
          <div className="chalet-list-heading">
            <span className="chalet-list-kicker">🎄 Le papier du sapin</span>
            <h2 id="chalet-list-title">Liste de Noël de Trystan</h2>
            <p id="chalet-list-description">
              {list?.isOwn
                ? 'Voici les cadeaux de ta liste.'
                : 'Choisis une idée et réserve-la pour garder la surprise.'}
            </p>
          </div>
          <button
            ref={closeButtonRef}
            className="chalet-list-close"
            onClick={onClose}
            type="button"
            aria-label="Fermer la liste de Noël"
          >
            ×
          </button>
        </header>

        <div className="chalet-list-scroll">
          {!list && (
            <div className="chalet-list-locked" role="status">
              <span aria-hidden="true">🔒</span>
              <strong>La liste est encore fermée</strong>
              <p>{listResult.error ?? 'Ouvre le coffre du chalet pour lire la liste.'}</p>
            </div>
          )}

          {list && (
            <>
              <div className="chalet-list-summary">
                <span>{list.gifts.length} idée{list.gifts.length > 1 ? 's' : ''} cadeau{list.gifts.length > 1 ? 's' : ''}</span>
                <span>{list.isOwn ? 'Ta liste' : 'Pour Trystan'}</span>
              </div>

              {feedback && (
                <div className={`chalet-list-feedback ${feedback.tone}`} role="status" aria-live="polite">
                  {feedback.message}
                </div>
              )}

              <ul className="chalet-wishlist">
                {list.gifts.length === 0 && <li className="chalet-wishlist-empty">La liste est vide pour le moment.</li>}
                {list.gifts.map((gift) => {
                  const reservation = reservationFor(gift);
                  const reservedByMe = isReservedByViewer(gift, profile.id);
                  const shopUrl = safeShopUrl(gift.shopUrl);
                  const isOwnerBlind = 'isPrioritised' in gift;
                  return (
                    <li className="chalet-wishlist-gift" data-gift-id={gift.id} key={gift.id}>
                      <div className="chalet-gift-copy">
                        <div className="chalet-gift-title-row">
                          <strong>{gift.title}</strong>
                          <span className={`chalet-priority p${gift.priority}`}>{PRIORITY_LABEL[gift.priority]}</span>
                        </div>
                        {gift.description && <p>{gift.description}</p>}
                        <div className="chalet-gift-meta">
                          {gift.priceHint && <span>Environ {gift.priceHint}</span>}
                          {shopUrl && (
                            <a href={shopUrl} target="_blank" rel="noopener noreferrer">
                              Voir le cadeau
                            </a>
                          )}
                        </div>
                      </div>

                      <div className="chalet-gift-action">
                        {list.canReserve && !reservation && (
                          <button className="chalet-reserve" onClick={() => reserve(gift.id)} type="button">
                            Réserver
                          </button>
                        )}
                        {reservation && (
                          <span className={`chalet-reservation ${reservedByMe ? 'mine' : ''}`}>
                            {reservedByMe ? 'Réservé par vous' : `Déjà réservé par ${reservation.reservedByMember}`}
                          </span>
                        )}
                        {list.canReserve && reservation && reservedByMe && (
                          <button className="chalet-cancel-reservation" onClick={() => cancel(gift.id)} type="button">
                            Annuler ma réservation
                          </button>
                        )}
                        {!list.canReserve && isOwnerBlind && (
                          <span className="chalet-owner-note">Cadeau de ta liste</span>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </div>

        <footer className="chalet-list-footer">
          <span aria-hidden="true">✨</span>
          {list?.isOwn
            ? 'Les réservations restent cachées jusqu’au jour de Noël.'
            : 'Ta réservation restera cachée à Trystan jusqu’au jour de Noël.'}
        </footer>
      </section>
    </div>
  );
}
