// Read-only access to the static content (exercises & programs) from seed-data.js,
// with lookup maps built once at startup.
import { EXERCISES, PROGRAMS } from './seed-data.js';

const exerciseById = new Map(EXERCISES.map((e) => [e.id, e]));
const programById = new Map(PROGRAMS.map((p) => [p.id, p]));
const dayById = new Map(); // dayId -> {day, program}
for (const p of PROGRAMS) for (const d of p.days) dayById.set(d.id, { day: d, program: p });

export function listExercises() {
  return EXERCISES;
}

export function getExercise(id) {
  return exerciseById.get(id) || null;
}

export function listPrograms() {
  return PROGRAMS;
}

export function getProgram(id) {
  return programById.get(id) || null;
}

/** {day, program} or null */
export function getDay(dayId) {
  return dayById.get(dayId) || null;
}

/** Day with each exercise entry joined to the full exercise object. */
export function expandDay(day) {
  if (!day) return null;
  return {
    id: day.id,
    name: day.name,
    focus: day.focus,
    warmup: day.warmup || [],
    cooldown: day.cooldown || [],
    exercises: (day.exercises || []).map((x) => ({
      exerciseId: x.exerciseId,
      sets: x.sets,
      reps: x.reps,
      restSec: x.restSec,
      note: x.note || '',
      exercise: getExercise(x.exerciseId),
    })),
  };
}

export function expandProgram(p) {
  return { ...p, days: p.days.map(expandDay) };
}
