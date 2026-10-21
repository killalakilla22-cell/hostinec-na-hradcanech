import http from 'node:http';
import { openDb } from './db.js';
import { createHandler } from './app.js';
import { seedDemo, DEMO_EMAIL, DEMO_PASSWORD } from './demo.js';

/**
 * Start FitStreak. Resolves to {server, db, port, url, close()}.
 * Options default to env: PORT, FITSTREAK_DB, FITSTREAK_DEV, FITSTREAK_DEMO.
 */
export async function startServer({
  port = Number(process.env.PORT || 3000),
  host,
  dbPath = process.env.FITSTREAK_DB || undefined,
  dev = process.env.FITSTREAK_DEV === '1',
  demo = process.env.FITSTREAK_DEMO === '1',
  uploadsDir,
  log = true,
} = {}) {
  const { db, fresh } = openDb(dbPath);
  let demoSeeded = false;
  if (demo && fresh) demoSeeded = await seedDemo(db);
  const handler = createHandler({ db, dev, ...(uploadsDir ? { uploadsDir } : {}) });
  const server = http.createServer(handler);
  server.requestTimeout = 30_000;
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, host, resolve);
  });
  const actualPort = server.address().port;
  const url = `http://localhost:${actualPort}`;
  if (log) {
    console.log(`FitStreak berjalan di ${url}`);
    if (dev) console.log('Mode dev aktif: POST /api/dev/time-travel tersedia.');
    if (demoSeeded) console.log(`Data demo dibuat. Login demo: ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
  }
  return {
    server,
    db,
    port: actualPort,
    url,
    close: () => new Promise((resolve) => {
      server.closeAllConnections?.();
      server.close(() => { db.close(); resolve(); });
    }),
  };
}
