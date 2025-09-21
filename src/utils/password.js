import bcrypt from 'bcryptjs';
import crypto from 'crypto';

// Hash/compare
export const hash = (plain) => bcrypt.hash(plain, 10);
export const compare = (plain, hashed) => bcrypt.compare(plain, hashed);

// 🔧 Sanitiza entradas de contraseña (evita espacios y chars invisibles al copiar/pegar)
export function sanitizePasswordInput(pw) {
  return String(pw ?? '')
    .normalize('NFKC')                    // normaliza unicode
    .replace(/[\u200B-\u200D\uFEFF]/g, '')// quita zero-width
    .trim();                               // quita espacios a los lados
}

// Genera contraseña segura (sin regex)
export function generateSecurePassword(length = 16) {
  const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lower = 'abcdefghijklmnopqrstuvwxyz';
  const digits = '0123456789';
  const specials = '!@#$%^&*()-_=+[]{};:,.?';
  const all = upper + lower + digits + specials;

  const req = [
    upper[crypto.randomInt(0, upper.length)],
    lower[crypto.randomInt(0, lower.length)],
    digits[crypto.randomInt(0, digits.length)],
    specials[crypto.randomInt(0, specials.length)],
  ];

  for (let i = req.length; i < Math.max(8, length); i++) {
    req.push(all[crypto.randomInt(0, all.length)]);
  }

  // Fisher–Yates
  for (let i = req.length - 1; i > 0; i--) {
    const j = crypto.randomInt(0, i + 1);
    [req[i], req[j]] = [req[j], req[i]];
  }
  return req.join('');
}

export function validatePasswordPolicy(pw, {
  minLength = 8,
  specials = '!@#$%^&*()-_=+[]{};:,.?'
} = {}) {
  if (typeof pw !== 'string') return { valid: false, reasons: ['type'] };

  let hasUpper = false, hasLower = false, hasDigit = false, hasSpecial = false;

  for (let i = 0; i < pw.length; i++) {
    const ch = pw[i];
    const code = ch.charCodeAt(0);
    if (code >= 65 && code <= 90) hasUpper = true;        // A-Z
    else if (code >= 97 && code <= 122) hasLower = true;  // a-z
    else if (code >= 48 && code <= 57) hasDigit = true;   // 0-9
    else if (specials.includes(ch)) hasSpecial = true;
  }

  const reasons = [];
  if (pw.length < minLength) reasons.push('length');
  if (!hasUpper) reasons.push('upper');
  if (!hasLower) reasons.push('lower');
  if (!hasDigit) reasons.push('digit');
  if (!hasSpecial) reasons.push('special');

  return { valid: reasons.length === 0, reasons };
}
