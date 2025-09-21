import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { Usuario, Rol } from '../models/index.js';
import { isTokenRevoked } from '../utils/tokenDenylist.js'

export function authenticateJWT(req, res, next) {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;

    if (!token) return res.status(401).json({ message: 'Token requerido' });

    try {
        const payload = jwt.verify(token, env.jwt.secret, { issuer: env.jwt.issuer });
        req.token = token;
        req.user = payload;
        next();
    } catch {
        return res.status(401).json({ message: 'Token inválido o expirado' });
    }
}

export function ensureNotRevoked(req, res, next) {
    if (!req.token) return res.status(401).json({ message: 'No autenticado' });
    if (isTokenRevoked(req.token)) {
        return res.status(401).json({ message: 'Sesión cerrada. Inicia de nuevo.' });
    }
    next();
}

export function authorizeRoles(...rolesPermitidos) {
    return async (req, res, next) => {
        try {
        if (!req.user?.sub) return res.status(401).json({ message: 'No autenticado' });

        let roles = req.user.roles;
        if (!Array.isArray(roles)) {
            const usuario = await Usuario.findByPk(req.user.sub, { include: { model: Rol, through: { attributes: [] } } });
            roles = usuario?.Rols?.map(r => r.nombre) ?? [];
        }

        const permitido = roles.some(r => rolesPermitidos.includes(r));
        if (!permitido) return res.status(403).json({ message: 'No autorizado' });

        next();
        } catch (e) {
        next(e);
        }
    };
}