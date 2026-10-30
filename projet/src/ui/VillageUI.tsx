import { useState } from 'react';
import type { ApiResult, KeyId, PlayerProgress, Profile, RevealState } from '../data/types';
import { MascotAvatar } from './MascotAvatar';
import { Confetti } from './Confetti';
import { useBackdropDismiss } from './useBackdropDismiss';
import mysteryImage from '../assets/mystere-pixel.png';

export const KEY_META: Record<KeyId, { label: string; color: string; house: string; game: string }> = {
  rose: { label: 'Clé rose', color: '#e2709a', house: 'Maman', game: 'La Fabrique de Friandises' },
  bleue: { label: 'Clé bleue', color: '#5b8fe0', house: 'Papa', game: 'Les Traîneaux Lumineux' },
  doree: { label: 'Clé dorée', color: '#e8b83f', house: 'Juju', game: 'Les Cadeaux Empilés' },
  violette: { label: 'Clé violette', color: '#a97ce8', house: 'Chacha', game: 'La Course du Père Noël' },
};

const KEY_ORDER: KeyId[] = ['rose', 'bleue', 'doree', 'violette'];

export function VillageHud({
  profile,
  progress,
  listsUnlocked,
  onOpenLists,
  onPause,
  insideChalet,
  onReturnToVillage,
  onSignOut,
}: {
  profile: Profile;
  progress: PlayerProgress;
  listsUnlocked: boolean;
  onOpenLists: () => void;
  onPause: () => void;
  insideChalet: boolean;
  onReturnToVillage: () => void;
  onSignOut: () => void;
}) {
  const acquired = KEY_ORDER.filter((id) => progress.keys[id].acquired && !progress.keys[id].deposited).length;
  const deposited = KEY_ORDER.filter((id) => progress.keys[id].deposited).length;
  return (
    <div className="hud">
      <div className="hud-left">
        <div className="hud-avatar">
          <MascotAvatar mascotId={profile.mascotId} size={40} />
        </div>
        <div>
          <strong>{profile.member}</strong>
          <span className="hud-role">
            {profile.role === 'admin' ? 'Présentateur · administrateur' : 'Joueur'}
          </span>
        </div>
      </div>

      <div className="hud-keys">
        {KEY_ORDER.map((id) => {
          const key = progress.keys[id];
          const state = key.deposited ? 'deposited' : key.acquired ? 'acquired' : 'locked';
          return (
            <div
              key={id}
              className={`key-chip ${state}`}
              style={{ ['--key-color' as string]: KEY_META[id].color }}
              title={
                key.deposited
                  ? `${KEY_META[id].label} — déposée au coffre`
                  : key.acquired
                    ? `${KEY_META[id].label} — à déposer au coffre`
                    : `${KEY_META[id].label} — à gagner chez ${KEY_META[id].house}`
              }
            >
              <span className="key-dot" />
              <span className="key-name">{KEY_META[id].label.replace('Clé ', '')}</span>
            </div>
          );
        })}
        <div className="key-counts" aria-live="polite">
          <span>En poche <strong>{acquired}/4</strong></span>
          <span>Au coffre <strong>{deposited}/4</strong></span>
        </div>
      </div>

      <div className="hud-right">
        {listsUnlocked && (
          <button className="ghost" onClick={onOpenLists} type="button">
            🎁 Liste de Noël
          </button>
        )}
        <button className="ghost" onClick={onPause} type="button">
          ⏸ Pause
        </button>
        {insideChalet && (
          <button className="ghost chalet-return-button" onClick={onReturnToVillage} type="button">
            ↩ Retour au village
          </button>
        )}
        <button className="ghost" onClick={onSignOut} type="button">
          ⏏ Quitter
        </button>
      </div>
    </div>
  );
}

