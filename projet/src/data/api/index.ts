/**
 * index.ts — point de bascule de la couche de données.
 * Prototype : `server` (localStorage) implémente le contrat.
 * La connexion Firebase est préparée dans `../firebase` et reste à intégrer.
 */
export { server as api, server, DEMO_PASSWORD, REVEAL_AT_ISO } from '../server';
export type { ChristmasApi, AdminRow } from './contract';
