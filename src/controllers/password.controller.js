import { validationResult } from 'express-validator';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { Usuario, Rol } from '../models/index.js';
import { generateSecurePassword, validatePasswordPolicy, sanitizePasswordInput } from '../utils/password.js';
import { sendMail } from '../config/mailer.js';

export async function sendResetByEmail(req, res, next) {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

        const { email } = req.body;
        const user = await Usuario.findOne({ where: { correo: email } });

        // Respuesta genérica para no revelar existencia
        if (!user || !user.estatus) {
        return res.json({ message: 'Si el correo existe, se enviaron instrucciones.' });
        }

        // Genera nueva contraseña definitiva
        const newPassword = generateSecurePassword(12);

        await user.update({ contrasena: newPassword });

        // Envía correo
        await sendMail({
        to: user.correo,
        subject: 'Tu contraseña fue restablecida',
        text: `Hola ${user.nombre},

        Tu nueva contraseña de acceso es: ${newPassword}

        Te recomendamos cambiarla después de iniciar sesión.`,
        html: `
            <p>Hola <strong>${user.nombre}</strong>,</p>
            <p>Tu nueva contraseña de acceso es:</p>
            <p style="font-size:16px"><b>${newPassword}</b></p>
            <p>Te recomendamos cambiarla después de iniciar sesión.</p>
        `,
        });

        return res.json({ message: 'Si el correo existe, se enviaron instrucciones.' });
    } catch (e) { next(e); }
}

export async function changePassword(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const userId = req.user?.sub;
    const rawOld = req.body.oldPassword;
    const rawNew = req.body.newPassword;

    const oldPassword = sanitizePasswordInput(rawOld);
    const newPassword = sanitizePasswordInput(rawNew);

    // Valida política
    const policy = validatePasswordPolicy(newPassword, { minLength: 8 });
    if (!policy.valid) {
      return res.status(400).json({ message: 'La nueva contraseña no cumple política', reasons: policy.reasons });
    }

    const user = await Usuario.findByPk(userId, { include: { model: Rol, through: { attributes: [] } } });
    if (!user || !user.estatus) return res.status(401).json({ message: 'No autenticado' });

    const isPwdChangeToken = req.user?.purpose === 'password_change';

    if (!isPwdChangeToken) {
      const okOld = await user.validarContrasena(oldPassword);
      if (!okOld) return res.status(400).json({ message: 'Contraseña actual incorrecta' });
    } else {
      const okOld = await user.validarContrasena(oldPassword);
      if (!okOld) return res.status(400).json({ message: 'Contraseña actual incorrecta' });
    }

    await user.update({
      contrasena: newPassword, // hook hashea
      debe_cambiar_contrasena: false,
      ultimo_cambio_contrasena: new Date(),
    });

    const roles = user.Rols?.map(r => r.nombre) ?? [];
    const token = jwt.sign(
      { sub: user.id_usuario, usuario: user.usuario, roles },
      env.jwt.secret,
      { expiresIn: env.jwt.expiresIn, issuer: env.jwt.issuer }
    );

    res.json({ message: 'Contraseña actualizada', token });
  } catch (e) { next(e); }
}