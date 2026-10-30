import { useEffect, useReducer, useRef, useState } from 'react';
import { server } from './data/api';
import { disconnectActiveAccount } from './data/firebase/accounts';
import { awardCloudKey, cloudActive, depositCloudKey, solveCloudMystery, stopCloudSession } from './data/firebase/session';
import { audio } from './audio/audio';
import * as visibilityRules from './data/mock/visibility';
import type { GameId, KeyId, Profile } from './data/types';
import { getMascot } from './mascots';
import { bus } from './game/bus';
import {
  applyVillageState,
  closeChalet,
  closeMinigame,
  getGame,
  mountGame,
  openChalet,
  openMinigame,
  pauseChalet,
  resumeChalet,
  setMinigameCanvasOrientation,
  setMinigamePortraitPaused,
  unmountGame,
} from './game/controller';
import { LoginScreen } from './ui/LoginScreen';
import { ListsPage } from './ui/ListsPage';
import { ChaletListModal } from './ui/ChaletListModal';
import {
  ChestModal,
  KEY_META,
  KeyAwardModal,
  MissionModal,
  PauseModal,
  PresenterModal,
  VillageHud,
} from './ui/VillageUI';

type View = 'village' | 'lists';
type Modal = null | 'chest' | 'presenter' | 'pause' | 'mission' | 'chalet-list';

interface KeyAward {
  keyId: KeyId;
  isNew: boolean;
  detail?: string;
}

