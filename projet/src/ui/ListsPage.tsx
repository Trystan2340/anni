import { useEffect, useMemo, useRef, useState } from 'react';
import { server } from '../data/api';
import type {
  GiftOwnerBlind,
  GiftOwnerRevealed,
  GiftSeenByOthers,
  Profile,
  RevealState,
  WishlistView,
} from '../data/types';
import { MascotAvatar } from './MascotAvatar';
import { AdminPanel } from './AdminPanel';
import { cloudActive } from '../data/firebase/session';
import { Snowfall } from './Snowfall';

interface Props {
  profile: Profile;
  reveal: RevealState;
  onClose: () => void;
  onChanged: () => void;
}

const PRIORITY_LABEL: Record<number, string> = { 3: 'Priorité haute', 2: 'Priorité moyenne', 1: 'Petit plaisir' };
const DISPLAYED_LIST_OWNER_ID = 'u-trystan';

function isOwnBlind(gift: WishlistView['gifts'][number]): gift is GiftOwnerBlind {
  return 'isPrioritised' in gift;
}
function isReservationView(gift: WishlistView['gifts'][number]): gift is GiftSeenByOthers | GiftOwnerRevealed {
  return 'reservation' in gift;
}

export function ListsPage({ profile, reveal, onClose, onChanged }: Props) {
  const [tick, setTick] = useState(0);
  const [feedback, setFeedback] = useState<{ message: string; tone: 'ok' | 'error' } | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [showAdmin, setShowAdmin] = useState(false);
  const feedbackTimeoutRef = useRef<number | null>(null);

  const refresh = () => {
    setTick((value) => value + 1);
    onChanged();
  };

  const listResult = useMemo(
    () => server.getList(profile.id, DISPLAYED_LIST_OWNER_ID),
    [profile.id, tick, reveal.revealed, reveal.serverNowIso],
  );
  const list = listResult.data ?? null;

  const notify = (message: string, tone: 'ok' | 'error' = 'ok') => {
    if (feedbackTimeoutRef.current !== null) window.clearTimeout(feedbackTimeoutRef.current);
    setFeedback({ message, tone });
    feedbackTimeoutRef.current = window.setTimeout(() => {
      feedbackTimeoutRef.current = null;
      setFeedback(null);
    }, 4200);
  };

  useEffect(() => () => {
    if (feedbackTimeoutRef.current !== null) window.clearTimeout(feedbackTimeoutRef.current);
  }, []);

  const reserve = (giftId: string) => {
    const result = server.reserve(profile.id, giftId);
    if (!result.ok) notify(result.error ?? 'Réservation impossible.', 'error');
    else notify('Cadeau réservé. Le destinataire ne verra rien avant le 25 décembre.');
    refresh();
  };

  const cancel = (giftId: string) => {
    const result = server.cancelReservation(profile.id, giftId);
    if (!result.ok) notify(result.error ?? 'Annulation impossible.', 'error');
    else notify('Réservation annulée : le cadeau est de nouveau disponible.');
    refresh();
  };

  const countdown = () => {
    if (reveal.revealed || reveal.simulatedReveal) return 'Révélation active';
    const target = new Date(reveal.revealAtIso).getTime();
    const now = new Date(reveal.serverNowIso).getTime();
    const diff = target - now;
    if (diff <= 0) return 'Révélation active';
    const days = Math.floor(diff / 86_400_000);
    const hours = Math.floor((diff % 86_400_000) / 3_600_000);
    const minutes = Math.floor((diff % 3_600_000) / 60_000);
    return `Révélation dans ${days} j ${hours} h ${minutes} min`;
  };

  // Progression vers la révélation, calculée sur l'horloge serveur uniquement.
  const revealProgress = (() => {
    if (reveal.revealed || reveal.simulatedReveal) return 1;
    const target = new Date(reveal.revealAtIso).getTime();
    const now = new Date(reveal.serverNowIso).getTime();
    if (target <= now) return 1;
    // référence : 1er novembre 2026 (début de la saison) → 25 décembre 11 h
    const seasonStart = Date.parse('2026-11-01T00:00:00.000Z');
    const ratio = (now - seasonStart) / (target - seasonStart);
    return Math.min(0.97, Math.max(0.02, ratio));
  })();

  return (
    <div className="lists-page">
      <Snowfall count={16} />
      <header className="lists-header">
        <div className="lists-title">
          <h1>{list?.title ?? 'Liste de Noël de Trystan'}</h1>
          <p className="muted">
            Connecté en tant que <strong>{profile.member}</strong> · seule liste affichée : Trystan
          </p>
        </div>
        <div className="lists-header-actions">
          {profile.role === 'admin' && !cloudActive() && (
            <button className="ghost" onClick={() => setShowAdmin((value) => !value)} type="button">
              🛠 Administration
            </button>
          )}
          <button className="primary" onClick={onClose} type="button">
            Retour au village
          </button>
        </div>
      </header>

      <div className={`reveal-banner ${reveal.revealed ? 'revealed' : ''}`}>
        <div className="reveal-copy">
          <strong>
            {reveal.revealed ? '🎄 Les réservations sont révélées' : '🤫 Mode surprise actif'}
          </strong>
          <p>
            {reveal.revealed
              ? 'Les réservataires de cette liste sont maintenant visibles par Trystan. Le dévoilement reste acquis.'
              : 'Les réservations de cette liste restent cachées à Trystan jusqu’au 25/12/2026 à 11 h.'}
          </p>
        </div>
        <div className="reveal-clock">
          <span>{countdown()}</span>
          <div className="reveal-bar" role="presentation">
            <i style={{ width: `${Math.round(revealProgress * 100)}%` }} />
          </div>
          <small>Horloge serveur simulée · jamais celle du téléphone</small>
        </div>
        <label className="demo-switch" title="Outil de démonstration : avance la date serveur simulée">
          <input
            type="checkbox"
            checked={reveal.simulatedReveal}
            onChange={(event) => {
              server.setSimulatedReveal(event.target.checked);
              refresh();
            }}
          />
          Simuler le 25/12 11 h (démo)
        </label>
      </div>

      {feedback && <div className={`feedback ${feedback.tone}`}>{feedback.message}</div>}

      {showAdmin && profile.role === 'admin' && !cloudActive() && (
        <AdminPanel
          onChanged={() => {
            refresh();
          }}
        />
      )}

      <div className="lists-stats">
        <span>
          <strong>{list?.gifts.length ?? 0}</strong> cadeaux sur la liste de Trystan
        </span>
        <span className="muted">
          Une seule liste est affichée
        </span>
      </div>

      {list && (
      <section className="main-list">
          <ListCard
            list={list}
            viewer={profile}
            big
            editing={editing}
            setEditing={setEditing}
            onReserve={reserve}
            onCancel={cancel}
            onNotify={notify}
            onRefresh={refresh}
          />
        </section>
      )}

      <footer className="lists-footer">
        <p>
          Cette page affiche uniquement la liste de Noël de Trystan. Les réservations restent
          transactionnelles : une réservation active par cadeau, annulation réservée à son auteur,
          réservation de sa propre liste refusée. En production,
          ces règles vivent dans PostgreSQL (RLS + contrainte d'unicité partielle + RPC serveur).
        </p>
      </footer>
    </div>
  );
}

interface ListCardProps {
  list: WishlistView;
  viewer: Profile;
  big?: boolean;
  editing: string | null;
  setEditing: (id: string | null) => void;
  onReserve: (giftId: string) => void;
  onCancel: (giftId: string) => void;
  onNotify: (message: string, tone?: 'ok' | 'error') => void;
  onRefresh: () => void;
}

function ListCard({ list, viewer, big, editing, setEditing, onReserve, onCancel, onNotify, onRefresh }: ListCardProps) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState({ title: '', description: '', priority: 2 as 1 | 2 | 3, priceHint: '', shopUrl: '' });

  const submitGift = () => {
    const result = server.addGift(viewer.id, draft);
    if (!result.ok) {
      onNotify(result.error ?? 'Ajout impossible.', 'error');
      return;
    }
    setDraft({ title: '', description: '', priority: 2, priceHint: '', shopUrl: '' });
    setAdding(false);
    onNotify('Cadeau ajouté à votre liste.');
    onRefresh();
  };

  return (
    <article className={`list-card ${big ? 'big' : ''} ${list.isOwn ? 'own' : ''}`}>
      <header className="list-card-head">
        <MascotAvatar mascotId={list.ownerMember} size={big ? 52 : 40} />
        <div>
          <h2>{list.title}</h2>
          <p className="muted small">
            {list.ownerMember} · {list.gifts.length} cadeau{list.gifts.length > 1 ? 'x' : ''}
            {list.isOwn && ' · votre liste'}
          </p>
        </div>
        {list.isOwn && (
          <button className="ghost small" onClick={() => setAdding((value) => !value)} type="button">
            {adding ? 'Annuler' : '+ Cadeau'}
          </button>
        )}
      </header>

      {adding && (
        <div className="gift-form">
          <input
            placeholder="Titre du cadeau"
            value={draft.title}
            onChange={(event) => setDraft({ ...draft, title: event.target.value })}
          />
          <textarea
            placeholder="Description, taille, couleur…"
            value={draft.description}
            onChange={(event) => setDraft({ ...draft, description: event.target.value })}
          />
          <div className="gift-form-row">
            <select
              value={draft.priority}
              onChange={(event) => setDraft({ ...draft, priority: Number(event.target.value) as 1 | 2 | 3 })}
            >
              <option value={3}>Priorité haute</option>
              <option value={2}>Priorité moyenne</option>
              <option value={1}>Petit plaisir</option>
            </select>
            <input
              placeholder="Prix indicatif (€)"
              value={draft.priceHint}
              onChange={(event) => setDraft({ ...draft, priceHint: event.target.value })}
            />
          </div>
          <input
            placeholder="Lien marchand (facultatif)"
            value={draft.shopUrl}
            onChange={(event) => setDraft({ ...draft, shopUrl: event.target.value })}
          />
          <button className="primary" onClick={submitGift} type="button">
            Enregistrer le cadeau
          </button>
        </div>
      )}

      <ul className="gift-list">
        {list.gifts.length === 0 && <li className="empty">Aucun cadeau pour l'instant.</li>}
        {(list.gifts as (GiftOwnerBlind | GiftSeenByOthers | GiftOwnerRevealed)[]).map((gift) => {
          const reservation = isReservationView(gift) ? gift.reservation : null;
          const blind = isOwnBlind(gift);
          const reservedByMe = Boolean(
            reservation &&
              ('mine' in reservation
                ? (reservation as { mine?: boolean }).mine
                : reservation.reservedById === viewer.id),
          );
          return (
            <li key={gift.id} className={`gift ${reservation ? 'reserved' : ''}`}>
              <div className="gift-main">
                <div className="gift-title-line">
                  <strong>{gift.title}</strong>
                  <span className={`priority p${gift.priority}`}>{PRIORITY_LABEL[gift.priority]}</span>
                </div>
                {gift.description && <p className="gift-desc">{gift.description}</p>}
                <div className="gift-meta">
                  {gift.priceHint && <span>≈ {gift.priceHint}</span>}
                  {gift.shopUrl && (
                    <a href={gift.shopUrl} target="_blank" rel="noreferrer noopener">
                      Voir le marchand ↗
                    </a>
                  )}
                  <span className="tiny">
                    maj {new Date(gift.updatedAt).toLocaleDateString('fr-FR')}
                  </span>
                </div>
              </div>

              <div className="gift-actions">
                {/* Vue propriétaire AVANT révélation : aucun statut, même à l'écran. */}
                {blind && <span className="neutral-tag">Cadeau de ma liste</span>}

                {/* Vue propriétaire APRÈS révélation, ou vue d'un autre destinataire. */}
                {reservation && (
                  <span className={`reserved-tag ${reservedByMe ? 'mine' : ''}`}>
                    {reservedByMe ? 'Réservé par vous' : `Réservé par ${reservation.reservedByMember}`}
                  </span>
                )}

                {list.canReserve && !reservation && (
                  <button className="reserve" onClick={() => onReserve(gift.id)} type="button">
                    Réserver
                  </button>
                )}
                {list.canReserve && reservation && reservedByMe && (
                  <button className="ghost small" onClick={() => onCancel(gift.id)} type="button">
                    Annuler ma réservation
                  </button>
                )}

                {list.canEdit && (
                  <button
                    className="ghost small"
                    onClick={() => setEditing(editing === gift.id ? null : gift.id)}
                    type="button"
                  >
                    {editing === gift.id ? 'Fermer' : 'Modifier'}
                  </button>
                )}
              </div>

              {editing === gift.id && list.canEdit && (
                <GiftEditor
                  gift={gift}
                  viewer={viewer}
                  onDone={(message) => {
                    setEditing(null);
                    onNotify(message);
                    onRefresh();
                  }}
                  onError={(message) => onNotify(message, 'error')}
                />
              )}
            </li>
          );
        })}
      </ul>
    </article>
  );
}

function GiftEditor({
  gift,
  viewer,
  onDone,
  onError,
}: {
  gift: GiftOwnerBlind | GiftSeenByOthers | GiftOwnerRevealed;
  viewer: Profile;
  onDone: (message: string) => void;
  onError: (message: string) => void;
}) {
  const [title, setTitle] = useState(gift.title);
  const [description, setDescription] = useState(gift.description);
  const [priority, setPriority] = useState<1 | 2 | 3>(gift.priority);
  const [priceHint, setPriceHint] = useState(gift.priceHint ?? '');

  const save = () => {
    const result = server.updateGift(viewer.id, gift.id, { title, description, priority, priceHint });
    if (!result.ok) onError(result.error ?? 'Modification impossible.');
    // Message neutre : identique que le cadeau soit réservé ou non.
    else onDone(result.data?.neutralMessage ?? 'Cadeau mis à jour.');
  };

  const remove = () => {
    const result = server.deleteGift(viewer.id, gift.id);
    if (!result.ok) onError(result.error ?? 'Suppression impossible.');
    else onDone(result.data?.neutralMessage ?? 'Cadeau retiré de la liste.');
  };

  return (
    <div className="gift-editor">
      <input value={title} onChange={(event) => setTitle(event.target.value)} />
      <textarea value={description} onChange={(event) => setDescription(event.target.value)} />
      <div className="gift-form-row">
        <select value={priority} onChange={(event) => setPriority(Number(event.target.value) as 1 | 2 | 3)}>
          <option value={3}>Priorité haute</option>
          <option value={2}>Priorité moyenne</option>
          <option value={1}>Petit plaisir</option>
        </select>
        <input value={priceHint} onChange={(event) => setPriceHint(event.target.value)} placeholder="Prix indicatif" />
      </div>
      <div className="gift-form-row">
        <button className="primary small" onClick={save} type="button">
          Enregistrer
        </button>
        <button className="danger small" onClick={remove} type="button">
          Retirer de la liste
        </button>
      </div>
      <p className="tiny muted">
        Suppression logique : votre message est identique quel que soit l'état de réservation du cadeau.
      </p>
    </div>
  );
}
