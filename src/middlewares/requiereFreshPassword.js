import { Usuario } from '../models/index.js';

export function requireFreshPassword() {
    return async (req, res, next) => {
        try {
        if (req.user?.purpose === 'password_change') return next();

        // Si es token normal, verifica flag en BD
        const user = await Usuario.findByPk(req.user.sub);
        if (!user) return res.status(401).json({ message: 'No autenticado' });

        if (user.debe_cambiar_contrasena) {
            return res.status(428).json({
            code: 'PASSWORD_CHANGE_REQUIRED',
            message: 'Debes cambiar tu contraseña para continuar.'
            });
        }
        next();
        } catch (e) { next(e); }
    };
}