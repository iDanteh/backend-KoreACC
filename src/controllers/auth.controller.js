import jwt from 'jsonwebtoken';
import { validationResult } from 'express-validator';
import { env } from '../config/env.js';
import { findUserForLogin } from '../services/auth.service.js';
import { revokeToken } from '../utils/tokenDenylist.js'

export async function login(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { identifier, password } = req.body;

    const user = await findUserForLogin(identifier);
    if (!user || !(await user.validarContrasena(password)) || !user.estatus) {
        return res.status(401).json({ message: 'Credenciales inválidas' });
    }

    const roles = user.Rols?.map(r => r.nombre) ?? [];
    const payload = {
        sub: user.id_usuario,
        usuario: user.usuario,
        roles,
    };

    const token = jwt.sign(payload, env.jwt.secret, {
        expiresIn: env.jwt.expiresIn,
        issuer: env.jwt.issuer,
    });

    return res.json({
        token,
        user: {
        id_usuario: user.id_usuario,
        nombre: user.nombre,
        apellido_p: user.apellido_p,
        apellido_m: user.apellido_m,
        correo: user.correo,
        usuario: user.usuario,
        roles,
        },
    });
}

export async function logout(req, res) {
    try {
        const decoded = jwt.verify(req.token, env.jwt.secret, { issuer: env.jwt.issuer });
        if (!decoded?.exp) {
        return res.status(400).json({ message: 'Token sin expiración' });
        }
        // Revoca el token actual hasta su exp
        revokeToken(req.token, decoded.exp);
        return res.json({ message: 'Sesión cerrada' });
    } catch {
        return res.status(401).json({ message: 'Token inválido o expirado' });
    }
}