import fetch from 'node-fetch';

export async function verifyRecaptcha(req, res, next) {
    try {
        const { recaptchaToken } = req.body;
        if (!recaptchaToken) {
        return res.status(400).json({ message: 'Falta recaptchaToken.' });
        }

        const params = new URLSearchParams();
        const secret = process.env.RECAPTCHA_SECRET;
        if (!secret) {
        // Falla fuerte si no está configurado
        return res.status(500).json({ message: 'RECAPTCHA_SECRET no configurado en el servidor.' });
        }

        params.append('secret', secret);
        params.append('response', recaptchaToken);

        const remoteIp = (req.headers['x-forwarded-for']?.toString().split(',')[0]) || req.ip;
        if (remoteIp) params.append('remoteip', remoteIp);

        const resp = await fetch('https://www.google.com/recaptcha/api/siteverify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params
        });
        const data = await resp.json();

        // Para v2 checkbox esperamos success = true
        if (!data.success) {
        return res.status(400).json({
            message: 'Validación reCAPTCHA fallida.',
            errorCodes: data['error-codes'] // útil en dev
        });
        }

        next();
    } catch (err) {
        console.error('verifyRecaptcha error:', err);
        return res.status(500).json({ message: 'Error validando reCAPTCHA.' });
    }
}