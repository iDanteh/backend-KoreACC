import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';

import { env } from './config/env.js';
import { sequelize } from './config/db.js';
import './models/index.js'; // registra asociaciones

import apiV1 from './routes/index.js';

const app = express();

// Seguridad y middlewares
app.use(helmet());
app.use(cors({ origin: env.security.corsOrigin }));
app.use(express.json({ limit: '1mb' }));
app.use(morgan(env.nodeEnv === 'development' ? 'dev' : 'combined'));

app.use(rateLimit({
  windowMs: env.security.rateLimitWindowMs,
  max: env.security.rateLimitMax,
  standardHeaders: true,
  legacyHeaders: false,
}));

// Prefijo rutas API v1
app.use('/api/v1', apiV1);

// Healthcheck
app.get('/health', (_req, res) => res.json({ status: 'ok' }));

// Manejo de errores
// (Express 5 ya propaga errores async)
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ message: 'Error interno' });
});

// Start + sync DB (crea/actualiza tablas al correr el proyecto)
async function start() {
  try {
    await sequelize.authenticate();
    await sequelize.sync({ alter: true }); // crea/actualiza las tablas
    app.listen(env.port, () => {
      console.log(`API corriendo en http://localhost:${env.port}/api/v1`);
    });
  } catch (e) {
    console.error('Error al iniciar:', e);
    process.exit(1);
  }
}

start();