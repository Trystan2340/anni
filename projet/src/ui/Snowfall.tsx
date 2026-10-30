import { useMemo } from 'react';

/** Neige décorative en CSS pur (aucune image, aucun canvas, coût quasi nul). */
export function Snowfall({ count = 22, className = '' }: { count?: number; className?: string }) {
  const flakes = useMemo(
    () =>
      Array.from({ length: count }, (_, index) => ({
        left: (index * 137) % 100,
        delay: -(index * 0.73) % 12,
        duration: 7 + ((index * 3) % 9),
        size: 3 + ((index * 5) % 6),
        opacity: 0.25 + ((index % 5) * 0.14),
      })),
    [count],
  );

  return (
    <div className={`snowfall ${className}`} aria-hidden="true">
      {flakes.map((flake, index) => (
        <span
          key={index}
          style={{
            left: `${flake.left}%`,
            animationDelay: `${flake.delay}s`,
            animationDuration: `${flake.duration}s`,
            width: flake.size,
            height: flake.size,
            opacity: flake.opacity,
          }}
        />
      ))}
    </div>
  );
}
