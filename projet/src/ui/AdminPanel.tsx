import { useState } from 'react';
import { server } from '../data/api';
import type { KeyId } from '../data/types';
import { KEY_META } from './VillageUI';
import { MascotAvatar } from './MascotAvatar';

const KEY_ORDER: KeyId[] = ['rose', 'bleue', 'doree', 'violette'];

/**
 * Panneau d'administration : progression, clés, coffre.
 * Il ne donne AUCUN accès aux réservations de la liste de l'administrateur avant la révélation :
 * aucune fonction de ce panneau ne lit le statut de réservation.
 */
export function AdminPanel({ onChanged }: { onChanged: () => void }) {
  const [tick, setTick] = useState(0);
  const rows = server.adminOverview();
  const events = server.reservationEvents();

  const toggle = (userId: string, keyId: KeyId, field: 'acquired' | 'deposited') => {
    const progress = server.progress(userId);
    const key = progress.keys[keyId];
    const acquired = field === 'acquired' ? !key.acquired : key.acquired;
    const deposited = field === 'deposited' ? !key.deposited : key.deposited && acquired;
    server.adminSetKey(userId, keyId, acquired, deposited);
    setTick(tick + 1);
    onChanged();
  };

  return (
    <section className="admin-panel">
      <header>
        <h2>🛠 Administration de la progression</h2>
        <p className="muted small">
          Accès réservé au rôle administrateur. Corriger une progression ne valide aucune victoire
          fictive : seul l'état des clés et du coffre est modifié.
        </p>
      </header>

      <table className="admin-table">
        <thead>
          <tr>
            <th>Membre</th>
            <th>Clés gagnées</th>
            <th>Clés déposées</th>
            <th>Coffre</th>
            <th>Correction</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.profile.id}>
              <td>
                <div className="admin-member">
                  <MascotAvatar mascotId={row.profile.mascotId} size={28} />
                  <div>
                    <strong>Progression familiale</strong>
                    <span className="tiny muted">
                      Partagée entre les quatre joueurs
                    </span>
                  </div>
                </div>
              </td>
              <td>{row.acquired} / 4</td>
              <td>{row.deposited} / 4</td>
              <td>{row.chestOpened ? 'ouvert' : 'fermé'}</td>
              <td>
                <div className="admin-keys">
                  {KEY_ORDER.map((keyId) => {
                    const key = server.progress(row.profile.id).keys[keyId];
                    return (
                      <button
                        key={keyId}
                        className={`mini-key ${key.deposited ? 'deposited' : key.acquired ? 'acquired' : ''}`}
                        style={{ ['--key-color' as string]: KEY_META[keyId].color }}
                        title={`${KEY_META[keyId].label} — cliquer attribue la clé, cliquer à nouveau la dépose`}
                        onClick={() =>
                          toggle(
                            row.profile.id,
                            keyId,
                            key.acquired && !key.deposited ? 'deposited' : 'acquired',
                          )
                        }
                        type="button"
                      >
                        {KEY_META[keyId].house.slice(0, 1)}
                      </button>
                    );
                  })}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <footer className="admin-footer">
        <p className="tiny muted">
          Journal d'incidents : {events.length} événement(s) enregistré(s). Le détail des réservations
          reste protégé par les politiques serveur — y compris pour l'administrateur sur sa propre
          liste avant le 25/12 à 11 h.
        </p>
      </footer>
    </section>
  );
}
