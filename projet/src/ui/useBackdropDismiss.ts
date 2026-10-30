import { useRef } from 'react';
import type { MouseEvent, PointerEvent } from 'react';

/** Ferme seulement si le geste a commencé et fini sur le fond de la fenêtre. */
export function useBackdropDismiss(onClose: () => void) {
  const startedOnBackdrop = useRef(false);
  return {
    onPointerDown: (event: PointerEvent<HTMLDivElement>) => {
      startedOnBackdrop.current = event.target === event.currentTarget;
    },
    onPointerCancel: () => { startedOnBackdrop.current = false; },
    onClick: (event: MouseEvent<HTMLDivElement>) => {
      const shouldClose = startedOnBackdrop.current && event.target === event.currentTarget;
      startedOnBackdrop.current = false;
      if (shouldClose) onClose();
    },
  };
}
