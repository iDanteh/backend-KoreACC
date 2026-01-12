import 'dotenv/config';

export const env = {
    port: process.env.PORT ?? 3000,
    nodeEnv: process.env.NODE_ENV ?? 'development',
    db: {
        host: process.env.DB_HOST,
        port: Number(process.env.DB_PORT ?? 5432),
        name: process.env.DB_NAME,
        user: process.env.DB_USER,
        pass: process.env.DB_PASS,
    },
    jwt: {
        secret: process.env.JWT_SECRET,
        expiresIn: process.env.JWT_EXPIRES_IN ?? '8h',
        issuer: process.env.JWT_ISS ?? 'backend-koreacc',
    },
    security: {
        corsOrigin: process.env.CORS_ORIGIN ?? '*',
        rateLimitWindowMs: Number(process.env.RATE_LIMIT_WINDOW_MS ?? 60000),
        rateLimitMax: Number(process.env.RATE_LIMIT_MAX ?? 100),
    },
    seedAdmin: {
        nombre: process.env.ADMIN_NOMBRE,
        apellidoP: process.env.ADMIN_APELLIDO_P,
        apellidoM: process.env.ADMIN_APELLIDO_M ?? null,
        correo: process.env.ADMIN_CORREO,
        telefono: process.env.ADMIN_TELEFONO ?? null,
        usuario: process.env.ADMIN_USUARIO,
        contrasena: process.env.ADMIN_CONTRASENA,
    },
    smtp: {
        host: process.env.SMTP_HOST ?? 'smtp.gmail.com',
        port: Number(process.env.SMTP_PORT ?? 587),
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
        from: process.env.SMTP_FROM ?? 'Koreacc <no-reply@koreacc.local>',
    },
};
console.log(env)