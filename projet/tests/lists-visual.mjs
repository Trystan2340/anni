import { chromium } from 'playwright';
const b = await chromium.launch();
const errors = [];
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
p.on('pageerror', e => errors.push(e.message));
await p.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await p.evaluate(() => {
  const s = window.__cq.server;
  s.resetDemo(); s.setDemoClock(0); s.setSimulatedReveal(false);
  s.signIn('trystan@famille-noel.fr', 'noel2026');
  ['rose','bleue','doree','violette'].forEach(k => s.adminSetKey('u-trystan', k, true, true));
  ['rose','bleue','doree','violette'].forEach(k => s.adminSetKey('u-maman', k, true, true));
});
await p.reload({ waitUntil: 'networkidle' });
await p.getByRole('button', { name: /Trystan/ }).first().click();
await p.locator('input[type=password]').fill('noel2026');
await p.locator('input[type=checkbox]').check();
await p.getByRole('button', { name: /Entrer dans le village/ }).click();
await p.waitForTimeout(2200);
await p.getByRole('button', { name: /Mes listes/ }).click();
await p.waitForTimeout(1200);
await p.screenshot({ path: 'shots/80-listes-design.png' });
// administration ouverte
await p.getByRole('button', { name: /Administration/ }).click();
await p.waitForTimeout(700);
await p.screenshot({ path: 'shots/81-admin-design.png', fullPage: false });
// mode révélé
await p.locator('.demo-switch input').check();
await p.waitForTimeout(900);
await p.screenshot({ path: 'shots/82-listes-revelees.png' });
// mobile
const m = await b.newPage({ viewport: { width: 390, height: 844 } });
await m.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await m.getByRole('button', { name: /Trystan/ }).first().click();
await m.locator('input[type=password]').fill('noel2026');
await m.locator('input[type=checkbox]').check();
await m.getByRole('button', { name: /Entrer dans le village/ }).click();
await m.waitForTimeout(1800);
await m.getByRole('button', { name: /Mes listes/ }).click();
await m.waitForTimeout(1000);
await m.screenshot({ path: 'shots/83-mobile-listes.png' });
console.log('Erreurs JS :', errors.length ? errors : 'aucune');
await b.close();