export default function App() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [view, setView] = useState<View>('village');
  const [modal, setModal] = useState<Modal>(null);
  const [minigame, setMinigame] = useState<string | null>(null);
  const [portraitLayout, setPortraitLayout] = useState(false);
  const [portraitPrompt, setPortraitPrompt] = useState(false);
  const [insideChalet, setInsideChalet] = useState(false);
  const [keyAward, setKeyAward] = useState<KeyAward | null>(null);
  const [pendingVictory, setPendingVictory] = useState<{ gameId: GameId; detail?: string } | null>(null);
  const [savingVictory, setSavingVictory] = useState(false);
  const [chestFeedback, setChestFeedback] = useState<{ message: string; tone: 'ok' | 'error' } | null>(null);
  const [toast, setToast] = useState<{ message: string; tone: 'ok' | 'error' } | null>(null);
  const [, forceRender] = useReducer((value: number) => value + 1, 0);
  const hostRef = useRef<HTMLDivElement>(null);
  const toastTimeoutRef = useRef<number | null>(null);

  const progress = profile ? server.progress(profile.id) : null;
  const reveal = server.revealState();
  const listsUnlocked = profile ? server.canAccessLists(profile.id) : false;

  const showToast = (message: string, tone: 'ok' | 'error' = 'ok') => {
    if (toastTimeoutRef.current !== null) window.clearTimeout(toastTimeoutRef.current);
    setToast({ message, tone });
    toastTimeoutRef.current = window.setTimeout(() => {
      toastTimeoutRef.current = null;
      setToast(null);
    }, 4000);
  };

  const clearToast = () => {
    if (toastTimeoutRef.current !== null) window.clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = null;
    setToast(null);
  };

  useEffect(() => () => {
    if (toastTimeoutRef.current !== null) window.clearTimeout(toastTimeoutRef.current);
  }, []);

  // Si l’appareil tourne pendant la partie, on garde la présentation choisie
  // à l’ouverture et on suspend le jeu jusqu’au retour dans cette orientation.
  useEffect(() => {
    if (!minigame) {
      setPortraitPrompt(false);
      setPortraitLayout(false);
      setMinigamePortraitPaused(false);
      return;
    }
    const orientation = window.matchMedia('(orientation: portrait) and (max-width: 900px)');
    const syncOrientation = () => {
      const needsRotation = orientation.matches !== portraitLayout;
      setPortraitPrompt(needsRotation);
      setMinigamePortraitPaused(needsRotation);
    };
    syncOrientation();
    orientation.addEventListener('change', syncOrientation);
    return () => orientation.removeEventListener('change', syncOrientation);
  }, [minigame, portraitLayout]);

  useEffect(() => {
    if (!portraitPrompt) return;
    const blockGameKeys = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLElement && event.target.closest('button, a, input, textarea, select')) return;
      if (!['Enter', ' ', 'Escape', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'z', 'q', 's', 'd', 'p', 'x', 'w'].includes(event.key)) return;
      event.preventDefault();
      event.stopImmediatePropagation();
    };
    window.addEventListener('keydown', blockGameKeys, true);
    return () => window.removeEventListener('keydown', blockGameKeys, true);
  }, [portraitPrompt]);

  // Abonnement aux changements de la couche « serveur ».
  useEffect(() => server.subscribe(() => forceRender()), []);

  // Accroche de diagnostic (tests automatisés du prototype).
  useEffect(() => {
    (window as unknown as { __cq?: unknown }).__cq = {
      server,
      bus,
      openMinigame,
      closeMinigame,
      getGame,
      visibility: visibilityRules,
      audio,
    };
  }, []);

  // Audio : déverrouillage à la première interaction + coupure quand l'onglet est masqué.
  useEffect(() => {
    const unlock = () => audio.unlock();
    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });
    const onVisibility = () => audio.handleVisibility(document.hidden);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  // Montage de Phaser une fois le compte choisi.
  useEffect(() => {
    if (!profile || !hostRef.current) return;
    mountGame(hostRef.current);
    applyVillageState(getMascot(profile.mascotId), server.progress(profile.id));
    return () => unmountGame();
  }, [profile]);

  // Synchronisation du village (apparence, serrures) à chaque changement.
  useEffect(() => {
    if (!profile) return;
    applyVillageState(getMascot(profile.mascotId), server.progress(profile.id));
  });

  // Événements venant du village et des mini-jeux.
  useEffect(() => {
    if (!profile) return;
    const offs = [
      bus.on('minigame:open', ({ houseId }) => {
        clearToast();
        const houseKey = houseId.replace('maison-', '');
        const portrait = window.matchMedia('(orientation: portrait) and (max-width: 900px)').matches;
        setInsideChalet(false);
        setPortraitLayout(portrait);
        setPortraitPrompt(false);
        setMinigameCanvasOrientation(portrait);
        setMinigame(houseKey);
        openMinigame(houseKey);
      }),
      bus.on('chalet:enter', () => {
        openChalet(getMascot(profile.mascotId), server.progress(profile.id));
        setInsideChalet(true);
      }),
      bus.on('chalet:exit', () => {
        closeChalet();
        setInsideChalet(false);
      }),
      bus.on('chalet:list', () => {
        if (!server.canAccessLists(profile.id)) {
          showToast(server.progress(profile.id).chestOpened ? "Trouve la personne sur l'image mystère dans le coffre." : 'Dépose les quatre clés dans le coffre pour dévoiler l’image mystère.', 'error');
          return;
        }
        pauseChalet();
        setModal('chalet-list');
      }),
      bus.on('minigame:result', ({ gameId, won, detail }) => {
        if (!won) return; // Le jeu affiche déjà son écran de résultat.
        if (cloudActive()) {
          setPendingVictory({ gameId: gameId as GameId, detail });
          return;
        }
        const result = server.awardKey(profile.id, gameId as Parameters<typeof server.awardKey>[1]);
        if (result.ok) {
          audio.play('key');
          setKeyAward({ keyId: result.data!.keyId, isNew: result.data!.newKey, detail });
          forceRender();
        } else {
          showToast(result.error ?? 'Attribution impossible.', 'error');
        }
      }),
      bus.on('minigame:quit', () => {
        clearToast();
        closeMinigame();
        setMinigame(null);
      }),
      bus.on('chest:interact', () => {
        clearToast();
        setChestFeedback(null);
        pauseChalet();
        setModal('chest');
      }),
      bus.on('presenter:talk', () => setModal('presenter')),
      bus.on('lists:open', () => {
        if (server.canAccessLists(profile.id)) setView('lists');
        else showToast('Termine l’image mystère dans le coffre pour ouvrir la liste.', 'error');
      }),
      bus.on('pause:open', () => setModal('pause')),
      bus.on('toast', ({ message, tone }) => showToast(message, tone === 'error' ? 'error' : 'ok')),
    ];
    return () => offs.forEach((off) => off());
  }, [profile]);

  const signIn = (signedIn: Profile) => {
    audio.play('open');
    setProfile(signedIn);
    setView('village');
    setModal(null);
    setMinigame(null);
    setInsideChalet(false);
  };

  const signOut = () => {
    closeChalet();
    stopCloudSession();
    server.signOut();
    void disconnectActiveAccount().catch(() => showToast('Déconnexion Firebase impossible. Vérifie ta connexion.', 'error'));
    setProfile(null);
    setView('village');
    setModal(null);
    setKeyAward(null);
    setChestFeedback(null);
    setPendingVictory(null);
    setInsideChalet(false);
  };

  const saveVictory = async () => {
    if (!pendingVictory || savingVictory) return;
    setSavingVictory(true);
    try {
      const result = await awardCloudKey(pendingVictory.gameId);
      audio.play('key');
      setKeyAward({ keyId: result.keyId, isNew: result.newKey, detail: pendingVictory.detail });
      setPendingVictory(null);
      forceRender();
    } catch {
      showToast('Clé non enregistrée. Vérifie Internet puis réessaie.', 'error');
    } finally {
      setSavingVictory(false);
    }
  };

  useEffect(() => {
    if (pendingVictory) void saveVictory();
  }, [pendingVictory]);

  const deposit = async (keyId: KeyId) => {
    if (!profile) return;
    const wasOpen = server.progress(profile.id).chestOpened;
    if (cloudActive()) {
      try {
        await depositCloudKey(keyId);
        audio.play('deposit');
        const opened = server.progress(profile.id).chestOpened;
        setChestFeedback({ message: opened && !wasOpen ? 'Image complète ! Devine qui est sur la photo.' : `${KEY_META[keyId].label} déposée dans le coffre.`, tone: 'ok' });
        forceRender();
      } catch {
        setChestFeedback({ message: 'Dépôt non enregistré. Vérifie Internet puis réessaie.', tone: 'error' });
      }
      return;
    }
    const result = server.depositKey(profile.id, keyId);
    if (!result.ok) {
      setChestFeedback({ message: result.error ?? 'Dépôt impossible.', tone: 'error' });
      return;
    }
    const meta = KEY_META[keyId];
    audio.play(result.data!.chestOpened && !wasOpen ? 'chest' : 'deposit');
    if (result.data!.chestOpened && !wasOpen) {
      setChestFeedback({ message: 'Image complète ! Devine qui est sur la photo.', tone: 'ok' });
    } else if (result.data!.alreadyDeposited) {
      setChestFeedback({ message: `La ${meta.label.toLowerCase()} était déjà déposée.`, tone: 'ok' });
    } else {
      setChestFeedback({ message: `${meta.label} déposée — ${result.data!.deposited}/4 serrures.`, tone: 'ok' });
    }
    forceRender();
  };

  if (!profile || !progress) {
    return <LoginScreen onSignedIn={signIn} />;
  }

  return (
    <div className={`app-shell ${insideChalet ? 'in-chalet' : ''} ${!minigame && view === 'village' ? 'exploring' : ''}`}>
      <div ref={hostRef} className={`game-host ${view === 'lists' ? 'behind' : ''}`} />

      {!minigame && view === 'village' && (
        <VillageHud
          profile={profile}
          progress={progress}
          listsUnlocked={listsUnlocked}
          insideChalet={insideChalet}
          onOpenLists={() => setView('lists')}
          onPause={() => setModal('pause')}
          onReturnToVillage={() => bus.emit('chalet:exit', undefined)}
          onSignOut={signOut}
        />
      )}

      {!minigame && view === 'village' && (
        <MobileTouchControls key={insideChalet ? 'chalet' : 'village'} active={!modal && !keyAward && !pendingVictory} />
      )}

      {!minigame && view === 'village' && (
        <div className="mobile-hint">
          {insideChalet
            ? '📜 Le sapin et la liste sont à gauche du coffre. Touche le papier ou utilise « Agir ».'
            : <>📱 Déplace-toi avec les flèches, ou touche directement une porte.</>}
        </div>
      )}

      {!minigame && view === 'village' && (
        <div className="controls-hint">
          <span>Flèches / ZQSD : marcher</span>
          <span>{insideChalet ? 'E ou Espace : coffre / liste / sortie' : 'E ou Espace : entrer / interagir'}</span>
          <span>Échap : pause</span>
        </div>
      )}

      {minigame && !portraitPrompt && (
        <div className="minigame-banner">
          <span>Maison de {minigame.charAt(0).toUpperCase() + minigame.slice(1)}</span>
          <button
            className="ghost small"
            aria-label="Quitter le mini-jeu"
            onClick={() => {
              audio.play('close');
              clearToast();
              closeMinigame();
              setMinigame(null);
            }}
            type="button"
          >
            <span className="desktop-quit-label">Quitter le mini-jeu</span>
            <span className="mobile-quit-icon" aria-hidden="true">×</span>
          </button>
        </div>
      )}

      {minigame && portraitPrompt && (
        <div className="minigame-orientation" id="minigame-orientation-prompt" role="dialog" aria-modal="true" aria-labelledby="orientation-title">
          <div className="minigame-orientation-card">
            <div className="orientation-device" aria-hidden="true"><span>↻</span></div>
            <p className="orientation-eyebrow">Une petite seconde</p>
            <h2 id="orientation-title">{portraitLayout ? 'Garde ton téléphone à la verticale' : 'Tourne ton téléphone à l’horizontale'}</h2>
            <p>
              {portraitLayout
                ? 'Ce jeu est maintenant composé pour le format vertical. Ta partie est en pause et reprendra quand tu remettras ton téléphone à la verticale.'
                : 'Ce jeu est composé pour le grand écran. Ta partie est en pause et reprendra quand tu remettras ton téléphone à l’horizontale.'}
            </p>
            <button
              className="ghost"
              onClick={() => {
                audio.play('close');
                closeMinigame();
                setMinigame(null);
              }}
              type="button"
            >
              Quitter le mini-jeu
            </button>
          </div>
        </div>
      )}

      {modal === 'chest' && (
        <ChestModal
          progress={progress}
          feedback={chestFeedback}
          onDeposit={deposit}
          onGuess={async (answer) => {
            if (cloudActive()) {
              try {
                await solveCloudMystery(answer);
                audio.play('win');
                resumeChalet();
                setModal('mission');
                forceRender();
                return { ok: true, data: { solved: true } };
              } catch (error) {
                return { ok: false, error: error instanceof Error ? error.message : 'Réponse non enregistrée. Réessaie.' };
              }
            }
            const result = server.submitMysteryGuess(profile.id, answer);
            if (result.ok) {
              audio.play('win');
              resumeChalet();
              setModal('mission');
              forceRender();
            }
            return result;
          }}
          onClose={() => { setChestFeedback(null); setModal(null); resumeChalet(); }}
          onOpenLists={() => {
            setModal(null);
            resumeChalet();
            setView('lists');
          }}
        />
      )}

      {modal === 'presenter' && (
        <PresenterModal
          profile={profile}
          listsUnlocked={listsUnlocked}
          onClose={() => setModal(null)}
          onOpenLists={() => {
            setModal(null);
            setView('lists');
          }}
        />
      )}

      {modal === 'pause' && (
        <PauseModal
          reveal={reveal}
          listsUnlocked={listsUnlocked}
          onResume={() => setModal(null)}
          onOpenLists={() => {
            setModal(null);
            setView('lists');
          }}
          onSignOut={signOut}
        />
      )}

      {modal === 'mission' && (
        <MissionModal
          onOpenLists={() => {
            setModal(null);
            setView('lists');
          }}
        />
      )}

      {modal === 'chalet-list' && (
        <ChaletListModal
          profile={profile}
          onClose={() => {
            setModal(null);
            resumeChalet();
          }}
          onChanged={() => forceRender()}
        />
      )}

      {keyAward && (
        <KeyAwardModal
          keyId={keyAward.keyId}
          isNew={keyAward.isNew}
          isDeposited={progress.keys[keyAward.keyId].deposited}
          detail={keyAward.detail}
          onClose={() => {
            closeMinigame();
            setMinigame(null);
            setKeyAward(null);
          }}
        />
      )}

      {pendingVictory && (
        <div className="modal-backdrop">
          <div className="modal key-award" role="dialog" aria-modal="true" aria-labelledby="save-key-title">
            <h2 id="save-key-title">Bravo ! Enregistre ta clé</h2>
            <p>Envoie ta clé au coffre familial pour la retrouver sur les autres appareils.</p>
            <button className="primary" onClick={() => void saveVictory()} type="button" disabled={savingVictory}>
              {savingVictory ? 'Enregistrement…' : 'Enregistrer ma clé'}
            </button>
          </div>
        </div>
      )}

      {view === 'lists' && (
        <ListsPage
          profile={profile}
          reveal={reveal}
          onClose={() => setView('village')}
          onChanged={() => forceRender()}
        />
      )}

      {toast && <div className={`toast ${toast.tone}`} role="status" aria-live="polite">{toast.message}</div>}
    </div>
  );
}