export function ChestModal({
  progress,
  onDeposit,
  onClose,
  onOpenLists,
  onGuess,
}: {
  progress: PlayerProgress;
  onDeposit: (keyId: KeyId) => void;
  onClose: () => void;
  onOpenLists: () => void;
  onGuess: (answer: string) => Promise<ApiResult<{ solved: boolean }>>;
}) {
  const backdrop = useBackdropDismiss(onClose);
  const [answer, setAnswer] = useState('');
  const [guessError, setGuessError] = useState('');
  const [guessPending, setGuessPending] = useState(false);
  const keys = KEY_ORDER.map((id) => progress.keys[id]);
  const acquired = keys.filter((key) => key.acquired).length;
  const available = keys.filter((key) => key.acquired && !key.deposited);
  const deposited = keys.filter((key) => key.deposited);

  return (
    <div className="modal-backdrop" {...backdrop}>
      <div className="modal chest-modal" onClick={(event) => event.stopPropagation()}>
        <h2>🧰 Petit coffre du chalet</h2>
        <p className="muted">
          Les clés gagnées sont partagées entre les quatre profils et restent enregistrées après
          déconnexion.
        </p>

        <p className="counter-line">
          Inventaire familial : <strong>{acquired} / 4 gagnées</strong> · <strong>{deposited.length} / 4 déposées</strong>
        </p>

        <div className="locks">
          {KEY_ORDER.map((id, index) => {
            const open = progress.keys[id].deposited;
            return (
              <div
                key={id}
                className={`lock ${open ? 'open' : ''}`}
                style={{ ['--key-color' as string]: KEY_META[id].color }}
              >
                <span className="lock-index">{index + 1}</span>
                <span className="lock-name">{KEY_META[id].label}</span>
                <span className="lock-state">{open ? 'Ouverte' : 'Fermée'}</span>
              </div>
            );
          })}
        </div>

        <p className="counter-line">
          Serrures activées : <strong>{deposited.length} / 4</strong>
        </p>

        {!progress.chestOpened && available.length > 0 && (
          <div className="deposit-list">
            <p>Clés en main, prêtes à être déposées :</p>
            {available.map((key) => (
              <button key={key.keyId} className="deposit-button"
                style={{ ['--key-color' as string]: KEY_META[key.keyId].color }}
                onClick={() => onDeposit(key.keyId)} type="button">
                <span className="key-dot" /> Déposer la {KEY_META[key.keyId].label.toLowerCase()}
              </button>
            ))}
          </div>
        )}

        <section className="mystery-section" aria-labelledby="mystery-title">
          <h3 id="mystery-title">🧩 L'image mystère</h3>
          <p>Chaque clé déposée dévoile une partie de l'image.</p>
          <div className="mystery-grid" aria-label={`${deposited.length} parties de l'image dévoilées sur 4`}>
            {KEY_ORDER.map((id, index) => {
              const revealed = progress.keys[id].deposited;
              return (
                <div key={id} className={`mystery-piece ${revealed ? 'revealed' : 'hidden'}`}
                  data-mystery-key={id} data-revealed={revealed ? 'true' : 'false'}
                  style={revealed ? { backgroundImage: `url(${mysteryImage})`, backgroundPosition: `${index % 2 ? 100 : 0}% ${index >= 2 ? 100 : 0}%` } : undefined}
                  aria-label={`Partie ${index + 1} ${revealed ? 'dévoilée' : 'cachée'}`}>
                  {!revealed && <span aria-hidden="true">✦<small>🔒</small></span>}
                </div>
              );
            })}
          </div>
          <p className="mystery-progress">{deposited.length} / 4 parties dévoilées</p>
          {progress.chestOpened && !progress.mysterySolved && (
            <form className="mystery-form" onSubmit={async (event) => {
              event.preventDefault();
              if (guessPending) return;
              setGuessPending(true);
              try {
                const result = await onGuess(answer);
                setGuessError(result.ok ? '' : result.error ?? 'Essaie encore !');
              } finally { setGuessPending(false); }
            }}>
              <label htmlFor="mystery-answer">Qui est cette personne ?</label>
              <input id="mystery-answer" value={answer} onChange={(event) => { setAnswer(event.target.value); setGuessError(''); }} placeholder="Écris son prénom" maxLength={60} autoComplete="off" />
              {guessError && <p className="mystery-error" role="alert">{guessError}</p>}
              <button type="submit" className="primary" disabled={!answer.trim() || guessPending}>{guessPending ? 'Vérification…' : 'Valider ma réponse'}</button>
            </form>
          )}
        </section>

        {progress.mysterySolved ? (
          <div className="chest-opened">
            <p>Bravo ! La liste de Noël de Trystan est maintenant accessible.</p>
            <button className="primary" onClick={onOpenLists} type="button">
              Ouvrir la liste de Noël
            </button>
          </div>
        ) : !progress.chestOpened && available.length === 0 ? (
          <p className="muted small">
            {acquired === 0
              ? 'Aucune clé gagnée pour le moment. Les clés apparaîtront ici dès qu’un joueur terminera son mini-jeu.'
              : 'Toutes les clés gagnées jusqu’ici ont déjà été déposées.'}
          </p>
        ) : null}

        <div className="modal-actions">
          <button className="ghost" onClick={onClose} type="button">
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}

export function PresenterModal({
  profile,
  onClose,
  onOpenLists,
  listsUnlocked,
}: {
  profile: Profile;
  onClose: () => void;
  onOpenLists: () => void;
  listsUnlocked: boolean;
}) {
  const backdrop = useBackdropDismiss(onClose);
  return (
    <div className="modal-backdrop" {...backdrop}>
      <div className="modal presenter-modal" onClick={(event) => event.stopPropagation()}>
        <div className="presenter-head">
          <MascotAvatar mascotId="Trystan" size={64} />
          <div>
            <h2>Trystan, présentateur du village</h2>
            <p className="muted">
              « Bienvenue ! Quatre maisons, quatre clés et un chalet familial. Chaque victoire ajoute
              sa clé à l’inventaire commun. »
            </p>
          </div>
        </div>
        <ol className="rules-list">
          <li>Flèches ou ZQSD pour marcher, E ou Espace pour interagir, Échap pour la pause.</li>
          <li>Chaque victoire donne une clé, une seule fois — les victoires suivantes ne la dupliquent pas.</li>
          <li>Retrouvez le chalet au centre du village et déposez les clés familiales dans le petit coffre.</li>
          <li>Les quatre clés dévoilent une image : trouvez qui s'y cache pour ouvrir la liste de Noël.</li>
          <li>
            Astuce : les cadeaux de votre propre liste restent neutres jusqu'au 25 décembre, 11 h —
            même pour moi, administrateur.
          </li>
        </ol>
        <div className="modal-actions">
          {profile.role === 'admin' && listsUnlocked && (
            <button className="primary" onClick={onOpenLists} type="button">
              Accès administrateur à la liste de Noël
            </button>
          )}
          <button className="ghost" onClick={onClose} type="button">
            Continuer à explorer
          </button>
        </div>
      </div>
    </div>
  );
}

export function PauseModal({
  reveal,
  listsUnlocked,
  onResume,
  onOpenLists,
  onSignOut,
}: {
  reveal: RevealState;
  listsUnlocked: boolean;
  onResume: () => void;
  onOpenLists: () => void;
  onSignOut: () => void;
}) {
  const backdrop = useBackdropDismiss(onResume);
  return (
    <div className="modal-backdrop" {...backdrop}>
      <div className="modal pause-modal" onClick={(event) => event.stopPropagation()}>
        <h2>Pause</h2>
        <p className="muted">
          Horloge serveur : {new Date(reveal.serverNowIso).toLocaleString('fr-FR', { timeZone: 'Europe/Paris' })}
        </p>
        <p className="muted">
          Révélation des réservations : 25 décembre 2026 à 11 h 00 (Europe/Paris) —{' '}
          {reveal.revealed ? 'active' : 'encore verrouillée'}.
        </p>
        <div className="modal-actions column">
          <button className="primary" onClick={onResume} type="button">
            Reprendre la partie
          </button>
          {listsUnlocked && (
            <button className="ghost" onClick={onOpenLists} type="button">
              Ouvrir la liste de Noël
            </button>
          )}
          <button className="ghost" onClick={onSignOut} type="button">
            Changer de compte
          </button>
        </div>
      </div>
    </div>
  );
}

export function KeyAwardModal({
  keyId,
  isNew,
  isDeposited,
  detail,
  onClose,
}: {
  keyId: KeyId;
  isNew: boolean;
  isDeposited: boolean;
  detail?: string;
  onClose: () => void;
}) {
  const backdrop = useBackdropDismiss(onClose);
  const meta = KEY_META[keyId];
  return (
    <div className="modal-backdrop" {...backdrop}>
      <div className="modal key-award" onClick={(event) => event.stopPropagation()}>
        <div className="key-visual" style={{ ['--key-color' as string]: meta.color }}>
          <span className="key-shape">🗝</span>
        </div>
        <h2>{isNew ? `${meta.label} gagnée !` : `${meta.label} déjà gagnée`}</h2>
        <p className="muted">
          {isNew
            ? `La clé apparaît dans l’inventaire familial. Entrez dans le chalet au centre du village pour la déposer.`
            : isDeposited
              ? 'Une victoire supplémentaire ne crée pas de nouvelle clé. Votre clé est déjà déposée dans le coffre.'
              : 'Une victoire supplémentaire ne crée pas de nouvelle clé. Votre clé est déjà dans l\'inventaire.'}
        </p>
        {detail && <p className="tiny muted">Résultat : {detail}</p>}
        <button className="primary" onClick={onClose} type="button">
          Retourner au village
        </button>
      </div>
    </div>
  );
}

export function MissionModal({ onOpenLists }: { onOpenLists: () => void }) {
  return (
    <div className="modal-backdrop mission">
      <div className="mission-card">
        <Confetti />
        <div className="mission-glow" />
        <p className="mission-kicker">Quatre clés · énigme résolue</p>
        <h2>MISSION ACCOMPLIE</h2>
        <h3>JOYEUX NOËL !</h3>
        <p>
          La liste de Noël de Trystan est désormais accessible. Les réservations restent une surprise
          jusqu'au 25 décembre, 11 h.
        </p>
        <button className="primary big" onClick={onOpenLists} type="button">
          Découvrir la liste de Noël
        </button>
      </div>
    </div>
  );
}
