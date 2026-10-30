import { useMemo } from 'react';

const COLORS = ['#ff5d73', '#ffd166', '#7ae582', '#6cc6ff', '#c99bff', '#ffffff'];

/** Confettis de victoire, en CSS (cinématique « MISSION ACCOMPLIE »). */
export function Confetti({ count = 48 }: { count?: number }) {
  const pieces = useMemo(
    () =>
      Array.from({ length: count }, (_, index) => ({
        left: (index * 61) % 100,
        delay: (index % 12) * 0.14,
        duration: 2.4 + ((index * 7) % 20) / 10,
        color: COLORS[index % COLORS.length],
        rotate: (index * 47) % 360,
        width: 5 + ((index * 3) % 6),
      })),
    [count],
  );

  return (
    <div className="confetti" aria-hidden="true">
      {pieces.map((piece, index) => (
        <span
          key={index}
          style={{
            left: `${piece.left}%`,
            animationDelay: `${piece.delay}s`,
            animationDuration: `${piece.duration}s`,
            background: piece.color,
            width: piece.width,
            rotate: `${piece.rotate}deg`,
          }}
        />
      ))}
    </div>
  );
}
