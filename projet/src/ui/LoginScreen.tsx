import { useState } from 'react';
import { FirebaseError } from 'firebase/app';
import { DEMO_PASSWORD, server } from '../data/api';
import { connectAccount, createAccount, disconnectAccount } from '../data/firebase/accounts';
import { createFirebaseServices, firebaseConfigFromEnvironment } from '../data/firebase/client';
import { startCloudSession, stopCloudSession } from '../data/firebase/session';
import type { Profile } from '../data/types';
import { MascotAvatar } from './MascotAvatar';
import { Snowfall } from './Snowfall';

interface Props {
  onSignedIn: (profile: Profile) => void;
}
type Mode = 'login' | 'register' | 'demo';

function errorMessage(error: unknown): string {
  if (error instanceof FirebaseError) {
    switch (error.code) {
      case 'auth/email-already-in-use': return 'Cette adresse possède déjà un compte. Choisis « Se connecter ». '; 
      case 'auth/invalid-email': return 'Cette adresse e-mail est invalide.';
      case 'auth/weak-password': return 'Choisis un mot de passe plus solide (au moins 6 caractères).';
      case 'auth/invalid-credential':
      case 'auth/wrong-password':
      case 'auth/user-not-found': return 'Adresse e-mail ou mot de passe incorrect.';
      case 'auth/network-request-failed': return 'Connexion impossible. Vérifie ta connexion Internet et réessaie.';
      case 'auth/too-many-requests': return 'Trop de tentatives. Réessaie plus tard.';
      case 'auth/operation-not-allowed': return 'La connexion par e-mail et mot de passe doit être activée dans Firebase.';
      case 'permission-denied': return 'Le compte existe, mais les règles Firestore ne permettent pas encore la synchronisation. Applique les règles du jeu, puis reconnecte-toi.';
      case 'unavailable': return 'Synchronisation indisponible. Vérifie ta connexion Internet et réessaie.';
      default: return 'Impossible de se connecter pour le moment. Réessaie.';
    }
  }
  return error instanceof Error ? error.message : 'Une erreur est survenue. Réessaie.';
}

export function LoginScreen({ onSignedIn }: Props) {
  const profiles = server.profiles();
  const [selected, setSelected] = useState<Profile | null>(null);
  const [mode, setMode] = useState<Mode>('register');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const choose = (profile: Profile) => {
    setSelected(profile);
    if (mode === 'demo') setEmail(profile.email);
    setPassword('');
    setConfirmed(false);
    setError(null);
  };
  const changeMode = (next: Mode) => {
    setMode(next);
    setEmail(next === 'demo' ? selected?.email ?? '' : '');
    setPassword('');
    setError(null);
  };

  const submit = async () => {
    if (!selected || busy) return;
    if (!confirmed) {
      setError('Confirme le personnage choisi pour continuer.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      if (mode !== 'demo') {
        const config = firebaseConfigFromEnvironment();
        if (!config) throw new Error('La configuration Firebase est manquante.');
        const services = createFirebaseServices(config);
        const { auth } = services;
        const user = mode === 'register'
          ? await createAccount(auth, email, password, selected.mascotId)
          : await connectAccount(auth, email, password);
        if (user.displayName !== selected.mascotId) {
          await disconnectAccount(auth);
          throw new Error('Ce compte correspond à un autre personnage. Choisis celui utilisé à la création du compte.');
        }
        await startCloudSession(services);
      } else {
        stopCloudSession();
      }
      // Le compte Firebase est vérifié, mais les données du jeu restent locales jusqu'à l'intégration Firestore.
      const result = server.signIn(mode === 'demo' ? email : selected.email, mode === 'demo' ? password : DEMO_PASSWORD);
      if (!result.ok || !result.data) throw new Error(result.error ?? 'Connexion au jeu impossible.');
      onSignedIn(result.data);
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login-shell">
      <Snowfall count={30} />
      <div className="login-card">
        <header className="login-header">
          <div className="login-topbar"><div className="snowline">❄ ❄ ❄</div></div>
          <h1>Christmas Quest <span className="year">Noël 2026</span></h1>
          <p>Quatre maisons, quatre mini-jeux et un coffre à quatre serrures — avec la liste de Noël de Trystan, gardée jusqu'au 25 décembre, 11 h.</p>
        </header>
        <section>
          <h2 className="section-title">Choisis ton personnage</h2>
          <p className="section-hint">Sélectionne le personnage que tu utiliseras pour ton compte.</p>
          <div className="profile-grid">
            {profiles.map((profile) => (
              <button key={profile.id} className={`profile-card ${selected?.id === profile.id ? 'selected' : ''}`}
                onClick={() => choose(profile)} type="button" disabled={busy}>
                <MascotAvatar mascotId={profile.mascotId} size={52} />
                <div className="profile-meta"><strong>{profile.member}</strong></div>
              </button>
            ))}
          </div>
        </section>
        {selected && (
          <section className="signin-panel">
            <div className="signin-preview">
              <MascotAvatar mascotId={selected.mascotId} size={78} direction="down" />
              <div><strong>{selected.member}</strong><p>Ton personnage</p></div>
            </div>
            <div className="signin-mode" aria-label="Choix du compte">
              <button type="button" className={mode === 'register' ? 'primary' : 'ghost'} onClick={() => changeMode('register')} disabled={busy}>Créer un compte</button>
              <button type="button" className={mode === 'login' ? 'primary' : 'ghost'} onClick={() => changeMode('login')} disabled={busy}>Se connecter</button>
              <button type="button" className={mode === 'demo' ? 'primary' : 'ghost'} onClick={() => changeMode('demo')} disabled={busy}>Mode démo</button>
            </div>
            <label>Adresse e-mail
              <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" autoComplete="email" disabled={busy} />
            </label>
            <label>Mot de passe
              <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" disabled={busy}
                autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                placeholder={mode === 'demo' ? `démo : ${DEMO_PASSWORD}` : mode === 'register' ? 'Au moins 6 caractères' : ''}
                onKeyDown={(event) => { if (event.key === 'Enter') void submit(); }} />
            </label>
            <label className="checkbox">
              <input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} disabled={busy} />
              <span>Je choisis <strong>{selected.member}</strong> comme personnage.</span>
            </label>
            {error && <p className="error" role="alert">{error}</p>}
            <button className="primary" onClick={() => void submit()} type="button" disabled={busy}>
              {busy ? 'Connexion en cours…' : mode === 'register' ? 'Créer mon compte et jouer' : 'Entrer dans le village'}
            </button>
            <p className="tiny muted">{mode === 'demo' ? `Mode démo : mot de passe ${DEMO_PASSWORD}. Les clés sont enregistrées sur cet appareil.` : 'Ton compte et les clés du coffre sont synchronisés avec Firebase. Les réservations restent sur cet appareil.'}</p>
          </section>
        )}
      </div>
      <footer className="login-footer">Décor, mascottes et mini-jeux entièrement originaux — aucune ressource des jeux cités n'est utilisée.</footer>
    </div>
  );
}
