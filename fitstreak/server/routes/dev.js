import { HttpError } from '../http.js';
import { num } from '../validate.js';
import { travel, offsetDays, nowIso, today } from '../time.js';

// Only registered as a working endpoint when FITSTREAK_DEV=1; otherwise 404.
export default function register(router, { dev }) {
  router.post('/api/dev/time-travel', async (c) => {
    if (!dev) throw new HttpError(404, 'not_found', 'Endpoint tidak ditemukan.');
    const b = await c.body();
    const days = num(b.days, 'days', { min: -3650, max: 3650 });
    travel(days);
    return { ok: true, offsetDays: offsetDays(), now: nowIso(), today: today() };
  });
}
