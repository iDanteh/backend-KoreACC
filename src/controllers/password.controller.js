import { validationResult } from 'express-validator';
import { Usuario } from '../models/index.js';
import { generateSecurePassword } from '../utils/password.js';
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