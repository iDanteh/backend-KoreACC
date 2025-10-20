import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { authenticateJWT, authorizeRoles, ensureNotRevoked } from '../middlewares/auth.js';
import { createPeriodoCtrl, listPeriodosCtrl, getPeriodoCtrl, updatePeriodoCtrl, cierrePeriodoCtrl, destroyPeriodoCtrl } from '../controllers/periodo.controller.js';
import { requireFreshPassword } from '../middlewares/requiereFreshPassword.js';
import { generarPeriodosCtrl } from '../controllers/periodo-autogen.controller.js';

const router = Router();

router.get('/', authenticateJWT,ensureNotRevoked, requireFreshPassword(),
    [
        query('id_empresa').optional().isInt({ min: 1 }),
        query('tipo_periodo').optional().isIn(['SEMANAL','MENSUAL','ANUAL','PERSONALIZADO']),
        query('esta_abierto').optional().isBoolean().toBoolean(),
        query('desde').optional().isISO8601(),
        query('hasta').optional().isISO8601(),
    ],
    listPeriodosCtrl
);

router.get('/:id', authenticateJWT,ensureNotRevoked, requireFreshPassword(),
    [param('id').isInt({ min: 1 })],
    getPeriodoCtrl
);

router.post('/', authenticateJWT,ensureNotRevoked, requireFreshPassword(),
    [
        body('id_empresa').isInt({ min: 1 }),
        body('tipo_periodo').isIn(['SEMANAL','MENSUAL','ANUAL','PERSONALIZADO']),
        body('fecha_inicio').isISO8601(),
        body('fecha_fin').isISO8601(),
        body('esta_abierto').optional().isBoolean().toBoolean(),
    ],
    createPeriodoCtrl
);

router.post('/generar', authenticateJWT, ensureNotRevoked, requireFreshPassword(),
    [
        body('id_ejercicio').isInt({ min: 1 }),
        body('frecuencia').isIn(['SEMANAL', 'QUINCENAL', 'MENSUAL', 'ANUAL']),
    ],
    generarPeriodosCtrl
);

router.put('/:id',authenticateJWT,ensureNotRevoked, requireFreshPassword(),
    [
        param('id').isInt({ min: 1 }),
        body('tipo_periodo').optional().isIn(['SEMANAL','MENSUAL','ANUAL','PERSONALIZADO']),
        body('fecha_inicio').optional().isISO8601(),
        body('fecha_fin').optional().isISO8601(),
        body('esta_abierto').optional().isBoolean().toBoolean(),
    ],
    updatePeriodoCtrl
);

router.patch('/:id',authenticateJWT,ensureNotRevoked, requireFreshPassword(),
    [param('id').isInt({ min: 1 })],
    cierrePeriodoCtrl
);

router.delete('/destroy/:id',authenticateJWT,ensureNotRevoked, requireFreshPassword(),
    [param('id').isInt({ min: 1 })],
    destroyPeriodoCtrl
);

export default router;