const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia(REDUCED_MOTION_QUERY).matches
    : false;
}

export function watchReducedMotion(callback: (reduced: boolean) => void): () => void {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return () => {};

  const query = window.matchMedia(REDUCED_MOTION_QUERY);
  let current = query.matches;
  const onChange = (event: MediaQueryListEvent) => {
    if (event.matches === current) return;
    current = event.matches;
    callback(current);
  };

  if (typeof query.addEventListener === 'function') {
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }

  query.addListener(onChange);
  return () => query.removeListener(onChange);
}
