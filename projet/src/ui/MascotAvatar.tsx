import { MASCOT_SPRITE_SHEETS } from '../mascots';
import type { MascotId } from '../mascots/types';

interface Props {
  mascotId: MascotId;
  size?: number;
  direction?: 'down' | 'up' | 'side';
  className?: string;
}

/** Aperçu pixel art affiché depuis la même feuille que le personnage Phaser. */
export function MascotAvatar({ mascotId, size = 56, direction = 'down', className }: Props) {
  const row = direction === 'down' ? 0 : direction === 'up' ? 1 : 2;
  const backgroundPosition = `0% ${row === 0 ? 0 : row === 1 ? 50 : 100}%`;
  return (
    <div
      role="img"
      aria-label={`Mascotte ${mascotId}`}
      data-mascot-id={mascotId}
      className={className}
      style={{
        width: size,
        height: (size * 9) / 8,
        imageRendering: 'pixelated',
        display: 'block',
        flex: '0 0 auto',
        backgroundImage: `url("${MASCOT_SPRITE_SHEETS[mascotId]}")`,
        backgroundSize: '300% 300%',
        backgroundPosition,
        backgroundRepeat: 'no-repeat',
      }}
    />
  );
}
