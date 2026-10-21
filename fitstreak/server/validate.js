// Input validation helpers. All throw HttpError 400 with an Indonesian message.
import { bad } from './http.js';
import { isValidDate, addDays } from './rules.js';
import { today } from './time.js';

export function str(v, field, { min = 0, max = 1000, optional = false } = {}) {
  if (v === undefined || v === null) {
    if (optional) return '';
    throw bad('invalid_input', `${field} wajib diisi.`);
  }
  if (typeof v !== 'string') throw bad('invalid_input', `${field} harus berupa teks.`);
  const s = v.trim();
  if (s.length < min) throw bad('invalid_input', min <= 1 ? `${field} wajib diisi.` : `${field} minimal ${min} karakter.`);
  if (s.length > max) throw bad('invalid_input', `${field} maksimal ${max} karakter.`);
  return s;
}

export function num(v, field, { min = -Infinity, max = Infinity, optional = false, integer = false } = {}) {
  if (v === undefined || v === null || v === '') {
    if (optional) return null;
    throw bad('invalid_input', `${field} wajib diisi.`);
  }
  if (typeof v !== 'number' || !Number.isFinite(v)) throw bad('invalid_input', `${field} harus berupa angka.`);
  if (integer && !Number.isInteger(v)) throw bad('invalid_input', `${field} harus bilangan bulat.`);
  if (v < min || v > max) throw bad('invalid_input', `${field} di luar batas yang diizinkan.`);
  return v;
}

/** Client-provided local date: valid YYYY-MM-DD, not more than 1 day in the future. */
export function clientDate(v, field = 'Tanggal') {
  if (!isValidDate(v)) throw bad('invalid_date', `${field} harus berformat YYYY-MM-DD.`);
  if (v > addDays(today(), 1)) throw bad('invalid_date', `${field} tidak boleh di masa depan.`);
  return v;
}

export function positiveId(v) {
  const n = Number(v);
  if (!Number.isSafeInteger(n) || n <= 0 || String(n) !== String(v)) return null;
  return n;
}

export function limitParam(v, def, max) {
  if (v === null || v === undefined || v === '') return def;
  const n = Number(v);
  if (!Number.isInteger(n) || n < 1) return def;
  return Math.min(n, max);
}
