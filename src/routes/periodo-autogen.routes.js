// routes/periodo-autogen.routes.js
import { Router } from 'express';
import { body } from 'express-validator';
import { authenticateJWT, ensureNotRevoked } from '../middlewares/auth.js';
import { requireFreshPassword } from '../middlewares/requiereFreshPassword.js';
import { generarPeriodosCtrl } from '../controllers/periodo-autogen.controller.js';

const router = Router();

router.post('/generar',
  authenticateJWT, ensureNotRevoked, requireFreshPassword(),
  [
    body('id_ejercicio').isInt({ min: 1 }),
    body('frecuencia').isIn(['SEMANAL','QUINCENAL','MENSUAL','ANUAL']),
    body('skipSolapados').optional().isBoolean().toBoolean(),
    body('esta_abierto_por_defecto').optional().isBoolean().toBoolean(),
  ],
  generarPeriodosCtrl
);

export default router;
