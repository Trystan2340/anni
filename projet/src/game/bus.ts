/**
 * bus.ts — pont événementiel entre Phaser et l'interface React.
 * Aucune règle métier ici : seulement des notifications d'intention.
 */
export type BusEvents = {
  'village:ready': void;
  'minigame:open': { gameId: string; houseId: string };
  'minigame:result': { gameId: string; won: boolean; detail?: string };
  'minigame:quit': { gameId: string };
  'chalet:enter': void;
  'chalet:exit': void;
  'chalet:list': void;
  'mobile:move': { direction: 'up' | 'down' | 'left' | 'right'; pressed: boolean };
  'mobile:interact': void;
  'chest:interact': void;
  'presenter:talk': void;
  'lists:open': void;
  'pause:open': void;
  'toast': { message: string; tone?: 'info' | 'success' | 'error' };
};

type Handler<T> = (payload: T) => void;

class Bus {
  private handlers = new Map<keyof BusEvents, Set<Handler<unknown>>>();

  on<K extends keyof BusEvents>(event: K, handler: Handler<BusEvents[K]>): () => void {
    if (!this.handlers.has(event)) this.handlers.set(event, new Set());
    this.handlers.get(event)!.add(handler as Handler<unknown>);
    return () => this.handlers.get(event)?.delete(handler as Handler<unknown>);
  }

  emit<K extends keyof BusEvents>(event: K, payload: BusEvents[K]): void {
    this.handlers.get(event)?.forEach((handler) => handler(payload));
  }

  listenerCount(event: keyof BusEvents): number {
    return this.handlers.get(event)?.size ?? 0;
  }
}

export const bus = new Bus();
