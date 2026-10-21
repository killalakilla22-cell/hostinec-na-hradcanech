import { HttpError } from '../http.js';
import { listPrograms, getProgram, listExercises, expandProgram } from '../content.js';

// Content is readable without an active subscription, but needs login.
export default function register(router) {
  router.get('/api/programs', (c) => {
    c.requireUser();
    return { programs: listPrograms() };
  });

  router.get('/api/programs/:id', (c) => {
    c.requireUser();
    const p = getProgram(c.params.id);
    if (!p) throw new HttpError(404, 'program_not_found', 'Program tidak ditemukan.');
    return { program: expandProgram(p) };
  });

  router.get('/api/exercises', (c) => {
    c.requireUser();
    return { exercises: listExercises() };
  });
}
