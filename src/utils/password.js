import bcrypt from 'bcryptjs';
import crypto from 'crypto';

// Hash/compare ya existentes si los usas en otros módulos
export const hash = (plain) => bcrypt.hash(plain, 10);
export const compare = (plain, hashed) => bcrypt.compare(plain, hashed);

// Genera contraseña segura cumpliendo:
// - >= 8 chars
// - 1 mayúscula, 1 minúscula, 1 número, 1 especial
export function generateSecurePassword(length = 16) {
    const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lower = 'abcdefghijklmnopqrstuvwxyz';
    const digits = '0123456789';
    const specials = '!@#$%^&*()-_=+[]{};:,.?';
    const all = upper + lower + digits + specials;

    // Garantiza al menos 1 de cada
    const req = [
        upper[crypto.randomInt(0, upper.length)],
        lower[crypto.randomInt(0, lower.length)],
        digits[crypto.randomInt(0, digits.length)],
        specials[crypto.randomInt(0, specials.length)],
    ];

    // Completa hasta length
    for (let i = req.length; i < Math.max(8, length); i++) {
        req.push(all[crypto.randomInt(0, all.length)]);
    }

    // Mezcla (Fisher–Yates)
    for (let i = req.length - 1; i > 0; i--) {
        const j = crypto.randomInt(0, i + 1);
        [req[i], req[j]] = [req[j], req[i]];
    }
    return req.join('');
}