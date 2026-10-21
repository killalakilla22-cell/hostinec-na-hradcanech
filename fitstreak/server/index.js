import { startServer } from './server.js';

const app = await startServer();

const shutdown = () => {
  app.close().then(() => process.exit(0));
  setTimeout(() => process.exit(0), 3000).unref();
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