const TOUCH_DIRECTIONS = [
  { direction: 'up' as const, label: 'Avancer', icon: '▲', className: 'touch-up' },
  { direction: 'left' as const, label: 'Aller à gauche', icon: '◀', className: 'touch-left' },
  { direction: 'right' as const, label: 'Aller à droite', icon: '▶', className: 'touch-right' },
  { direction: 'down' as const, label: 'Reculer', icon: '▼', className: 'touch-down' },
];

function MobileTouchControls({ active }: { active: boolean }) {
  type Direction = (typeof TOUCH_DIRECTIONS)[number]['direction'];
  const heldPointers = useRef(new Map<number, Direction>());

  useEffect(() => {
    const releaseAll = () => {
      heldPointers.current.clear();
      TOUCH_DIRECTIONS.forEach(({ direction }) => bus.emit('mobile:move', { direction, pressed: false }));
    };
    const onVisibilityChange = () => { if (document.hidden) releaseAll(); };
    window.addEventListener('blur', releaseAll);
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      window.removeEventListener('blur', releaseAll);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      releaseAll();
    };
  }, []);

  useEffect(() => {
    if (active) return;
    heldPointers.current.clear();
    TOUCH_DIRECTIONS.forEach(({ direction }) => bus.emit('mobile:move', { direction, pressed: false }));
  }, [active]);

  const setDirection = (direction: (typeof TOUCH_DIRECTIONS)[number]['direction'], pressed: boolean) => {
    bus.emit('mobile:move', { direction, pressed });
  };
  const releasePointer = (pointerId: number) => {
    const direction = heldPointers.current.get(pointerId);
    if (!direction) return;
    heldPointers.current.delete(pointerId);
    if (![...heldPointers.current.values()].includes(direction)) setDirection(direction, false);
  };

  return (
    <div className={`touch-controls${active ? '' : ' is-inactive'}`} aria-label="Commandes tactiles du jeu" aria-hidden={!active}>
      <div className="touch-pad">
        {TOUCH_DIRECTIONS.map(({ direction, label, icon, className }) => (
          <button
            key={direction}
            className={`touch-direction ${className}`}
            data-touch-direction={direction}
            aria-label={label}
            tabIndex={active ? 0 : -1}
            onPointerDown={(event) => {
              event.preventDefault();
              event.currentTarget.setPointerCapture(event.pointerId);
              heldPointers.current.set(event.pointerId, direction);
              setDirection(direction, true);
            }}
            onPointerUp={(event) => releasePointer(event.pointerId)}
            onPointerCancel={(event) => releasePointer(event.pointerId)}
            onLostPointerCapture={(event) => releasePointer(event.pointerId)}
            type="button"
          >
            {icon}
          </button>
        ))}
      </div>
      <button
        className="touch-action"
        data-touch-interact
        tabIndex={active ? 0 : -1}
        onClick={() => bus.emit('mobile:interact', undefined)}
        type="button"
      >
        <span>Agir</span>
      </button>
    </div>
  );
}
